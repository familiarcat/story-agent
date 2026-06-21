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
import { quarkSelectModel, MODEL_POOL } from '../lib/crew-team-assembly.js';
import { AGENT_TOOLS, TOOLS_BY_NAME, toOpenAITools, type AgentTool, type ToolContext } from './tools.js';
import { gateLocalOp, type WorfTier } from './worfgate-local.js';

export interface AgentEvent {
  type: 'model' | 'tool_call' | 'tool_result' | 'gate' | 'text' | 'done' | 'error' | 'escalation';
  text?: string;
  tool?: string;
  args?: unknown;
  tier?: WorfTier;
  remediations?: string[];
  model?: string;
  costUSD?: number;
}

export interface RunAgentOptions {
  workspace?: string;
  clientId?: string | null;
  /** Capability tier for Quark's per-turn model pick (default 3 = advanced, cheap multi-provider). */
  tier?: number;
  maxIterations?: number;
  /** Soft token budget; when exceeded the loop finalizes instead of continuing (Quark spend cap). */
  tokenBudget?: number;
  systemPrompt?: string;
  ragRecall?: ToolContext['ragRecall'];
  crewDeliberate?: ToolContext['crewDeliberate'];
  /** Stream events (model picks, tool calls, gate decisions, text) to the surface. */
  onEvent?: (e: AgentEvent) => void;
  tools?: AgentTool[];
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

/** Run the autonomous agent loop on a single user request. */
export async function runAgentLoop(userInput: string, opts: RunAgentOptions = {}): Promise<AgentRunResult> {
  if (!OR_KEY) throw new Error('CREW_LLM_APPROVED_KEY not set — cannot reach OpenRouter.');

  const workspace = opts.workspace || process.env.STORY_AGENT_WORKSPACE || process.cwd();
  const tools = opts.tools || AGENT_TOOLS;
  const maxIterations = opts.maxIterations ?? 25;
  const tokenBudget = opts.tokenBudget ?? 400_000;
  const emit = opts.onEvent ?? (() => {});

  const model = quarkSelectModel(opts.tier ?? 3).id;
  emit({ type: 'model', model });

  const ctx: ToolContext = {
    workspace, clientId: opts.clientId ?? null,
    ragRecall: opts.ragRecall, crewDeliberate: opts.crewDeliberate,
  };

  const client = new OpenAI({ apiKey: OR_KEY, baseURL: OR_URL });
  const openaiTools = toOpenAITools(tools);

  const messages: any[] = [
    { role: 'system', content: (opts.systemPrompt || DEFAULT_SYSTEM) + `\n\nWorkspace: ${workspace}` },
    { role: 'user', content: userInput },
  ];

  const result: AgentRunResult = {
    finalText: '', iterations: 0, toolCalls: [], model,
    totalCostUSD: 0, totalTokens: 0, escalated: false, budgetExceeded: false,
  };

  for (let i = 0; i < maxIterations; i++) {
    result.iterations = i + 1;

    // Anthropic-first provider routing only for anthropic slugs (avoids stale Bedrock).
    const body: any = { model, messages, tools: openaiTools, tool_choice: 'auto', max_tokens: 1500 };
    if (model.startsWith('anthropic/')) body.provider = { order: ['Anthropic'], allow_fallbacks: true };

    const resp: any = await client.chat.completions.create(body as any);
    const usage = resp.usage || {};
    result.totalTokens += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
    result.totalCostUSD += estCost(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);

    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) { emit({ type: 'error', text: 'no message from model' }); break; }

    messages.push(msg);

    const toolCalls = msg.tool_calls || [];
    if (!toolCalls.length) {
      result.finalText = msg.content || '';
      emit({ type: 'text', text: result.finalText });
      emit({ type: 'done', model, costUSD: result.totalCostUSD });
      return result;
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
        emit({ type: 'gate', tool: name, tier, remediations });
        if (!gate.proceed) {
          // Red + not remediable → escalate to the crew rather than silently dropping.
          output = `WorfGate RED — operation withheld pending crew review: ${gate.reasons.join('; ')}`;
          ok = false;
          result.escalated = true;
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
      const fin: any = await client.chat.completions.create({ model, messages, max_tokens: 800 });
      result.finalText = fin.choices?.[0]?.message?.content || '';
      emit({ type: 'done', model, costUSD: result.totalCostUSD });
      return result;
    }
  }

  result.finalText = result.finalText || '(reached max iterations without a final summary)';
  emit({ type: 'done', model, costUSD: result.totalCostUSD });
  return result;
}
