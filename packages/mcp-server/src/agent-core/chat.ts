/**
 * Canonical crew CHAT brain — a single-shot, RAG-grounded NL assistant turn whose model is chosen by
 * QUARK (quarkSelectModel) over the cost-ranked multi-provider pool. This is THE optimized selection
 * path; both the web UI (/api/chat) and the VS Code assistant route here so every natural-language
 * request defaults to the crew's cost/efficiency optimization — never a hardcoded model.
 *
 * Mounted at POST /chat on the agent HTTP server (alongside /agent, /symphony).
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'node:crypto';
import { searchCrewPersonalMemories, storeObservationMemory } from '@story-agent/shared/db';
import type { ObservationMemoryRecord, ObservationDebateResult } from '@story-agent/shared';
import { resolveWorfGateCredential } from '@story-agent/shared/worfgate-credentials';
import type { TeamMember } from '../lib/crew-team-assembly.js';
import {
  quarkSelectAvailableModel,
  markModelTemporarilyUnavailable,
  isLikelyModelAvailabilityError,
} from '../lib/openrouter-model-availability.js';
import { buildBridges } from './bridges.js';
import { recordCost } from './cost-ledger.js';
import { checkBudget, getConfig as getCostGovernanceConfig } from './cost-governance.js';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import { planThenExecute } from './plan-then-execute.js';
import { analyzeMission } from '../lib/mission-analyzer.js';
import { buildCrewInventory } from '../lib/crew-skill-registry.js';
import { assembleTeamsForMission } from '../lib/team-assembly-engine.js';

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
  attachments?: CanonicalChatAttachment[];
}

export interface CanonicalChatAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
}

type AttachmentKind = 'image' | 'audio' | 'video' | 'file';

interface NormalizedAttachment extends CanonicalChatAttachment {
  kind: AttachmentKind;
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
  responsiveActions: ResponsiveActionsMeta;
  worfGate: WorfGatePromptSecurityMeta;
  costAnalysis: PromptCostAnalysis;
  executionActivation?: ExecutionActivationMeta;
  // Crew variance resolution (Rule of Three alternatives)
  crewVariance?: {
    exists: boolean;
    alternatives: Array<{ label: string; plan: string; cost: number; risk: string; reasoning: string }>;
    recommendation: string;
    userActionRequired: boolean;
  };
}

export interface ResponsiveActionsMeta {
  requested: string[];
  applied: string[];
  ignored: string[];
  forceAllHands: boolean;
  suppressActivation: boolean;
}

export interface WorfGatePromptSecurityMeta {
  protected: boolean;
  riskLevel: 'low' | 'elevated';
  detectedSignals: string[];
  blockedDirectives: string[];
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
  // Rule of Three: alternatives + variance
  alternatives?: Array<{ label: string; plan: string; cost: number; risk: string; reasoning: string }>;
  variance?: { exists: boolean; summary: string };
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

const ALL_HANDS_CREW: Array<{ crewId: string; domain: string }> = [
  { crewId: 'picard', domain: 'command' },
  { crewId: 'data', domain: 'architecture' },
  { crewId: 'worf', domain: 'security' },
  { crewId: 'riker', domain: 'implementation' },
  { crewId: 'geordi', domain: 'infrastructure' },
  { crewId: 'obrien', domain: 'devops' },
  { crewId: 'yar', domain: 'quality' },
  { crewId: 'troi', domain: 'stakeholder' },
  { crewId: 'crusher', domain: 'health' },
  { crewId: 'uhura', domain: 'communications' },
  { crewId: 'quark', domain: 'finance' },
];

const DIRECTIVE_ALIASES: Record<string, string> = {
  engage: 'make-it-so',
  'make-it-so': 'make-it-so',
  nextsteps: 'next-steps',
  'next-steps': 'next-steps',
  'all-hands': 'all-hands',
  allhands: 'all-hands',
  'analyze-only': 'analyze-only',
  readonly: 'analyze-only',
  'no-crew-preflight': 'no-crew-preflight',
  'crew-preflight': 'crew-preflight',
};

const DIRECTIVES_BLOCKED_ON_INJECTION = new Set([
  'make-it-so',
  'next-steps',
  'all-hands',
  'no-crew-preflight',
  'crew-preflight',
]);

const PROMPT_INJECTION_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: 'override-instructions', pattern: /ignore\s+(all|any|previous|prior)\s+(instructions|rules|system)/i },
  { signal: 'prompt-exfiltration', pattern: /(reveal|print|dump|show)\s+(the\s+)?(system|developer)\s+prompt/i },
  { signal: 'role-spoofing', pattern: /^\s*(system|developer|assistant)\s*:/im },
  { signal: 'policy-bypass', pattern: /(bypass|disable)\s+(safety|guardrails?|worfgate)/i },
  { signal: 'tool-injection-markers', pattern: /<\|[^|>]+\|>|```(?:system|tool)/i },
];

interface ParsedDirective {
  raw: string;
  normalized: string;
}

interface ResponsiveActionControls {
  cleanedMessage: string;
  activationPhrase: 'make-it-so' | 'next-steps' | null;
  crewPreflightEnabled: boolean;
  forceAllHands: boolean;
  suppressActivation: boolean;
  responsiveActions: ResponsiveActionsMeta;
  worfGate: WorfGatePromptSecurityMeta;
}

// Quark tier from message complexity: simple → tier 3 (cheap, advanced), complex → tier 4 (architecture).
function classifyTier(msg: string): 3 | 4 {
  const p = msg.toLowerCase();
  const complex = ['refactor', 'architect', 'design', 'debug', 'why', 'explain', 'review', 'optimize', 'migrate', 'security', 'compare', 'plan', 'trade-off', 'diagnose'];
  return msg.includes('```') || msg.length > 600 || complex.some(w => p.includes(w)) ? 4 : 3;
}

/** Calculate complexity score (0..1) to inform crew team assembly and resource allocation.
 * Not a routing gate (crew ALWAYS runs), but input metadata for Riker/Quark optimization.
 * Score: 0 = trivial/short, 0.5 = moderate, 1.0 = complex/high-stakes. */
function calculateComplexityScore(msg: string): number {
  const text = msg.toLowerCase();
  const tokens = Math.ceil(msg.length / 4); // rough token estimate

  const reasoning = ['analy', 'compar', 'why', 'design', 'plan', 'deliberat', 'decide', 'decision',
    'evaluat', 'recommend', 'investigat', 'strateg', 'architect', 'trade-off', 'review', 'summar', 'explain'];
  const agentic = ['refactor', 'migrat', 'implement', 'rename', 'across the', 'every file', 'all files',
    'add a', 'build a', 'wire up', 'scaffold', 'generate', 'rewrite', 'convert'];
  const trivial = ['quick', 'just ', 'typo', 'one-liner', 'format', 'what is', "what's",
    'tiny', 'small fix', 'rename this', 'thanks', 'continue', 'yes', 'no', 'ok'];

  const hasReasoning = reasoning.some(w => text.includes(w));
  const hasAgentic = agentic.some(w => text.includes(w));
  const hasTrivial = trivial.some(w => text.includes(w)) || tokens < 12;

  // Complexity = 0.3×(length/600) + (reasoning ? 0.5 : 0) + (agentic ? 0.5 : 0); trivial ×0.4
  const lengthScore = Math.min(1, tokens / 600);
  let complexity = 0.3 * lengthScore + (hasReasoning ? 0.5 : 0) + (hasAgentic ? 0.5 : 0);
  if (hasTrivial) complexity *= 0.4;

  return Math.max(0, Math.min(1, complexity));
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

function normalizeAttachments(input: unknown): NormalizedAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: NormalizedAttachment[] = [];
  for (const item of input) {
    const it = item as Record<string, unknown>;
    const name = typeof it.name === 'string' ? it.name.trim() : '';
    const mimeType = typeof it.mimeType === 'string' ? it.mimeType.trim().toLowerCase() : 'application/octet-stream';
    const size = typeof it.size === 'number' && Number.isFinite(it.size) ? Math.max(0, Math.trunc(it.size)) : 0;
    const dataUrl = typeof it.dataUrl === 'string' ? it.dataUrl : undefined;
    if (!name || size <= 0) continue;
    const kind: AttachmentKind = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/')
        ? 'audio'
        : mimeType.startsWith('video/')
          ? 'video'
          : 'file';
    out.push({ name: name.slice(0, 160), mimeType, size, dataUrl, kind });
    if (out.length >= 6) break;
  }
  return out;
}

function parseBase64DataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([a-zA-Z0-9.+/-]+);base64,([a-zA-Z0-9+/=\n\r]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), data: match[2].replace(/[\n\r]/g, '') };
}

function normalizeAudioFormat(mimeType: string): string | null {
  const subtype = mimeType.split('/')[1] ?? '';
  const clean = subtype.split(';')[0].toLowerCase();
  if (clean === 'mpeg' || clean === 'mpga') return 'mp3';
  if (clean === 'x-m4a') return 'm4a';
  if (clean === 'wave' || clean === 'x-wav') return 'wav';
  if (['mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4'].includes(clean)) return clean;
  return null;
}

async function transcribeAudioAttachment(attachment: NormalizedAttachment, OR_URL: string, OR_KEY: string): Promise<string | null> {
  if (!attachment.dataUrl || !attachment.mimeType.startsWith('audio/')) return null;
  const parsed = parseBase64DataUrl(attachment.dataUrl);
  if (!parsed) return null;
  const format = normalizeAudioFormat(parsed.mimeType);
  if (!format) return null;
  try {
    const r = await fetch(`${OR_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Transcribe the provided audio exactly. Return plain text only, no commentary.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Transcribe this audio clip (${attachment.name}).` },
              { type: 'input_audio', input_audio: { data: parsed.data, format } },
            ],
          },
        ],
        max_tokens: 800,
      }),
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    const text = String(d?.choices?.[0]?.message?.content ?? '').trim();
    return text || null;
  } catch {
    return null;
  }
}

async function buildAttachmentNotes(attachments: NormalizedAttachment[], OR_URL: string, OR_KEY: string): Promise<string[]> {
  if (!attachments.length) return [];
  const notes: string[] = ['MULTIMODAL ATTACHMENTS:'];
  let transcribed = 0;
  for (const [idx, attachment] of attachments.entries()) {
    notes.push(`- ${idx + 1}. ${attachment.name} (${attachment.kind}, ${attachment.mimeType}, ${Math.round(attachment.size / 1024)}KB)`);
    if (attachment.kind === 'audio' && transcribed < 2 && attachment.size <= 8 * 1024 * 1024) {
      const transcript = await transcribeAudioAttachment(attachment, OR_URL, OR_KEY);
      if (transcript) {
        notes.push(`  transcript: ${transcript.slice(0, 1200)}`);
        transcribed += 1;
      } else {
        notes.push('  transcript: unavailable (audio format/provider support mismatch).');
      }
    }
    if (attachment.kind === 'video') {
      notes.push('  video_note: direct video transcription is not available in canonical chat yet; request key timestamps or transcript from user if needed.');
    }
  }
  return notes;
}

function buildUserContentParts(message: string, attachments: NormalizedAttachment[]): string | Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [{ type: 'text', text: message }];
  for (const attachment of attachments) {
    if (attachment.kind !== 'image' || !attachment.dataUrl) continue;
    const parsed = parseBase64DataUrl(attachment.dataUrl);
    if (!parsed || !parsed.mimeType.startsWith('image/')) continue;
    parts.push({ type: 'text', text: `Image attachment: ${attachment.name}` });
    parts.push({ type: 'image_url', image_url: { url: attachment.dataUrl } });
  }
  return parts.length > 1 ? parts : message;
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

function parseResponsiveDirectives(message: string): { cleanedMessage: string; directives: ParsedDirective[] } {
  const lines = String(message ?? '').split(/\r?\n/);
  const directives: ParsedDirective[] = [];
  const kept: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*directive\s*:\s*([a-z0-9_-]+)\s*$/i);
    if (!match) {
      kept.push(line);
      continue;
    }
    const alias = match[1].toLowerCase();
    const normalized = DIRECTIVE_ALIASES[alias] ?? alias;
    directives.push({ raw: line.trim(), normalized });
  }

  return {
    cleanedMessage: kept.join('\n').trim(),
    directives,
  };
}

function detectPromptInjectionSignals(message: string): string[] {
  const text = String(message ?? '');
  return PROMPT_INJECTION_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ signal }) => signal);
}

export function resolveResponsiveActionControls(
  message: string,
  requestedCrewPreflight: boolean,
  clientId: string | null,
): ResponsiveActionControls {
  const parsed = parseResponsiveDirectives(message);
  const detectedSignals = detectPromptInjectionSignals(message);
  const blockedDirectives: string[] = [];
  const requested = parsed.directives.map((directive) => directive.normalized);
  const applied = new Set<string>();
  const ignored = new Set<string>();

  let activationPhrase = detectExecutionActivationPhrase(parsed.cleanedMessage || message);
  let crewPreflightEnabled = requestedCrewPreflight;
  let forceAllHands = false;
  let suppressActivation = false;

  for (const directive of parsed.directives) {
    const shouldBlock = detectedSignals.length > 0 && DIRECTIVES_BLOCKED_ON_INJECTION.has(directive.normalized);
    if (shouldBlock) {
      blockedDirectives.push(directive.normalized);
      ignored.add(directive.normalized);
      continue;
    }

    switch (directive.normalized) {
      case 'make-it-so':
        activationPhrase = 'make-it-so';
        applied.add(directive.normalized);
        break;
      case 'next-steps':
        activationPhrase = 'next-steps';
        applied.add(directive.normalized);
        break;
      case 'all-hands':
        forceAllHands = true;
        crewPreflightEnabled = true;
        applied.add(directive.normalized);
        break;
      case 'analyze-only':
        suppressActivation = true;
        applied.add(directive.normalized);
        break;
      case 'crew-preflight':
        crewPreflightEnabled = true;
        applied.add(directive.normalized);
        break;
      case 'no-crew-preflight':
        crewPreflightEnabled = false;
        applied.add(directive.normalized);
        break;
      default:
        ignored.add(directive.normalized);
        break;
    }
  }

  if (suppressActivation) activationPhrase = null;

  if (forceAllHands && !isActivationAllowedForClient(clientId)) {
    forceAllHands = false;
    ignored.add('all-hands');
  }

  return {
    cleanedMessage: parsed.cleanedMessage || String(message ?? '').trim(),
    activationPhrase,
    crewPreflightEnabled,
    forceAllHands,
    suppressActivation,
    responsiveActions: {
      requested,
      applied: Array.from(applied),
      ignored: Array.from(ignored),
      forceAllHands,
      suppressActivation,
    },
    worfGate: {
      protected: true,
      riskLevel: detectedSignals.length ? 'elevated' : 'low',
      detectedSignals,
      blockedDirectives,
    },
  };
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

/** Detects direct imperative coding/ops requests (build, create, add, implement, fix, etc.).
 * Returns true for direct action requests, false for questions or status requests.
 * Be conservative: questions and status requests must return false.
 */
export function detectActionIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const actionVerbs = [
    'build', 'create', 'add', 'implement', 'fix', 'apply', 'refactor', 'update',
    'edit', 'write', 'generate', 'commit', 'push', 'deploy', 'make it so'
  ];
  const actionPhrases = [
    'to the codebase', 'in the codebase', 'and apply', 'the changes', 'the code'
  ];

  // Check for direct imperative verbs
  const hasActionVerb = actionVerbs.some(verb => 
    lower.startsWith(verb) || 
    lower.includes(` ${verb} `) || 
    lower.includes(` ${verb} the `)
  );

  // Check for action phrases
  const hasActionPhrase = actionPhrases.some(phrase => lower.includes(phrase));

  // Exclude questions and status requests
  const isQuestion = lower.startsWith('can you ') || 
                     lower.startsWith('what ') || 
                     lower.startsWith('how ') || 
                     lower.startsWith('is the ') || 
                     lower.startsWith('status report') || 
                     lower.includes('?');

  return (hasActionVerb || hasActionPhrase) && !isQuestion;
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

/**
 * Build parallel teams dynamically using mission analysis and team assembly engine.
 * Returns N teams based on mission scope, complexity, and crew skills.
 * Fallback to buildParallelTeams if analysis fails.
 */
function buildDynamicParallelTeams(
  message: string,
  team: TeamMember[],
  memoryCounts: Record<string, number>,
  complexity?: number,
): CrewTeamSnapshot[] {
  try {
    // Analyze mission to extract subtasks
    const mission = analyzeMission(message);

    // Build crew inventory from our known crew
    const inventory = buildCrewInventory();

    // Assemble teams dynamically
    const result = assembleTeamsForMission(mission, inventory, {
      skillThreshold: 0.65, // slightly lower threshold for more flexibility
    });

    // Convert assembly result to CrewTeamSnapshot format
    return result.teams.map((teamAssignment) => ({
      teamId: teamAssignment.teamId,
      label: teamAssignment.label,
      members: teamAssignment.members,
      domains: Array.from(
        new Set(
          team
            .filter((m) => teamAssignment.members.includes(m.crewId))
            .map((m) => m.domain)
        )
      ),
      memoryHits: teamAssignment.members.reduce((sum, crewId) => sum + (memoryCounts[crewId] ?? 0), 0),
    }));
  } catch (e: any) {
    // Fallback to static team grouping if dynamic assembly fails
    // (e.g., invalid mission brief, crew unavailable)
    return buildParallelTeams(team, memoryCounts);
  }
}

async function buildCrewSelfOrganizationContext(
  message: string,
  clientId: string | null,
  missionOverride?: Awaited<ReturnType<typeof runMissionPipeline>>,
  options?: { forceAllHands?: boolean; worfGate?: WorfGatePromptSecurityMeta; complexity?: number },
): Promise<{ prelude: string; meta: CrewSelfOrganizationMeta }> {
  const mission = missionOverride ?? await runMissionPipeline(`CHAT TURN:\n${message}`, clientId, options?.complexity);
  const uniqueMembers = Array.from(new Map(mission.team.map((member) => [member.crewId, member])).values());
  if (options?.forceAllHands) {
    for (const crew of ALL_HANDS_CREW) {
      if (uniqueMembers.some((member) => member.crewId === crew.crewId)) continue;
      uniqueMembers.push({
        crewId: crew.crewId,
        domain: crew.domain,
        capabilityTier: 3,
        model: mission.topModel,
        provider: providerForModel(mission.topModel) as TeamMember['provider'],
        reason: 'all-hands directive',
      });
    }
  }
  const memoryRows = await Promise.all(uniqueMembers.map(async (member) => {
    const rows = await searchCrewPersonalMemories(member.crewId, message, 2).catch(() => []);
    return { member, rows };
  }));

  const memoryCounts = Object.fromEntries(memoryRows.map(({ member, rows }) => [member.crewId, rows.length]));
  // Use dynamic team assembly to create N teams based on mission complexity, not hardcoded 3
  const teams = buildDynamicParallelTeams(message, uniqueMembers, memoryCounts, options?.complexity);
  const allHandsTeam = options?.forceAllHands
    ? {
        teamId: 'all-hands',
        label: 'All Hands',
        members: ALL_HANDS_CREW.map((crew) => crew.crewId),
        domains: Array.from(new Set(ALL_HANDS_CREW.map((crew) => crew.domain))),
        memoryHits: ALL_HANDS_CREW.reduce((sum, crew) => sum + (memoryCounts[crew.crewId] ?? 0), 0),
      }
    : null;
  const teamSnapshots = allHandsTeam ? [allHandsTeam, ...teams] : teams;
  const members: CrewMemberMemorySnapshot[] = memoryRows.map(({ member, rows }) => ({
    crewId: member.crewId,
    domain: member.domain,
    teamIds: teamSnapshots.filter((team) => team.members.includes(member.crewId)).map((team) => team.teamId),
    memoryHits: rows.length,
    memoryTitles: rows.map((row: any) => compactText(String(row.title ?? row.content ?? ''), 80)).filter(Boolean),
  }));

  const teamBlock = teamSnapshots.length
    ? teamSnapshots.map((team) => `- ${team.label} [${team.teamId}]: ${team.members.join(', ')}${team.memoryHits ? ` · ${team.memoryHits} personal memory hits` : ''}`).join('\n')
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
      ...(options?.worfGate ? [
        'WORFGATE DIRECTIVE ASSESSMENT:',
        options.worfGate.riskLevel === 'elevated'
          ? `- Elevated prompt-injection signals detected (${options.worfGate.detectedSignals.join(', ')}). Unsafe directives were ignored.`
          : '- Directive channel clear. No prompt-injection indicators detected.',
        '',
      ] : []),
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
      teams: teamSnapshots,
      members,
      // Rule of Three: include alternatives + variance from crew mission
      alternatives: mission.alternatives?.map(alt => ({
        label: alt.label,
        plan: alt.missionPlan,
        cost: alt.costDelta,
        risk: alt.riskLevel,
        reasoning: alt.reasoning,
      })),
      variance: mission.variance,
    },
  };
}

/** Auto-log crew deliberation to Observation Lounge (Rule of Three + variance). Best-effort, never blocks. */
async function autoLogCrewContext(
  crewContext: { prelude: string; meta: CrewSelfOrganizationMeta } | null,
  clientId: string | null,
): Promise<void> {
  if (!crewContext) return;
  try {
    const transcript: ObservationDebateResult = {
      rounds: [
        {
          title: `Crew Self-Organization: ${crewContext.meta.goals.slice(0, 100)}`,
          entries: [
            {
              speakerId: 'crew-chat-auto',
              position: 'support',
              statement: JSON.stringify({
                goals: crewContext.meta.goals,
                missionPlan: crewContext.meta.missionPlan,
                alternatives: crewContext.meta.alternatives,
                variance: crewContext.meta.variance,
                teams: crewContext.meta.teams.map(t => t.label),
              }),
              evidence: crewContext.meta.members.map(m => `${m.crewId} (${m.domain})`),
            },
          ],
        },
      ],
      consensusSummary: crewContext.meta.variance?.exists
        ? `Crew deliberated with variance: ${crewContext.meta.variance.summary}`
        : 'Crew reached consensus on approach',
      unresolvedRisks: crewContext.meta.variance?.exists ? ['crew alternatives diverge'] : [],
      finalDecision: crewContext.meta.variance?.exists ? 'revise' : 'approved',
      actionItems: [],
    };
    await storeObservationMemory({
      storyId: `chat-auto-${randomUUID().slice(0, 8)}`,
      clientId,
      source: 'mcp',
      transcript,
      tags: ['crew-auto-org', 'chat-turn', clientId ?? 'no-client'],
    }).catch(() => {}); // best-effort, never blocks
  } catch { /* auto-logging is best-effort */ }
}

export async function runCanonicalChatTurn(body: CanonicalChatRequest): Promise<CanonicalChatResponse> {
  // Resolve credentials through WorfGate (authorized, audited, credential provider chain)
  const keyResult = resolveWorfGateCredential('CREW_LLM_APPROVED_KEY', {
    operation: 'llm:call',
    crewId: 'quark', // Crew identity for authorization
  });
  if (!keyResult.authorized) throw new Error(`worfgate_denied: ${keyResult.reason}`);
  if (!keyResult.available || !keyResult.value) throw new Error('openrouter_not_configured');
  const OR_KEY = keyResult.value;

  const urlResult = resolveWorfGateCredential('CREW_LLM_APPROVED_URL', {
    operation: 'llm:call',
    crewId: 'quark',
  });
  const OR_URL = (urlResult.available && urlResult.value ? urlResult.value : 'https://openrouter.ai/api/v1').replace(/\/$/, '');

  const originalMessage = String(body.message ?? '').trim();
  if (!originalMessage) throw new Error('message_required');
  const history = normalizeHistory(body.history);
  const attachments = normalizeAttachments(body.attachments);
  const clientId = body.clientId ?? null;
  const requestedCrewPreflight = body.crewSelfOrganize ?? AUTO_CREW_PREFLIGHT;
  const controls = resolveResponsiveActionControls(originalMessage, requestedCrewPreflight, clientId);
  const dispatchMessage = controls.cleanedMessage || originalMessage;
  const optimizedPrompt = body.promptOptimizationMode === 'off'
    ? {
        dispatchMessage,
        meta: {
          applied: false,
          originalChars: dispatchMessage.length,
          optimizedChars: dispatchMessage.length,
          netCharDelta: 0,
          rules: [],
        } satisfies PromptOptimizationMeta,
      }
    : optimizePromptForDispatch(dispatchMessage);

  const tier = classifyTier(dispatchMessage);
  const requiresVision = attachments.some((attachment) => attachment.kind === 'image' && Boolean(attachment.dataUrl));
  let picked = await quarkSelectAvailableModel(tier, {
    requireVision: requiresVision,
    preferredModelId: requiresVision ? 'openai/gpt-4o-mini' : undefined,
  });
  // CREW-ALWAYS: Force crew self-organization on all prompts (no complexity threshold)
  const crewPreflightEnabled = true;
  const activationPhrase = controls.activationPhrase;

  // Execute for real via the agent-core loop when the user issues an explicit activation phrase
  // (with actionable history, for allowlisted clients) OR a direct action-intent request. The
  // detectActionIntent path is deliberately NOT gated by the client allowlist so ordinary
  // "build/apply/fix/deploy" requests perform real work instead of a narrated (confabulated) answer.
  const isActionIntent = detectActionIntent(dispatchMessage);
  if ((activationPhrase && hasActionableNextStepsHistory(history) && isActivationAllowedForClient(clientId)) || isActionIntent) {
    const taskPhrase: 'make-it-so' | 'next-steps' = activationPhrase ?? 'make-it-so';
    const activationTask = isActionIntent
      ? dispatchMessage
      : buildExecutionActivationTask(taskPhrase, history);
    if (!activationTask) throw new Error('activation_context_required');

    const execution = await planThenExecute(activationTask, { clientId, maxIterations: 12, tier: 3 });
    const crewContext = crewPreflightEnabled
      ? await buildCrewSelfOrganizationContext(activationTask, clientId, execution.mission, {
          forceAllHands: controls.forceAllHands,
          worfGate: controls.worfGate,
        }).catch(() => null)
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
        `Activation recognized: ${taskPhrase === 'make-it-so' ? 'Make it so.' : 'Next steps.'}`,
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
        originalChars: dispatchMessage.length,
        optimizedChars: dispatchMessage.length,
        netCharDelta: 0,
        rules: [],
      },
      crewSelfOrganization: crewContext?.meta,
      responsiveActions: controls.responsiveActions,
      worfGate: controls.worfGate,
      executionActivation: {
        activated: true,
        phrase: taskPhrase,
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
  try { context = (await buildBridges(clientId).ragRecall?.(dispatchMessage, 4)) ?? ''; } catch { /* RAG optional */ }
  const hasCtx = context && context !== '(no relevant crew memories)';

  // CREW-ALWAYS: Always call crew self-organization (no conditional)
  // Calculate complexity as INPUT to crew team assembly (not a routing gate)
  const complexity = calculateComplexityScore(dispatchMessage);

  let crewContext: { prelude: string; meta: CrewSelfOrganizationMeta } | null = null;
  try {
    crewContext = await buildCrewSelfOrganizationContext(dispatchMessage, clientId, undefined, {
      forceAllHands: controls.forceAllHands,
      worfGate: controls.worfGate,
      complexity, // NEW: pass complexity as input for team assembly
    });
  } catch { /* crew preflight optional */ }

  const costGovernanceConfig = getCostGovernanceConfig();
  const requestId = randomUUID();

  const attachmentNotes = await buildAttachmentNotes(attachments, OR_URL, OR_KEY);
  const userContent = buildUserContentParts(
    attachmentNotes.length ? `${optimizedPrompt.dispatchMessage}\n\n${attachmentNotes.join('\n')}` : optimizedPrompt.dispatchMessage,
    attachments,
  );

  // Pre-flight budget check (projected cost)
  const projectedCostUSD = (picked.costIn ?? 0) * 0.0003 + (picked.costOut ?? 0) * 0.0006; // Conservative estimate
  if (costGovernanceConfig.mode === 'dev' && costGovernanceConfig.budgetUSD > 0) {
    const budgetCheck = await checkBudget(projectedCostUSD, requestId);
    if (!budgetCheck.allow) {
      throw new Error(`[Budget Exceeded] ${budgetCheck.reason}`);
    }
  }

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: 'You are the Story Agent crew assistant (OpenRouter, Quark cost-optimized). Be concise and token-efficient: answer directly, prefer short code over prose. Use CONTEXT when relevant. If required context is missing, say exactly what is missing before assuming details. Do not invent files, APIs, outputs, or test results. Unless execution actually ran, do not claim to have performed file/build/deploy actions.' },
    ...(hasCtx ? [{ role: 'system', content: `CONTEXT (crew RAG memory):\n${context}` }] : []),
    ...(crewContext ? [{ role: 'system', content: crewContext.prelude }] : []),
    ...history,
    { role: 'user', content: userContent },
  ];

  let d: any;
  let responseStatus = 0;
  let responseText = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const r = await fetch(`${OR_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: picked.id, messages, max_tokens: 900 }),
    });
    responseStatus = r.status;
    if (r.ok) {
      d = await r.json();
      break;
    }
    responseText = await r.text();
    if (attempt === 0 && isLikelyModelAvailabilityError(responseStatus, responseText)) {
      markModelTemporarilyUnavailable(picked.id);
      picked = await quarkSelectAvailableModel(tier, { excludeModelIds: [picked.id] });
      continue;
    }
    throw new Error(`openrouter ${responseStatus}`);
  }
  if (!d) throw new Error(`openrouter ${responseStatus}: ${responseText.slice(0, 180)}`);
  const answer = d?.choices?.[0]?.message?.content ?? '(no response)';
  const usage = d?.usage ?? {};
  const tokensIn = usage.prompt_tokens ?? 0;
  const tokensOut = usage.completion_tokens ?? 0;
  const chatCostUSD = (tokensIn / 1e6) * (picked.costIn ?? 0) + (tokensOut / 1e6) * (picked.costOut ?? 0);
  const crewPreparationCostUSD = crewContext?.meta.totalCostUSD ?? 0;
  const crewPreparationTokens = crewContext?.meta.totalTokens ?? 0;
  const totalCostUSD = chatCostUSD + crewPreparationCostUSD;
  const totalTokens = tokensIn + tokensOut + crewPreparationTokens;
  recordCost({
    timestamp: new Date().toISOString(),
    surface: 'chat',
    model: picked.id,
    provider: picked.provider,
    tokensIn,
    tokensOut,
    costUSD: totalCostUSD,
    cost_mode: costGovernanceConfig.mode,
  });

  // Auto-log crew deliberation to RAG (fire-and-forget, never blocks the response)
  autoLogCrewContext(crewContext, clientId).catch(() => {});

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
    responsiveActions: controls.responsiveActions,
    worfGate: controls.worfGate,
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
    // Rule of Three: surface variance to user if crew alternatives diverge
    ...(crewContext?.meta.variance?.exists && crewContext?.meta.alternatives ? {
      crewVariance: {
        exists: true,
        alternatives: crewContext.meta.alternatives,
        recommendation: crewContext.meta.variance.summary,
        userActionRequired: true,
      },
    } : {}),
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
      attachments: body.attachments,
    });
    json(200, result);
  } catch (e: any) {
    const message = e?.message || 'chat_failed';
    const status = message === 'openrouter_not_configured' ? 503 : message === 'message_required' ? 400 : 502;
    json(status, { error: message });
  }
  return true;
}
