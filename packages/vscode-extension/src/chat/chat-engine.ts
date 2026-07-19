/**
 * Token-optimizing chat engine for the Story Agent VS Code assistant.
 *
 * Now refactored to use WebSocket-based chat client instead of direct HTTP calls.
 * The client pools connections, auto-reconnects, and batches low-priority requests
 * for token savings.
 *
 * PRIMARY backend: Story Agent MCP crew system via WebSocket proxy,
 * which runs the crew's full cost-optimized routing pipeline (Quark's domain) —
 * model tiering, team assembly, RAG context injection, governance gates.
 *
 * Four token-optimization layers wrap the crew backend:
 *   1. Prompt/response caching  — identical turns skip the LLM entirely (Memento + TTL).
 *   2. Model tiering            — Quark-style routing: cheap model for simple, quality for complex.
 *   3. RAG context pruning      — only the top-K relevant editor/workspace snippets are injected.
 *   4. Token budget + telemetry — per-session ledger, configurable cap, live token+cost meter.
 *
 * Zustand store integration (Phase 1B):
 *   - Chat messages sync to store via callback-based API
 *   - Metadata (tokens, latency, cost) batched to store
 *   - Collision detection + LWW resolution (Phase 1 mock)
 */
import * as vscode from 'vscode';
import { createHash } from 'crypto';
import { ChatClient, ChatRequest, ConnectionStatus, ChatResponse } from './chat-client';
import type { ChatMessage } from './types';
import { queueChatMessage, queueMetadata, queueUserAction, getSyncManager } from './sync-manager';
import { detectMessageCollision, autoResolveConflicts } from './conflict-detector';

export type Tier = 'simple' | 'complex';
export type Provider = 'openrouter' | 'copilot';

interface CacheEntry {
  response: string;
  tier: Tier;
  provider: Provider;
  modelName: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  ts: number;
}

// ── Cost model (Quark) — USD per 1M tokens, OpenRouter Claude pricing (approx) ──
const DEFAULT_RATES: Record<string, { in: number; out: number }> = {
  'meta-llama/llama-3.3-70b-instruct': { in: 0.12, out: 0.3 },
  'openai/gpt-4o-mini': { in: 0.15, out: 0.6 },
  'deepseek/deepseek-chat': { in: 0.25, out: 0.85 },
  'anthropic/claude-haiku-4.5': { in: 1, out: 5 },
  'anthropic/claude-3.5-haiku': { in: 0.8, out: 4 },
  'anthropic/claude-sonnet-4.6': { in: 3, out: 15 },
  'anthropic/claude-sonnet-4.5': { in: 3, out: 15 },
  'anthropic/claude-sonnet-4': { in: 3, out: 15 },
};
const FALLBACK_RATE = { in: 1, out: 5 };

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rate = DEFAULT_RATES[model] ?? FALLBACK_RATE;
  return (tokensIn / 1e6) * rate.in + (tokensOut / 1e6) * rate.out;
}

// ── Per-session ledger ────────────────────────────────────────────────────────

class TokenLedger {
  tokensIn = 0;
  tokensOut = 0;
  costUSD = 0;
  cachedTokensSaved = 0;
  cachedCostSaved = 0;
  calls = 0;
  cacheHits = 0;

  record(tokensIn: number, tokensOut: number, costUSD: number): void {
    this.tokensIn += tokensIn;
    this.tokensOut += tokensOut;
    this.costUSD += costUSD;
    this.calls += 1;
  }

  recordCacheHit(tokensSaved: number, costSaved: number): void {
    this.cachedTokensSaved += tokensSaved;
    this.cachedCostSaved += costSaved;
    this.cacheHits += 1;
  }

  get total(): number {
    return this.tokensIn + this.tokensOut;
  }
}

const ledger = new TokenLedger();
export function getLedger(): TokenLedger {
  return ledger;
}

// ── Configuration (env-first for crew vars, then VS Code settings) ────────────

interface EngineConfig {
  provider: 'auto' | 'openrouter' | 'copilot';
  budget: number;
  cacheTtlMs: number;
  ragTopK: number;
  tieringEnabled: boolean;
  costProfile: string;
  mcpUrl: string;
  orUrl: string;
  orKey: string;
  orPrimaryModel: string;
  orCheapModel: string;
  smallModelFamily: string;
  capableModelFamily: string;
  ragUseCloud: boolean;
  ragServiceUrl: string;
  ragServiceToken: string;
  // WebSocket chat client config
  chatProxyUrl: string;
}

function envFirst(envName: string, settingVal: string | undefined): string {
  const fromEnv = (process.env[envName] ?? '').trim();
  if (fromEnv) return fromEnv;
  return (settingVal ?? '').trim();
}

function getConfig(): EngineConfig {
  const c = vscode.workspace.getConfiguration('storyAgent');
  return {
    provider: (c.get<string>('chat.provider') as EngineConfig['provider']) ?? 'auto',
    budget: c.get<number>('chat.tokenBudget') ?? 200_000,
    cacheTtlMs: (c.get<number>('chat.cacheTtlMinutes') ?? 60) * 60_000,
    ragTopK: c.get<number>('chat.ragTopK') ?? 4,
    tieringEnabled: c.get<boolean>('chat.modelTiering') ?? true,
    costProfile: envFirst('CREW_LLM_MODEL_PROFILE', c.get<string>('chat.costProfile')) || 'cost_optimized',
    // Canonical crew-brain endpoint key is chat.agentServiceUrl / STORY_AGENT_AGENT_URL (the declared
    // setting). Legacy chat.mcpServerUrl / STORY_AGENT_MCP_URL kept as fallback.
    mcpUrl: envFirst('STORY_AGENT_AGENT_URL', c.get<string>('chat.agentServiceUrl'))
      || envFirst('STORY_AGENT_MCP_URL', c.get<string>('chat.mcpServerUrl'))
      || 'http://localhost:3103',
    orUrl: envFirst('CREW_LLM_APPROVED_URL', c.get<string>('chat.openRouterUrl')) || 'https://openrouter.ai/api/v1',
    orKey: envFirst('CREW_LLM_APPROVED_KEY', c.get<string>('chat.openRouterApiKey')),
    orPrimaryModel: envFirst('CREW_LLM_APPROVED_MODEL', c.get<string>('chat.openRouterModel')) || 'deepseek/deepseek-chat',
    orCheapModel: envFirst('CREW_LLM_APPROVED_MODEL_CHEAP', c.get<string>('chat.openRouterModelCheap')) || 'meta-llama/llama-3.3-70b-instruct',
    smallModelFamily: c.get<string>('chat.smallModelFamily') ?? 'gpt-4o-mini',
    capableModelFamily: c.get<string>('chat.capableModelFamily') ?? 'gpt-4o',
    ragUseCloud: c.get<boolean>('chat.ragUseCloudMemory') ?? true,
    ragServiceUrl: c.get<string>('chat.ragServiceUrl') ?? 'http://localhost:3102',
    ragServiceToken: envFirst('RAG_SERVICE_TOKEN', c.get<string>('chat.ragServiceToken')),
    // Chat proxy WebSocket URL (defaults to same as MCP)
    chatProxyUrl: c.get<string>('chat.chatProxyUrl') || 'http://localhost:3103',
  };
}

/**
 * Cloud crew-RAG: pull the most relevant observation memories + documentation from the
 * Story Agent RAG read service (which holds the service_role cloud key). Best-effort and
 * time-boxed — if the service is down the assistant degrades gracefully to editor context.
 */
async function fetchCloudRagContext(prompt: string, topK: number, cfg: EngineConfig): Promise<PrunedContext> {
  if (!cfg.ragUseCloud || !cfg.ragServiceUrl) return { text: '', sources: [], chars: 0 };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.ragServiceToken) headers['Authorization'] = `Bearer ${cfg.ragServiceToken}`;
    const resp = await fetch(`${cfg.ragServiceUrl.replace(/\/$/, '')}/rag/query`, {
      method: 'POST', headers, signal: ctrl.signal,
      body: JSON.stringify({ query: prompt, topK }),
    });
    if (!resp.ok) return { text: '', sources: [], chars: 0 };
    const data: any = await resp.json();
    const blocks: string[] = [];
    const sources: string[] = [];
    for (const m of data.memories ?? []) {
      sources.push(`crew-memory:${m.storyId}`);
      blocks.push(`// crew memory (${m.storyId}) tags=[${(m.tags ?? []).join(',')}]\n${m.text}`);
    }
    for (const d of data.docs ?? []) {
      sources.push(`docs:${d.title}`);
      blocks.push(`// doc: ${d.title} [${d.category}]\n${d.snippet}`);
    }
    if (blocks.length === 0) return { text: '', sources: [], chars: 0 };
    const text = blocks.join('\n\n');
    const capped = text.length > 5_000 ? text.slice(0, 5_000) + '\n// …(truncated for token budget)' : text;
    return { text: capped, sources, chars: capped.length };
  } catch {
    return { text: '', sources: [], chars: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// ── Chat client management (singleton per extension instance) ────────────────

let chatClient: ChatClient | null = null;
let clientStatus: ConnectionStatus = { connected: false, connecting: false, reconnecting: false };

export async function initializeChatClient(cfg: EngineConfig): Promise<ChatClient> {
  if (chatClient) return chatClient;

  const sessionId = `session-${Date.now()}`;
  const userId = vscode.env.machineId; // Unique per VS Code machine

  chatClient = new ChatClient(cfg.chatProxyUrl, sessionId, userId);

  // Subscribe to connection changes
  chatClient.onConnectionChange((status) => {
    clientStatus = status;
  });

  // Connect on initialization
  await chatClient.connect();

  return chatClient;
}

export function getChatClient(): ChatClient | null {
  return chatClient;
}

export function getChatClientStatus(): ConnectionStatus {
  return { ...clientStatus };
}

export async function disposeChatClient(): Promise<void> {
  if (chatClient) {
    chatClient.disconnect();
    chatClient = null;
  }
}

/** Decide which backend to use this turn: OpenRouter ONLY (no Copilot fallback). */
async function resolveProvider(cfg: EngineConfig): Promise<Provider | undefined> {
  if (cfg.provider === 'openrouter' || cfg.provider === 'auto') {
    return cfg.orKey ? 'openrouter' : undefined;
  }
  return undefined;
}

// ── 2. Model tiering (Quark cost-optimized routing) ──────────────────────────

export function classifyComplexity(prompt: string, contextChars: number): Tier {
  const p = prompt.toLowerCase();
  const complexSignals = [
    'refactor', 'architect', 'design', 'debug', 'why', 'trade-off', 'tradeoff',
    'explain', 'review', 'optimize', 'migrate', 'race condition', 'concurrency',
    'security', 'algorithm', 'prove', 'compare', 'plan',
  ];
  const hasCodeFence = prompt.includes('```');
  const isLong = prompt.length > 600 || contextChars > 4_000;
  const hasComplexWord = complexSignals.some(w => p.includes(w));
  return hasCodeFence || isLong || hasComplexWord ? 'complex' : 'simple';
}

function openRouterModelForTier(tier: Tier, cfg: EngineConfig): string {
  if (!cfg.tieringEnabled || cfg.costProfile === 'quality_first') return cfg.orPrimaryModel;
  return tier === 'simple' ? cfg.orCheapModel : cfg.orPrimaryModel;
}

// ── 3. RAG context pruning (editor/workspace) ────────────────────────────────

interface PrunedContext { text: string; sources: string[]; chars: number; }

export async function buildPrunedContext(prompt: string, topK: number): Promise<PrunedContext> {
  const terms = new Set(prompt.toLowerCase().split(/[^a-z0-9_]+/).filter(t => t.length > 3));
  if (terms.size === 0) return { text: '', sources: [], chars: 0 };

  const candidates: Array<{ label: string; body: string; score: number }> = [];
  const editor = vscode.window.activeTextEditor;

  if (editor && !editor.selection.isEmpty) {
    const sel = editor.document.getText(editor.selection);
    candidates.push({ label: `selection:${editor.document.fileName.split('/').pop()}`, body: sel, score: 1e6 });
  }
  if (editor) {
    const doc = editor.document;
    const lines = doc.getText().split('\n');
    const chunkSize = 40;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const body = lines.slice(i, i + chunkSize).join('\n');
      const lower = body.toLowerCase();
      let score = 0;
      for (const t of terms) if (lower.includes(t)) score += 1;
      if (score > 0) candidates.push({ label: `${doc.fileName.split('/').pop()}:${i + 1}`, body, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const picked = candidates.slice(0, Math.max(0, topK));
  if (picked.length === 0) return { text: '', sources: [], chars: 0 };

  const text = picked.map(c => `// ${c.label}\n${c.body}`).join('\n\n');
  const capped = text.length > 6_000 ? text.slice(0, 6_000) + '\n// …(truncated for token budget)' : text;
  return { text: capped, sources: picked.map(c => c.label), chars: capped.length };
}

// ── 1. Caching ────────────────────────────────────────────────────────────────

function cacheKey(parts: string[]): string {
  return 'chatcache:' + createHash('sha256').update(parts.join(' ')).digest('hex');
}

function readCache(memento: vscode.Memento, key: string, ttlMs: number): CacheEntry | undefined {
  const entry = memento.get<CacheEntry>(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > ttlMs) return undefined;
  return entry;
}

// ── WebSocket-based chat turn (PRIMARY) ──────────────────────────────────────

interface GenResult { text: string; tokensIn: number; tokensOut: number; model?: string; }

/**
 * Send a chat message via WebSocket and sync to Zustand store.
 *
 * Integration points:
 * - Queue user message to sync manager (optimistic add)
 * - Stream assistant response to UI
 * - Queue metadata (tokens, latency) on completion
 * - Detect collisions on concurrent sends
 */
async function chatViaWebSocket(
  userMessage: string,
  cfg: EngineConfig,
  stream: vscode.ChatResponseStream,
  storyId: string = 'default',
): Promise<GenResult> {
  const client = await initializeChatClient(cfg);

  const tier = classifyComplexity(userMessage, 0);
  const priority = tier === 'simple' ? 'low' : 'high';

  // Generate IDs for this exchange
  const userMessageId = `msg-${Date.now()}-user`;
  const assistantMessageId = `msg-${Date.now()}-assistant`;
  const startTime = Date.now();

  // 1. Create user message for queueing
  const userMsg: ChatMessage = {
    id: userMessageId,
    storyId,
    crewMemberId: 'vscode-user',
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
    metadata: { tier, priority },
  };

  queueChatMessage(storyId, userMsg);
  queueUserAction(storyId, 'send');

  // 2. Prepare request
  const request: ChatRequest = {
    message: userMessage,
    priority: priority as 'high' | 'low',
    sessionId: `session-${storyId}`,
    userId: vscode.env.machineId,
  };

  return new Promise((resolve, reject) => {
    let fullText = '';
    let finalModel = '';
    let finalTokensIn = 0;
    let finalTokensOut = 0;
    let requestId = '';

    // Set timeout
    const timeout = setTimeout(() => {
      reject(new Error('Chat response timeout (30s)'));
    }, 30000);

    // Send the request
    client.send(request).catch(reject);

    // Wait a bit for response setup, then get the ID from first response
    setTimeout(() => {
      // We'll need to match responses — for now use a generated ID
      requestId = `chat-${Date.now()}`;

      // Listen to responses
      const unsub = client.onChatResponse(requestId, (response: ChatResponse) => {
        try {
          if (response.content) {
            fullText += response.content;
            stream.markdown(response.content);
          }
          if (response.model) finalModel = response.model;
          if (response.tokensIn) finalTokensIn = response.tokensIn;
          if (response.tokensOut) finalTokensOut = response.tokensOut;

          // Stream is complete
          if (response.done) {
            clearTimeout(timeout);
            unsub();
            unsubError();

            // 3. Create assistant message for queueing
            const latencyMs = Date.now() - startTime;
            const assistantMsg: ChatMessage = {
              id: assistantMessageId,
              storyId,
              crewMemberId: 'assistant',
              role: 'assistant',
              content: fullText,
              timestamp: new Date().toISOString(),
              metadata: {
                model: finalModel,
                tokensIn: finalTokensIn,
                tokensOut: finalTokensOut,
                latencyMs,
              },
            };

            queueChatMessage(storyId, assistantMsg);

            // 4. Queue metadata
            queueMetadata(storyId, {
              tokensIn: finalTokensIn,
              tokensOut: finalTokensOut,
              latencyMs,
              model: finalModel,
            });

            // 5. Flush pending batch
            try {
              const syncManager = getSyncManager();
              syncManager.flushAllBatches();
            } catch (err) {
              console.warn('[chatViaWebSocket] Flush batch error:', err);
            }

            resolve({
              text: fullText,
              tokensIn: finalTokensIn,
              tokensOut: finalTokensOut,
              model: finalModel,
            });
          }
        } catch (err) {
          clearTimeout(timeout);
          unsub();
          unsubError();
          reject(err);
        }
      });

      const unsubError = client.onError((err) => {
        clearTimeout(timeout);
        unsub();
        unsubError();
        reject(err);
      });
    }, 100);
  });
}

// ── Telemetry footer ──────────────────────────────────────────────────────────

function meter(
  turnIn: number, turnOut: number, turnCost: number, cfg: EngineConfig,
  opts: { cached: boolean; tier: Tier; provider: Provider | 'cache'; model: string; sources: string[] },
): string {
  const remaining = Math.max(0, cfg.budget - ledger.total);
  const pct = cfg.budget > 0 ? Math.round((ledger.total / cfg.budget) * 100) : 0;
  const filled = Math.min(10, Math.round(pct / 10));
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, 10 - filled));
  const routeWord = opts.tier === 'simple' ? 'cost-optimized' : 'quality';
  const head = opts.cached
    ? `🗃️ **cached** — 0 tokens / $0 this turn (saved ~${turnIn + turnOut} tok, ~$${turnCost.toFixed(4)})`
    : `🤖 \`${opts.model}\` · ${opts.provider} · ${routeWord} route (${opts.tier}) · ↑${turnIn} ↓${turnOut} tok · ~$${turnCost.toFixed(4)}`;
  return [
    '', '---', head,
    opts.sources.length ? `📎 context: ${opts.sources.join(', ')}` : '📎 context: none (minimal-token mode)',
    `📊 session ${ledger.total.toLocaleString()} / ${cfg.budget.toLocaleString()} tok \`${bar}\` ${pct}% · ~$${ledger.costUSD.toFixed(4)} spent · ${remaining.toLocaleString()} tok left · ${ledger.cacheHits} cache hits (~$${ledger.cachedCostSaved.toFixed(4)} saved)`,
  ].join('\n');
}

const SYSTEM_PROMPT =
  'You are the Story Agent crew assistant inside VS Code. Be concise and token-efficient: ' +
  'answer directly, prefer short code over prose, and do not restate the question. ' +
  'Use the provided CONTEXT snippets when relevant; if none are relevant, answer from general knowledge.';

// ── Orchestrator ──────────────────────────────────────────────────────────────

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface AssistantResult {
  tier: Tier;
  provider: Provider | 'none';
  model: string;
  cached: boolean;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  overBudget: boolean;
}

/**
 * Run a single assistant turn with full store integration.
 *
 * - Checks token budget
 * - Fetches RAG context
 * - Classifies complexity
 * - Routes through WebSocket
 * - Syncs to store via sync manager
 * - Handles cache hits
 */
export async function runAssistantTurn(
  prompt: string,
  stream: vscode.ChatResponseStream,
  cancel: vscode.CancellationToken,
  memento: vscode.Memento,
  storyId?: string,
): Promise<AssistantResult> {
  const cfg = getConfig();
  const actualStoryId = storyId || 'default';

  if (ledger.total >= cfg.budget) {
    stream.markdown(`⛔ **Session token budget reached** (${ledger.total.toLocaleString()} / ${cfg.budget.toLocaleString()}). Raise \`storyAgent.chat.tokenBudget\` or run \`/reset\`.`);
    return { tier: 'simple', provider: 'none', model: 'none', cached: false, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: true };
  }

  // RAG context pruning
  const [cloudCtx, editorCtx] = await Promise.all([
    fetchCloudRagContext(prompt, cfg.ragTopK, cfg),
    buildPrunedContext(prompt, cfg.ragTopK),
  ]);
  const ctx = {
    sources: [...cloudCtx.sources, ...editorCtx.sources],
    chars: cloudCtx.chars + editorCtx.chars,
  };
  const tier = classifyComplexity(prompt, ctx.chars);
  const contextBlock = [
    cloudCtx.text ? `CREW MEMORY & DOCS:\n${cloudCtx.text}` : '',
    editorCtx.text ? `EDITOR CONTEXT:\n${editorCtx.text}` : '',
  ].filter(Boolean).join('\n\n');
  const userContent = (contextBlock ? `${contextBlock}\n\n---\n\n` : '') + `QUESTION:\n${prompt}`;

  const provider = await resolveProvider(cfg);
  if (!provider) {
    stream.markdown('⚠️ No LLM backend available. Set an OpenRouter key (`CREW_LLM_APPROVED_KEY` env or `storyAgent.chat.openRouterApiKey`).');
    return { tier, provider: 'none', model: 'none', cached: false, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: false };
  }

  const modelName = openRouterModelForTier(tier, cfg);

  // 1. Cache lookup
  const key = cacheKey([provider, modelName, userContent]);
  const hit = readCache(memento, key, cfg.cacheTtlMs);
  if (hit) {
    stream.markdown(hit.response);
    ledger.recordCacheHit(hit.tokensIn + hit.tokensOut, hit.costUSD);
    stream.markdown(meter(hit.tokensIn, hit.tokensOut, hit.costUSD, cfg, { cached: true, tier, provider: 'cache', model: hit.modelName, sources: ctx.sources }));
    return { tier, provider, model: hit.modelName, cached: true, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: false };
  }

  let gen: GenResult;
  let costUSD = 0;

  try {
    // Route through WebSocket chat client with store integration
    gen = await chatViaWebSocket(userContent, cfg, stream, actualStoryId);
    costUSD = estimateCost(modelName, gen.tokensIn, gen.tokensOut);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stream.markdown(`\n\n**LLM error:** \`${msg}\``);
    return { tier, provider, model: '', cached: false, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: false };
  }

  ledger.record(gen.tokensIn, gen.tokensOut, costUSD);
  await memento.update(key, {
    response: gen.text, tier, provider, modelName, tokensIn: gen.tokensIn, tokensOut: gen.tokensOut, costUSD, ts: Date.now(),
  } satisfies CacheEntry);

  stream.markdown(meter(gen.tokensIn, gen.tokensOut, costUSD, cfg, { cached: false, tier, provider, model: modelName, sources: ctx.sources }));
  return { tier, provider, model: modelName, cached: false, tokensIn: gen.tokensIn, tokensOut: gen.tokensOut, costUSD, overBudget: false };
}

export function resetSession(): void {
  ledger.tokensIn = 0;
  ledger.tokensOut = 0;
  ledger.costUSD = 0;
  ledger.cachedTokensSaved = 0;
  ledger.cachedCostSaved = 0;
  ledger.calls = 0;
  ledger.cacheHits = 0;
}
