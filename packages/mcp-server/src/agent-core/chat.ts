/**
 * Canonical crew CHAT brain — a single-shot, RAG-grounded NL assistant turn whose model is chosen by
 * QUARK (quarkSelectModel) over the cost-ranked multi-provider pool. This is THE optimized selection
 * path; both the web UI (/api/chat) and the VS Code assistant route here so every natural-language
 * request defaults to the crew's cost/efficiency optimization — never a hardcoded model.
 *
 * Mounted at POST /chat on the agent HTTP server (alongside /agent, /symphony).
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { searchCrewPersonalMemories } from '@story-agent/shared/db';
import { quarkSelectModel } from '../lib/crew-team-assembly.js';
import type { TeamMember } from '../lib/crew-team-assembly.js';
import { buildBridges } from './bridges.js';
import { recordCost } from './cost-ledger.js';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import { planThenExecute } from './plan-then-execute.js';

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const AUTO_CREW_PREFLIGHT = process.env.STORY_AGENT_CHAT_CREW_PREFLIGHT !== 'false';
const ACTIVATION_CLIENT_ALLOWLIST = (process.env.STORY_AGENT_CHAT_ACTIVATION_CLIENT_ALLOWLIST || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export interface CanonicalChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface CanonicalChatRequest {
  message: string;
  history?: CanonicalChatHistoryTurn[];
  clientId?: string | null;
  crewSelfOrganize?: boolean;
  promptOptimizationMode?: 'safe' | 'off';
}

export interface CanonicalChatResponse {
  answer: string;
  model: string;
  provider: string;
  tier: 3 | 4;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  sources: string[];
  promptOptimization: PromptOptimizationMeta;
  crewSelfOrganization?: CrewSelfOrganizationMeta;
  costAnalysis: PromptCostAnalysis;
  executionActivation?: ExecutionActivationMeta;
}

export interface PromptOptimizationMeta {
  applied: boolean;
  originalChars: number;
  optimizedChars: number;
  netCharDelta: number;
  rules: string[];
}

export interface CrewTeamSnapshot {
  teamId: string;
  label: string;
  members: string[];
  domains: string[];
  memoryHits: number;
}

export interface CrewMemberMemorySnapshot {
  crewId: string;
  domain: string;
  teamIds: string[];
  memoryHits: number;
  memoryTitles: string[];
}

export interface CrewSelfOrganizationMeta {
  enabled: boolean;
  goals: string;
  missionPlan: string;
  topModel: string;
  totalCostUSD: number;
  totalTokens: number;
  providerCosts: Record<string, number>;
  teams: CrewTeamSnapshot[];
  members: CrewMemberMemorySnapshot[];
}

export interface PromptCostAnalysis {
  mode?: 'chat' | 'plan-then-execute';
  chatCostUSD: number;
  chatTokensIn: number;
  chatTokensOut: number;
  chatTotalTokens: number;
  crewPreparationCostUSD: number;
  crewPreparationTokens: number;
  executionRunCostUSD?: number;
  executionRunTokens?: number;
  totalCostUSD: number;
  totalTokens: number;
  provider: string;
  optimizationRules: string[];
}

export interface ExecutionActivationMeta {
  activated: boolean;
  phrase: 'make-it-so' | 'next-steps';
  task: string;
  priorRuns: string[];
  missionId: string;
  iterations: number;
  toolCalls: number;
  escalated: boolean;
  stalled: boolean;
}

const TEAM_DEFS: Array<{ teamId: string; label: string; domains: string[] }> = [
  { teamId: 'strategy', label: 'Strategy', domains: ['command', 'architecture', 'stakeholder', 'finance'] },
  { teamId: 'execution', label: 'Execution', domains: ['implementation', 'infrastructure', 'devops', 'communications'] },
  { teamId: 'assurance', label: 'Assurance', domains: ['quality', 'security', 'health', 'architecture'] },
];

const ACTIVATION_PHRASES: Array<{ phrase: 'make-it-so' | 'next-steps'; patterns: RegExp[] }> = [
  { phrase: 'make-it-so', patterns: [/^make it so[.!]?$/i, /^engage[.!]?$/i] },
  { phrase: 'next-steps', patterns: [/^next steps[.!?]*$/i, /^do the next steps[.!?]*$/i, /^execute (the )?next steps[.!?]*$/i] },
];

// Quark tier from message complexity: simple → tier 3 (cheap, advanced), complex → tier 4 (architecture).
function classifyTier(msg: string): 3 | 4 {
  const p = msg.toLowerCase();
  const complex = ['refactor', 'architect', 'design', 'debug', 'why', 'explain', 'review', 'optimize', 'migrate', 'security', 'compare', 'plan', 'trade-off', 'diagnose'];
  return msg.includes('```') || msg.length > 600 || complex.some(w => p.includes(w)) ? 4 : 3;
}

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function normalizeHistory(history: unknown): CanonicalChatHistoryTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .slice(-8)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
}

function compactText(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1) + '…';
}

function providerForModel(model: string): string {
  if (!model) return 'unknown';
  const selected = [
    ['meta', 'Meta'],
    ['deepseek', 'DeepSeek'],
    ['openai', 'OpenAI'],
    ['anthropic', 'Anthropic'],
    ['google', 'Google'],
  ].find(([provider]) => model.toLowerCase().startsWith(provider + '/'));
  if (!selected) return model.split('/')[0] || 'unknown';
  return selected[1];
}

export function detectExecutionActivationPhrase(message: string): 'make-it-so' | 'next-steps' | null {
  const trimmed = String(message ?? '').trim();
  for (const candidate of ACTIVATION_PHRASES) {
    if (candidate.patterns.some((pattern) => pattern.test(trimmed))) return candidate.phrase;
  }
  return null;
}

function hasActionableNextStepsHistory(history: CanonicalChatHistoryTurn[]): boolean {
  const recentAssistant = history
    .filter((turn) => turn.role === 'assistant')
    .slice(-3)
    .map((turn) => turn.content.toLowerCase());
  if (!recentAssistant.length) return false;
  const hasNextStepsHeader = recentAssistant.some((text) => /\bnext steps\b/.test(text));
  const hasActionVerb = recentAssistant.some((text) => /\b(run|execute|inspect|review|validate|verify|summarize|check|implement|fix)\b/.test(text));
  return hasNextStepsHeader && hasActionVerb;
}

function isActivationAllowedForClient(clientId: string | null): boolean {
  if (!ACTIVATION_CLIENT_ALLOWLIST.length) return true;
  const normalized = (clientId || '').trim().toLowerCase();
  return !!normalized && ACTIVATION_CLIENT_ALLOWLIST.includes(normalized);
}

function isActivationPrompt(message: string): boolean {
  return detectExecutionActivationPhrase(message) !== null;
}

export function buildExecutionActivationTask(
  phrase: 'make-it-so' | 'next-steps',
  history: CanonicalChatHistoryTurn[],
): string | null {
  const recent = history.slice(-6);
  const priorUserTurns = recent.filter((turn) => turn.role === 'user' && !isActivationPrompt(turn.content));
  const priorAssistantTurns = recent.filter((turn) => turn.role === 'assistant');
  const primaryUserIntent = priorUserTurns.at(-1)?.content?.trim();
  if (!primaryUserIntent) return null;

  const transcript = recent
    .map((turn) => `${turn.role.toUpperCase()}: ${compactText(turn.content, 600)}`)
    .join('\n\n');
  const lastAssistant = priorAssistantTurns.at(-1)?.content?.trim();

  return [
    `ACTIVATION PHRASE: ${phrase}`,
    phrase === 'next-steps'
      ? 'Execute the next steps implied by the recent conversation. Treat the assistant guidance below as execution context, not as final truth.'
      : 'The operator has ended analysis and authorized execution. Use the recent conversation as the mission brief and begin the end-to-end process now.',
    '',
    'PRIMARY USER OBJECTIVE:',
    primaryUserIntent,
    '',
    ...(lastAssistant ? ['MOST RECENT ASSISTANT CONTEXT:', compactText(lastAssistant, 1000), ''] : []),
    'RECENT CONVERSATION:',
    transcript,
    '',
    'EXECUTION RULES:',
    '- Carry forward explicit constraints from the prior conversation (for example read-only, no edits, or validation-only).',
    '- If critical context is missing for a safe mutation, stop and state exactly what is missing.',
    '- Otherwise self-organize and execute the agreed next steps end to end.',
  ].join('\n');
}

function needsMissingContextGuard(message: string): boolean {
  const lower = message.toLowerCase();
  const hasAmbiguousReference = /(^|\s)(this|that|it|here|these|those)(\s|[?.!,]|$)/i.test(message);
  const asksForAction = /(fix|debug|review|optimize|explain|why|help|issue|problem)/.test(lower);
  const hasConcreteAnchor = /[`/\\]|\b[a-z0-9_-]+\.[a-z0-9]+\b|#L\d+|:\d+/.test(message) || message.includes('\n');
  return message.length <= 220 && hasAmbiguousReference && asksForAction && !hasConcreteAnchor;
}

export function optimizePromptForDispatch(rawMessage: string): { dispatchMessage: string; meta: PromptOptimizationMeta } {
  const original = String(rawMessage ?? '');
  let dispatchMessage = original.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const rules: string[] = [];

  if (dispatchMessage !== original.trim()) rules.push('normalize-whitespace');

  if (needsMissingContextGuard(dispatchMessage)) {
    dispatchMessage += '\n\nContext guard:\n- If this depends on missing repo, runtime, or file context, say exactly what is missing before assuming details.\n- Do not invent files, APIs, outputs, or test results.';
    rules.push('missing-context-guard');
  }

  return {
    dispatchMessage,
    meta: {
      applied: rules.length > 0,
      originalChars: original.length,
      optimizedChars: dispatchMessage.length,
      netCharDelta: dispatchMessage.length - original.length,
      rules,
    },
  };
}

function buildParallelTeams(team: TeamMember[], memoryCounts: Record<string, number>): CrewTeamSnapshot[] {
  const snapshots: CrewTeamSnapshot[] = [];
  for (const def of TEAM_DEFS) {
    const members = team.filter((member) => def.domains.includes(member.domain));
    if (!members.length) continue;
    snapshots.push({
      teamId: def.teamId,
      label: def.label,
      members: members.map((member) => member.crewId),
      domains: Array.from(new Set(members.map((member) => member.domain))),
      memoryHits: members.reduce((sum, member) => sum + (memoryCounts[member.crewId] ?? 0), 0),
    });
  }
  return snapshots;
}

async function buildCrewSelfOrganizationContext(message: string, clientId: string | null, missionOverride?: Awaited<ReturnType<typeof runMissionPipeline>>): Promise<{ prelude: string; meta: CrewSelfOrganizationMeta }> {
  const mission = missionOverride ?? await runMissionPipeline(`CHAT TURN:\n${message}`, clientId);
  const uniqueMembers = Array.from(new Map(mission.team.map((member) => [member.crewId, member])).values());
  const memoryRows = await Promise.all(uniqueMembers.map(async (member) => {
    const rows = await searchCrewPersonalMemories(member.crewId, message, 2).catch(() => []);
    return { member, rows };
  }));

  const memoryCounts = Object.fromEntries(memoryRows.map(({ member, rows }) => [member.crewId, rows.length]));
  const teams = buildParallelTeams(mission.team, memoryCounts);
  const members: CrewMemberMemorySnapshot[] = memoryRows.map(({ member, rows }) => ({
    crewId: member.crewId,
    domain: member.domain,
    teamIds: teams.filter((team) => team.members.includes(member.crewId)).map((team) => team.teamId),
    memoryHits: rows.length,
    memoryTitles: rows.map((row: any) => compactText(String(row.title ?? row.content ?? ''), 80)).filter(Boolean),
  }));

  const teamBlock = teams.length
    ? teams.map((team) => `- ${team.label} [${team.teamId}]: ${team.members.join(', ')}${team.memoryHits ? ` · ${team.memoryHits} personal memory hits` : ''}`).join('\n')
    : '- No parallel teams derived';
  const memoryBlock = members.some((member) => member.memoryHits > 0)
    ? members.filter((member) => member.memoryHits > 0).map((member) => `- ${member.crewId}: ${member.memoryTitles.join(' | ')}`).join('\n')
    : '- No crew personal memory hits';
  const contributionBlock = mission.contributions.slice(0, 5).map((contribution) => `- ${contribution.crewId}: ${compactText(contribution.text, 160)}`).join('\n');

  return {
    prelude: [
      'CREW SELF-ORGANIZATION PRELUDE:',
      mission.goals,
      '',
      'PARALLEL TEAMS:',
      teamBlock,
      '',
      'CREW PERSONAL MEMORY SNAPSHOT:',
      memoryBlock,
      '',
      'CREW CONTRIBUTION SNAPSHOT:',
      contributionBlock || '- No contribution snapshot',
      '',
      'Use this preflight to tighten the answer, stay grounded, and call out missing context instead of inventing it.',
    ].join('\n'),
    meta: {
      enabled: true,
      goals: mission.goals,
      missionPlan: mission.missionPlan,
      topModel: mission.topModel,
      totalCostUSD: mission.efficiency.totalCostUSD,
      totalTokens: mission.efficiency.totalTokens,
      providerCosts: mission.efficiency.perProvider,
      teams,
      members,
    },
  };
}

export async function runCanonicalChatTurn(body: CanonicalChatRequest): Promise<CanonicalChatResponse> {
  if (!OR_KEY) throw new Error('openrouter_not_configured');

  const originalMessage = String(body.message ?? '').trim();
  if (!originalMessage) throw new Error('message_required');
  const optimizedPrompt = body.promptOptimizationMode === 'off'
    ? {
        dispatchMessage: originalMessage,
        meta: {
          applied: false,
          originalChars: originalMessage.length,
          optimizedChars: originalMessage.length,
          netCharDelta: 0,
          rules: [],
        } satisfies PromptOptimizationMeta,
      }
    : optimizePromptForDispatch(originalMessage);

  const history = normalizeHistory(body.history);
  const tier = classifyTier(originalMessage);
  const picked = quarkSelectModel(tier);
  const clientId = body.clientId ?? null;
  const crewPreflightEnabled = body.crewSelfOrganize ?? AUTO_CREW_PREFLIGHT;
  const activationPhrase = detectExecutionActivationPhrase(originalMessage);

  if (activationPhrase && hasActionableNextStepsHistory(history) && isActivationAllowedForClient(clientId)) {
    const activationTask = buildExecutionActivationTask(activationPhrase, history);
    if (!activationTask) throw new Error('activation_context_required');
    const execution = await planThenExecute(activationTask, { clientId, maxIterations: 12, tier: 3 });
    const crewContext = crewPreflightEnabled
      ? await buildCrewSelfOrganizationContext(activationTask, clientId, execution.mission).catch(() => null)
      : null;
    const executionRunCostUSD = Number(execution.run.totalCostUSD.toFixed(6));
    const crewPreparationCostUSD = Number(execution.plan.costUSD.toFixed(6));
    const executionRunTokens = execution.run.totalTokens ?? 0;
    const crewPreparationTokens = execution.mission.efficiency.totalTokens ?? 0;
    const totalCostUSD = Number((crewPreparationCostUSD + executionRunCostUSD).toFixed(6));
    const totalTokens = crewPreparationTokens + executionRunTokens;
    const provider = providerForModel(execution.run.model || execution.plan.topModel);
    recordCost({
      timestamp: new Date().toISOString(),
      surface: 'chat',
      model: execution.run.model || execution.plan.topModel,
      provider,
      tokensIn: crewPreparationTokens,
      tokensOut: executionRunTokens,
      costUSD: totalCostUSD,
    });

    return {
      answer: [
        `Activation recognized: ${activationPhrase === 'make-it-so' ? 'Make it so.' : 'Next steps.'}`,
        '',
        execution.run.finalText || 'Execution completed.',
      ].join('\n'),
      model: execution.run.model || execution.plan.topModel,
      provider,
      tier: classifyTier(activationTask),
      tokensIn: crewPreparationTokens,
      tokensOut: executionRunTokens,
      costUSD: totalCostUSD,
      sources: [
        'activation-phrase',
        ...(crewContext?.meta.members.some((member) => member.memoryHits > 0) ? ['crew-personal-rag'] : []),
        'unified-run',
      ],
      promptOptimization: {
        applied: false,
        originalChars: originalMessage.length,
        optimizedChars: originalMessage.length,
        netCharDelta: 0,
        rules: [],
      },
      crewSelfOrganization: crewContext?.meta,
      executionActivation: {
        activated: true,
        phrase: activationPhrase,
        task: activationTask,
        priorRuns: execution.priorRuns,
        missionId: execution.unifiedRun.missionId,
        iterations: execution.run.iterations,
        toolCalls: execution.run.toolCalls.length,
        escalated: execution.run.escalated,
        stalled: execution.run.stalled,
      },
      costAnalysis: {
        mode: 'plan-then-execute',
        chatCostUSD: 0,
        chatTokensIn: 0,
        chatTokensOut: 0,
        chatTotalTokens: 0,
        crewPreparationCostUSD,
        crewPreparationTokens,
        executionRunCostUSD,
        executionRunTokens,
        totalCostUSD,
        totalTokens,
        provider,
        optimizationRules: [],
      },
    };
  }

  let context = '';
  try { context = (await buildBridges(clientId).ragRecall?.(originalMessage, 4)) ?? ''; } catch { /* RAG optional */ }
  const hasCtx = context && context !== '(no relevant crew memories)';
  let crewContext: { prelude: string; meta: CrewSelfOrganizationMeta } | null = null;
  if (crewPreflightEnabled) {
    try { crewContext = await buildCrewSelfOrganizationContext(originalMessage, clientId); } catch { /* crew preflight optional */ }
  }

  const messages = [
    { role: 'system', content: 'You are the Story Agent crew assistant (OpenRouter, Quark cost-optimized). Be concise and token-efficient: answer directly, prefer short code over prose. Use CONTEXT when relevant. If required context is missing, say exactly what is missing before assuming details. Do not invent files, APIs, outputs, or test results.' },
    ...(hasCtx ? [{ role: 'system', content: `CONTEXT (crew RAG memory):\n${context}` }] : []),
    ...(crewContext ? [{ role: 'system', content: crewContext.prelude }] : []),
    ...history,
    { role: 'user', content: optimizedPrompt.dispatchMessage },
  ];

  const r = await fetch(`${OR_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: picked.id, messages, max_tokens: 900 }),
  });
  if (!r.ok) throw new Error(`openrouter ${r.status}`);

  const d: any = await r.json();
  const answer = d?.choices?.[0]?.message?.content ?? '(no response)';
  const usage = d?.usage ?? {};
  const tokensIn = usage.prompt_tokens ?? 0;
  const tokensOut = usage.completion_tokens ?? 0;
  const chatCostUSD = (tokensIn / 1e6) * (picked.costIn ?? 0) + (tokensOut / 1e6) * (picked.costOut ?? 0);
  const crewPreparationCostUSD = crewContext?.meta.totalCostUSD ?? 0;
  const crewPreparationTokens = crewContext?.meta.totalTokens ?? 0;
  const totalCostUSD = chatCostUSD + crewPreparationCostUSD;
  const totalTokens = tokensIn + tokensOut + crewPreparationTokens;
  recordCost({ timestamp: new Date().toISOString(), surface: 'chat', model: picked.id, provider: picked.provider, tokensIn, tokensOut, costUSD: totalCostUSD });

  return {
    answer,
    model: picked.id,
    provider: picked.provider,
    tier,
    tokensIn,
    tokensOut,
    costUSD: Number(totalCostUSD.toFixed(6)),
    sources: [
      ...(hasCtx ? ['crew-rag'] : []),
      ...(crewContext?.meta.members.some((member) => member.memoryHits > 0) ? ['crew-personal-rag'] : []),
    ],
    promptOptimization: optimizedPrompt.meta,
    crewSelfOrganization: crewContext?.meta,
    costAnalysis: {
      chatCostUSD: Number(chatCostUSD.toFixed(6)),
      chatTokensIn: tokensIn,
      chatTokensOut: tokensOut,
      chatTotalTokens: tokensIn + tokensOut,
      crewPreparationCostUSD: Number(crewPreparationCostUSD.toFixed(6)),
      crewPreparationTokens,
      totalCostUSD: Number(totalCostUSD.toFixed(6)),
      totalTokens,
      provider: picked.provider,
      optimizationRules: optimizedPrompt.meta.rules,
    },
  };
}

function flattenOpenAIContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part: any) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text' && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('');
}

function normalizeOpenAIConversation(messages: unknown): CanonicalChatRequest | null {
  if (!Array.isArray(messages)) return null;
  const normalized = messages
    .map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : m?.role === 'user' ? 'user' : null,
      content: flattenOpenAIContent(m?.content).trim(),
    }))
    .filter((m): m is CanonicalChatHistoryTurn => !!m.role && !!m.content);

  const lastUserIndex = [...normalized].map((m) => m.role).lastIndexOf('user');
  if (lastUserIndex < 0) return null;

  return {
    message: normalized[lastUserIndex].content,
    history: normalized.slice(0, lastUserIndex),
  };
}

/** Serve POST /v1/chat/completions for external OpenAI-compatible clients. */
export async function handleOpenAICompatibleChatRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url || '').split('?')[0];
  if (!(req.method === 'POST' && url === '/v1/chat/completions')) return false;

  const json = (code: number, obj: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

  let body: any;
  try { body = await readJson(req); } catch { json(400, { error: { message: 'bad_json', type: 'invalid_request_error' } }); return true; }
  if (body?.stream === true) {
    json(400, { error: { message: 'stream=true is not supported yet; use non-streaming chat completions', type: 'invalid_request_error' } });
    return true;
  }

  const canonical = normalizeOpenAIConversation(body?.messages);
  if (!canonical) {
    json(400, { error: { message: 'messages with at least one user message are required', type: 'invalid_request_error' } });
    return true;
  }

  try {
    const result = await runCanonicalChatTurn({
      ...canonical,
      clientId: body?.clientId ?? body?.metadata?.clientId ?? null,
      crewSelfOrganize: body?.crewSelfOrganize ?? body?.metadata?.crewSelfOrganize,
      promptOptimizationMode: body?.promptOptimizationMode ?? body?.metadata?.promptOptimizationMode,
    });

    json(200, {
      id: `chatcmpl_${Date.now().toString(36)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: result.answer },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.tokensIn,
        completion_tokens: result.tokensOut,
        total_tokens: result.tokensIn + result.tokensOut,
      },
      system_fingerprint: 'story-agent-canonical-chat',
      story_agent: {
        costAnalysis: result.costAnalysis,
        promptOptimization: result.promptOptimization,
        crewSelfOrganization: result.crewSelfOrganization,
      },
    });
  } catch (e: any) {
    const message = e?.message || 'chat_failed';
    const status = message === 'openrouter_not_configured' ? 503 : message === 'message_required' ? 400 : 502;
    json(status, { error: { message, type: 'server_error' } });
  }
  return true;
}

/** Serve POST /chat. Returns true if it handled the request. */
export async function handleChatRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url || '').split('?')[0];
  if (!(req.method === 'POST' && url === '/chat')) return false;

  const json = (code: number, obj: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

  let body: any;
  try { body = await readJson(req); } catch { json(400, { error: 'bad_json' }); return true; }
  try {
    const result = await runCanonicalChatTurn({
      message: String(body.message ?? body.input ?? ''),
      history: body.history,
      clientId: body.clientId ?? null,
      crewSelfOrganize: body.crewSelfOrganize,
      promptOptimizationMode: body.promptOptimizationMode,
    });
    json(200, result);
  } catch (e: any) {
    const message = e?.message || 'chat_failed';
    const status = message === 'openrouter_not_configured' ? 503 : message === 'message_required' ? 400 : 502;
    json(status, { error: message });
  }
  return true;
}
