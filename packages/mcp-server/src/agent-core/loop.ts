/**
 * Agent-core — the unified agentic tool-calling loop.
 *
 * One loop powers every surface (CLI, API, VS Code). Per the unification ruling:
 *  - Each turn runs a SINGLE fast Quark-selected model (cheap, low-latency).
 *  - The model calls tools; we execute them through the WorfGate local governor (green/yellow/red,
 *    autonomous remediation), feed results back, and iterate until the model stops calling tools.
 *  - Hard/ambiguous tasks escalate to the full crew pipeline via the `crew_deliberate` tool.
 *  - A cost ledger tracks token spend with a soft budget (Quark's dynamic spend cap → review, not hard stop).
 *
 * LLM transport: OpenRouter chat/completions with function calling. Anthropic is a pool member.
 */
import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { quarkSelectModel, MODEL_POOL } from '../lib/crew-team-assembly.js';
import { AGENT_TOOLS, TOOLS_BY_NAME, toOpenAITools, type AgentTool, type ToolContext } from './tools.js';
import { gateLocalOp, type WorfTier } from './worfgate-local.js';
import { getSkillTheory } from '@story-agent/shared/skill-theory';
import '../lib/skill-theories.js'; // register tool theories so the lens can read them

export interface AgentEvent {
  type: 'model' | 'tool_call' | 'tool_result' | 'gate' | 'text' | 'done' | 'error' | 'escalation' | 'retry' | 'cost' | 'lens' | 'stall';
  text?: string;
  attempt?: number;
  tool?: string;
  args?: unknown;
  tier?: WorfTier;
  remediations?: string[];
  model?: string;
  costUSD?: number;
  /** Interactive approval (opt-in): set on a gate event when the loop is awaiting an operator decision. */
  needsApproval?: boolean;
  approvalId?: string;
}

export interface RunAgentOptions {
  workspace?: string;
  clientId?: string | null;
  /** Capability tier for Quark's per-turn model pick (default 3 = advanced, cheap multi-provider). */
  tier?: number;
  maxIterations?: number;
  /** Self-healing: max corrective nudges when the model stalls (text, 0 tools) on an actionable task. Default 2. */
  maxNudges?: number;
  /** Attempts per LLM call before surfacing the error (exponential backoff). Default 3. */
  maxRetries?: number;
  /** Soft token budget; when exceeded the loop finalizes instead of continuing (Quark spend cap). */
  tokenBudget?: number;
  /** PROD-15: auto-escalate architecture/security/ambiguous tasks to the crew before looping (default true). */
  autoEscalate?: boolean;
  /** PROD-13: soft USD spend threshold — emits a 'cost' WorfGate-review event when crossed (does NOT hard-stop). */
  reviewThresholdUSD?: number;
  /** Layer-3: compose a focused tool lens for the task instead of exposing all tools (default true). */
  composeLens?: boolean;
  /** Layer-4 self-learning: persist an explainable feedback card for this run (RAG). */
  recordFeedback?: (card: AgentFeedbackCard) => Promise<void> | void;
  systemPrompt?: string;
  ragRecall?: ToolContext['ragRecall'];
  crewDeliberate?: ToolContext['crewDeliberate'];
  /** Stream events (model picks, tool calls, gate decisions, text) to the surface. */
  onEvent?: (e: AgentEvent) => void;
  tools?: AgentTool[];
  /** Wave-2 interactive approvals (opt-in): pause yellow/red ops for an explicit operator decision. */
  requireApproval?: boolean;
  /** Resolver the surface wires to a back-channel; returns 'approve' | 'deny' for a pending gate. */
  requestApproval?: (info: { approvalId: string; tool: string; tier: WorfTier; remediations: string[]; args: unknown }) => Promise<'approve' | 'deny'>;
  /** Tool policy: "full" (default) or "read-only" (limits tools to read-only operations). */
  toolPolicy?: "full" | "read-only";
}

export interface AgentRunResult {
  finalText: string;
  iterations: number;
  toolCalls: Array<{ tool: string; tier: WorfTier; remediations: string[]; ok: boolean }>;
  model: string;
  totalCostUSD: number;
  totalTokens: number;
  escalated: boolean;
  budgetExceeded: boolean;
  /** Self-healing: the loop detected a finish/iterate stall (0 tool calls on an actionable task) and nudged. */
  stalled: boolean;
  /** PROD-13 cost observatory — per-provider spend, burn rate, and whether the review threshold tripped. */
  observatory: { perProvider: Record<string, number>; burnRatePerTurnUSD: number; reviewTriggered: boolean };
}

/** Layer-4 explainable feedback card — a durable, recallable record of one agent run. */
export interface AgentFeedbackCard {
  input: string;
  model: string;
  lens: string;
  toolsUsed: string[];
  posture: { green: number; yellow: number; red: number };
  costUSD: number;
  tokens: number;
  iterations: number;
  escalated: boolean;
  stalled: boolean;
  outcome: string;
  clientId: string | null;
}

const ESCALATION_SIGNALS = ['architect', 'security', 'migration', 'refactor', 'privilege', 'multi-client', 'concurrency', 'rls', 'auth', 'schema design', 'breaking change', 'rollback'];

/** PROD-15: should this request escalate to the full crew before the loop runs? */
export function shouldEscalate(input: string): boolean {
  const t = input.toLowerCase();
  return ESCALATION_SIGNALS.some(k => t.includes(k)) || input.length > 1200;
}

const ACTION_VERBS = /\b(edit|create|write|add|implement|fix|replace|update|run|build|refactor|rename|delete|remove|convert|map|reskin|apply|scaffold|generate|install|commit|patch)\b/;
/** Self-healing: does this task imply tool use? Used to detect a "described a plan but called 0 tools" stall. */
export function looksActionable(input: string): boolean {
  return ACTION_VERBS.test(input.toLowerCase());
}

function providerOf(model: string): string {
  return MODEL_POOL.find(m => m.id === model)?.provider ?? (model.split('/')[0] || 'unknown');
}

// Always-available tools: orient (read/search/list) + escalate. The lens focuses everything else.
const LENS_CORE = new Set(['read_file', 'list_dir', 'search_code', 'crew_deliberate']);
// Read-only tools for toolPolicy="read-only"
const READ_ONLY_TOOLS = new Set(['read_file','list_dir','search_code','git_status','git_diff','rag_recall','crew_deliberate']);
// Intent → tool affinities (problem topology). The lens reads the request + each tool's 5W1H theory.
const LENS_INTENTS: Array<{ re: RegExp; tools: string[] }> = [
  { re: /\b(write|create|add|implement|scaffold|generate|new file)\b/, tools: ['write_file', 'edit_file', 'apply_patch'] },
  { re: /\b(edit|change|modify|fix|refactor|update|rename|replace)\b/, tools: ['edit_file', 'apply_patch', 'read_file', 'write_file'] },
  { re: /\b(multi[- ]?file|across files|several files|whole|codebase)\b/, tools: ['apply_patch', 'search_code'] },
  { re: /\b(test|run|build|lint|install|exec|compile|npm|pnpm|python)\b/, tools: ['run_shell'] },
  { re: /\b(commit|diff|branch|staged|git|status|push)\b/, tools: ['git_status', 'git_diff', 'run_shell'] },
  { re: /\b(recall|remember|prior|previously|decided|before|history|precedent)\b/, tools: ['rag_recall'] },
];

export interface ComposedLens { lens: AgentTool[]; reason: string }

/**
 * PROD-15 / Symphonic-MCP Layer-3: compose a focused tool "lens" for the task from the 5W1H mesh,
 * instead of exposing every tool every turn. Scores each tool by (a) overlap of request terms with
 * its SkillTheory (capabilities/use-when/scope) + description, and (b) intent affinities. Core
 * orient/escalate tools are always present; if too few match, fall back to the full mesh (never
 * starve the agent). Returns the subset + a human-readable reason for the Symphony card.
 */
export function composeLens(input: string, tools: AgentTool[]): ComposedLens {
  const t = input.toLowerCase();
  const terms = Array.from(new Set(t.split(/[^a-z0-9]+/).filter(w => w.length > 3)));
  const intentTools = new Set<string>();
  for (const { re, tools: ts } of LENS_INTENTS) if (re.test(t)) ts.forEach(x => intentTools.add(x));

  const scored = tools.map(tool => {
    if (LENS_CORE.has(tool.name)) return { tool, score: 1000 };
    const theory = getSkillTheory(tool.name);
    const hay = [tool.description, theory?.what.summary, ...(theory?.what.capabilities ?? []), ...(theory?.when.useWhen ?? []), ...(theory?.where.scope ?? [])]
      .filter(Boolean).join(' ').toLowerCase();
    let score = terms.reduce((s, term) => s + (hay.includes(term) ? 1 : 0), 0);
    if (intentTools.has(tool.name)) score += 3;
    return { tool, score };
  });

  const selected = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (selected.length < 4) return { lens: tools, reason: `broad task → full tool mesh (${tools.length})` };
  const lens = selected.map(s => s.tool);
  return { lens, reason: `composed ${lens.length}/${tools.length} tools: ${lens.map(t => t.name).join(', ')}` };
}

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';

const DEFAULT_SYSTEM = [
  'You are the Story Agent — an autonomous coding assistant powered by the OpenRouter crew.',
  'You operate in the user\'s workspace with real tools: read/write/edit files, search code, run shell, git.',
  'Work in small, verifiable steps. Read before you edit. After changes, run the relevant tests/build to verify.',
  'Use rag_recall for prior crew decisions. For architecture/security/high-stakes choices, call crew_deliberate to escalate.',
  'When the task is complete, stop calling tools and give a concise summary of what you did and why.',
].join(' ');

function estCost(model: string, tin: number, tout: number): number {
  const m = MODEL_POOL.find(x => x.id === model);
  const ci = m?.costIn ?? 1.0, co = m?.costOut ?? 5.0;
  return (tin / 1e6) * ci + (tout / 1e6) * co;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Is this LLM-call error worth retrying? (rate limits, 5xx, transient network). */
export function isRetryable(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true;
  const code = err?.code || err?.cause?.code || '';
  return ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'UND_ERR_SOCKET'].includes(code);
}

/**
 * Run an OpenRouter completion with exponential backoff (PROD-11). Retries transient failures
 * (429 / 5xx / network) up to `attempts`; re-throws non-retryable or exhausted errors so the
 * loop surfaces them as an explicit error event rather than aborting silently.
 */
export async function callWithRetry<T>(fn: () => Promise<T>, attempts: number, emit: (e: AgentEvent) => void): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (attempt >= attempts || !isRetryable(err)) break;
      const backoff = Math.min(8000, 400 * 2 ** (attempt - 1));
      emit({ type: 'retry', attempt, text: `LLM call failed (${err?.status ?? err?.code ?? 'error'}); retry ${attempt}/${attempts - 1} in ${backoff}ms` });
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/** Run the autonomous agent loop on a single user request. */
export async function runAgentLoop(userInput: string, opts: RunAgentOptions = {}): Promise<AgentRunResult> {
  if (!OR_KEY) throw new Error('CREW_LLM_APPROVED_KEY not set — cannot reach OpenRouter.');

  const workspace = opts.workspace || process.env.STORY_AGENT_WORKSPACE || process.cwd();
  const tools = opts.tools || AGENT_TOOLS;
  const maxIterations = opts.maxIterations ?? 25;
  const maxRetries = opts.maxRetries ?? 3;
  const maxNudges = opts.maxNudges ?? 2;
  let nudges = 0; // self-healing: corrective nudges spent when the model stalls (text, 0 tools)
  const tokenBudget = opts.tokenBudget ?? 400_000;
  const autoEscalate = opts.autoEscalate ?? true;
  const reviewThresholdUSD = opts.reviewThresholdUSD;
  const emit = opts.onEvent ?? (() => {});

  const model = quarkSelectModel(opts.tier ?? 3).id;
  emit({ type: 'model', model });

  const ctx: ToolContext = {
    workspace, clientId: opts.clientId ?? null,
    ragRecall: opts.ragRecall, crewDeliberate: opts.crewDeliberate,
  };

  const client = new OpenAI({ apiKey: OR_KEY, baseURL: OR_URL });
  // Layer-3 dynamic lens: focus the tool set on the task (self-composed from the 5W1H mesh).
  const composed = (opts.composeLens ?? true) ? composeLens(userInput, tools) : { lens: tools, reason: `full mesh (${tools.length})` };
  emit({ type: 'lens', text: composed.reason });
  let lensTools = composed.lens;
  if (opts.toolPolicy === 'read-only') {
    lensTools = composed.lens.filter(t => READ_ONLY_TOOLS.has(t.name));
    emit({ type: 'lens', text: 'read-only (plan) mode: ' + lensTools.map(t=>t.name).join(', ') });
  }
  const openaiTools = toOpenAITools(lensTools);

  const perProvider: Record<string, number> = {};
  const accrue = (tin: number, tout: number) => {
    const c = estCost(model, tin, tout);
    result.totalCostUSD += c;
    result.totalTokens += tin + tout;
    perProvider[providerOf(model)] = Number(((perProvider[providerOf(model)] ?? 0) + c).toFixed(6));
  };

  const messages: any[] = [
    { role: 'system', content: (opts.systemPrompt || DEFAULT_SYSTEM) + `\n\nWorkspace: ${workspace}` },
    { role: 'user', content: userInput },
  ];

  const result: AgentRunResult = {
    finalText: '', iterations: 0, toolCalls: [], model,
    totalCostUSD: 0, totalTokens: 0, escalated: false, budgetExceeded: false, stalled: false,
    observatory: { perProvider, burnRatePerTurnUSD: 0, reviewTriggered: false },
  };

  // Single completion path: persist the Layer-4 explainable feedback card (best-effort), emit done.
  const finalize = async (): Promise<AgentRunResult> => {
    if (opts.recordFeedback) {
      const posture = { green: 0, yellow: 0, red: 0 };
      for (const tc of result.toolCalls) if (tc.tier in posture) posture[tc.tier as keyof typeof posture]++;
      try {
        await opts.recordFeedback({
          input: userInput.slice(0, 240), model, lens: composed.reason,
          toolsUsed: result.toolCalls.map(t => t.tool), posture,
          costUSD: result.totalCostUSD, tokens: result.totalTokens, iterations: result.iterations,
          escalated: result.escalated, stalled: result.stalled, outcome: result.finalText.slice(0, 500), clientId: opts.clientId ?? null,
        });
      } catch { /* self-learning is best-effort — never fail the run on a memory write */ }
    }
    emit({ type: 'done', model, costUSD: result.totalCostUSD });
    return result;
  };

  // PROD-15 auto-escalation: hard/ambiguous tasks consult the full crew BEFORE the loop, and the
  // synthesized mission plan is injected as context so the fast loop executes a vetted plan.
  if (autoEscalate && ctx.crewDeliberate && shouldEscalate(userInput)) {
    emit({ type: 'escalation', text: 'complex/high-stakes task — escalating to the crew before execution' });
    try {
      const plan = await ctx.crewDeliberate(userInput);
      result.escalated = true;
      messages.push({ role: 'user', content: `The crew deliberated this task. Execute against their mission plan:\n\n${plan}` });
    } catch { /* escalation is best-effort; proceed with the fast loop */ }
  }

  for (let i = 0; i < maxIterations; i++) {
    result.iterations = i + 1;

    // Anthropic-first provider routing only for anthropic slugs (avoids stale Bedrock).
    const body: any = { model, messages, tools: openaiTools, tool_choice: 'auto', max_tokens: 1500 };
    if (model.startsWith('anthropic/')) body.provider = { order: ['Anthropic'], allow_fallbacks: true };

    let resp: any;
    try {
      resp = await callWithRetry(() => client.chat.completions.create(body as any), maxRetries, emit);
    } catch (err: any) {
      // Exhausted retries / non-retryable → surface explicitly and finalize (never a silent abort).
      result.finalText = `⚠️ Model call failed after ${maxRetries} attempt(s): ${err?.message || err}`;
      emit({ type: 'error', text: result.finalText });
      return await finalize();
    }
    const usage = resp.usage || {};
    accrue(usage.prompt_tokens || 0, usage.completion_tokens || 0);
    result.observatory.burnRatePerTurnUSD = Number((result.totalCostUSD / result.iterations).toFixed(6));

    // PROD-13 cost observatory: soft spend cap → emit a WorfGate-review signal (does NOT hard-stop).
    if (reviewThresholdUSD && result.totalCostUSD >= reviewThresholdUSD && !result.observatory.reviewTriggered) {
      result.observatory.reviewTriggered = true;
      emit({ type: 'cost', costUSD: result.totalCostUSD, text: `⚠️ spend $${result.totalCostUSD.toFixed(4)} crossed review threshold $${reviewThresholdUSD} — WorfGate review (continuing)` });
    }

    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) {
      // Empty completion — treat as a transient hiccup and retry the turn rather than aborting.
      emit({ type: 'retry', text: 'empty completion; retrying turn' });
      messages.push({ role: 'user', content: 'Your last response was empty. Continue the task or summarize if complete.' });
      continue;
    }

    messages.push(msg);

    const toolCalls = msg.tool_calls || [];
    if (!toolCalls.length) {
      // Self-healing stall detection: the observed failure is the model replying with TEXT and calling
      // 0 tools on an ACTIONABLE task (often right after auto-escalation injected a plan) — so the loop
      // would finalize having done nothing. Detect that, record it, and nudge it to actually execute,
      // bounded by maxNudges. A genuine answer/complete task (not actionable, or "DONE") still finalizes.
      const saidDone = /\bDONE\b/.test(msg.content || '');
      const stalling = looksActionable(userInput) && result.toolCalls.length === 0 && !saidDone && nudges < maxNudges;
      if (stalling) {
        nudges++;
        result.stalled = true;
        emit({ type: 'stall', attempt: nudges, text: `stall: described a plan but called 0 tools (nudge ${nudges}/${maxNudges}) — directing execution` });
        messages.push({ role: 'user', content: 'You replied with text but called NO tools. Do not just describe the plan — perform it NOW by calling the appropriate tools (read_file/edit_file/write_file/apply_patch/run_shell/etc.). If the task is genuinely already complete, reply with the single word DONE.' });
        continue;
      }
      result.finalText = msg.content || '';
      emit({ type: 'text', text: result.finalText });
      return await finalize();
    }

    if (msg.content) emit({ type: 'text', text: msg.content });

    // Execute each requested tool through the WorfGate governor.
    for (const tc of toolCalls) {
      const name = tc.function?.name;
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(tc.function?.arguments || '{}'); } catch { /* leave empty */ }
      emit({ type: 'tool_call', tool: name, args: parsed });

      const tool = TOOLS_BY_NAME[name] || tools.find(t => t.name === name);
      let output: string;
      let ok = true;
      let tier: WorfTier = 'yellow';
      let remediations: string[] = [];

      if (!tool) {
        output = `error: unknown tool ${name}`;
        ok = false;
      } else {
        const gate = gateLocalOp(name, parsed, workspace);
        tier = gate.tier;
        remediations = gate.remediations;

        // Wave-2 interactive approval (opt-in): pause a proceed-able yellow/red op for an explicit
        // operator decision via the surface's back-channel. Default-off ⇒ existing behavior unchanged.
        const needsApproval = !!(opts.requireApproval && opts.requestApproval && gate.proceed && (tier === 'yellow' || tier === 'red'));
        const approvalId = needsApproval ? randomUUID() : undefined;
        emit({ type: 'gate', tool: name, tier, remediations, needsApproval, approvalId });

        let denied = false;
        if (needsApproval && approvalId) {
          const decision = await opts.requestApproval!({ approvalId, tool: name, tier, remediations, args: gate.args });
          denied = decision === 'deny';
        }

        if (!gate.proceed) {
          // Red + not remediable → escalate to the crew rather than silently dropping.
          output = `WorfGate RED — operation withheld pending crew review: ${gate.reasons.join('; ')}`;
          ok = false;
          result.escalated = true;
          emit({ type: 'escalation', tool: name, text: output });
        } else if (denied) {
          output = `WorfGate — operation denied by operator: ${name}`;
          ok = false;
          emit({ type: 'escalation', tool: name, text: output });
        } else {
          if (name === 'crew_deliberate') result.escalated = true;
          try {
            output = await tool.handler(gate.args, ctx);
          } catch (e: any) {
            output = `error: ${e?.message || String(e)}`;
            ok = false;
          }
        }
      }

      result.toolCalls.push({ tool: name, tier, remediations, ok });
      emit({ type: 'tool_result', tool: name, text: output, tier });
      messages.push({ role: 'tool', tool_call_id: tc.id, content: output });
    }

    if (result.totalTokens >= tokenBudget) {
      result.budgetExceeded = true;
      emit({ type: 'text', text: `⚠️ Quark spend cap reached (${result.totalTokens} tokens) — finalizing.` });
      messages.push({ role: 'user', content: 'Token budget reached. Summarize what you have done and any remaining steps. Do not call more tools.' });
      try {
        const fin: any = await callWithRetry(() => client.chat.completions.create({ model, messages, max_tokens: 800 }), maxRetries, emit);
        result.finalText = fin.choices?.[0]?.message?.content || '';
      } catch (err: any) {
        result.finalText = `⚠️ Budget-cap summary failed: ${err?.message || err}`;
        emit({ type: 'error', text: result.finalText });
      }
      return await finalize();
    }
  }

  result.finalText = result.finalText || '(reached max iterations without a final summary)';
  return await finalize();
}
