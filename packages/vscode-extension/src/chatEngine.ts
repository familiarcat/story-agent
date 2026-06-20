/**
 * Token-optimizing chat engine for the Story Agent VS Code assistant.
 *
 * PRIMARY backend: OpenRouter, driven by the crew's cost-optimized model routing
 * (Quark's domain) — the same CREW_LLM_APPROVED_* config + cost_optimized profile the
 * MCP crew uses. Simple/support turns route to the cheap model, complex/critical turns
 * to the quality model. This is where the cost savings come from.
 *
 * SECONDARY backend: VS Code Language Model API (Copilot), used only when OpenRouter is
 * not configured/unavailable.
 *
 * Four token-optimization layers wrap both backends:
 *   1. Prompt/response caching  — identical turns skip the LLM entirely (Memento + TTL).
 *   2. Model tiering            — Quark-style routing: cheap model for simple, quality for complex.
 *   3. RAG context pruning      — only the top-K relevant editor/workspace snippets are injected.
 *   4. Token budget + telemetry — per-session ledger, configurable cap, live token+cost meter.
 */
import * as vscode from 'vscode';
import { createHash } from 'crypto';

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
// Override per-model via storyAgent.chat.modelRates if needed.
const DEFAULT_RATES: Record<string, { in: number; out: number }> = {
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
  costProfile: string; // 'cost_optimized' | 'quality_first' | ...
  // OpenRouter (crew config)
  orUrl: string;
  orKey: string;
  orPrimaryModel: string; // quality
  orCheapModel: string; // cost-optimized
  // Copilot fallback families
  smallModelFamily: string;
  capableModelFamily: string;
  // Cloud crew-RAG read service
  ragUseCloud: boolean;
  ragServiceUrl: string;
  ragServiceToken: string;
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
    // OpenRouter — prefer the crew's env config, then settings, then sensible defaults.
    orUrl: envFirst('CREW_LLM_APPROVED_URL', c.get<string>('chat.openRouterUrl')) || 'https://openrouter.ai/api/v1',
    orKey: envFirst('CREW_LLM_APPROVED_KEY', c.get<string>('chat.openRouterApiKey')),
    orPrimaryModel: envFirst('CREW_LLM_APPROVED_MODEL', c.get<string>('chat.openRouterModel')) || 'anthropic/claude-sonnet-4.6',
    orCheapModel: envFirst('CREW_LLM_APPROVED_MODEL_CHEAP', c.get<string>('chat.openRouterModelCheap')) || 'anthropic/claude-haiku-4.5',
    smallModelFamily: c.get<string>('chat.smallModelFamily') ?? 'gpt-4o-mini',
    capableModelFamily: c.get<string>('chat.capableModelFamily') ?? 'gpt-4o',
    ragUseCloud: c.get<boolean>('chat.ragUseCloudMemory') ?? true,
    ragServiceUrl: c.get<string>('chat.ragServiceUrl') ?? 'http://localhost:3102',
    ragServiceToken: envFirst('RAG_SERVICE_TOKEN', c.get<string>('chat.ragServiceToken')),
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

/** Decide which backend to use this turn: OpenRouter is primary, Copilot is the fallback. */
async function resolveProvider(cfg: EngineConfig): Promise<Provider | undefined> {
  const copilotAvailable = async () => (await vscode.lm.selectChatModels({ vendor: 'copilot' })).length > 0;
  if (cfg.provider === 'copilot') return (await copilotAvailable()) ? 'copilot' : (cfg.orKey ? 'openrouter' : undefined);
  if (cfg.provider === 'openrouter') return cfg.orKey ? 'openrouter' : ((await copilotAvailable()) ? 'copilot' : undefined);
  // auto: OpenRouter (cost-optimized) FIRST, Copilot only as fallback.
  if (cfg.orKey) return 'openrouter';
  if (await copilotAvailable()) return 'copilot';
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

/** Pick the OpenRouter model for this tier per the active cost profile (Quark routing). */
function openRouterModelForTier(tier: Tier, cfg: EngineConfig): string {
  if (!cfg.tieringEnabled || cfg.costProfile === 'quality_first') return cfg.orPrimaryModel;
  // cost_optimized (default): cheap model for simple/support, quality only when needed.
  return tier === 'simple' ? cfg.orCheapModel : cfg.orPrimaryModel;
}

async function selectCopilotModel(tier: Tier, cfg: EngineConfig): Promise<vscode.LanguageModelChat | undefined> {
  const all = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (all.length === 0) return undefined;
  if (!cfg.tieringEnabled) return all[0];
  const wantFamily = tier === 'simple' ? cfg.smallModelFamily : cfg.capableModelFamily;
  const exact = all.find(m => m.family === wantFamily || m.id === wantFamily);
  if (exact) return exact;
  const sorted = [...all].sort((a, b) => a.maxInputTokens - b.maxInputTokens);
  return tier === 'simple' ? sorted[0] : sorted[sorted.length - 1];
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

// ── OpenRouter streaming generation (PRIMARY) ─────────────────────────────────

interface GenResult { text: string; tokensIn: number; tokensOut: number; }

async function openRouterStream(
  system: string,
  user: string,
  model: string,
  cfg: EngineConfig,
  stream: vscode.ChatResponseStream,
  cancel: vscode.CancellationToken,
): Promise<GenResult> {
  const resp = await fetch(`${cfg.orUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.orKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.3,
      stream: true,
      stream_options: { include_usage: true },
      // Prefer Anthropic-direct; avoids routing Claude slugs to stale/EOL Bedrock variants.
      provider: { order: ['Anthropic'], allow_fallbacks: true },
    }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`OpenRouter ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }

  const reader = (resp.body as any).getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let usageIn = 0;
  let usageOut = 0;

  while (true) {
    if (cancel.isCancellationRequested) { try { await reader.cancel(); } catch { /* ignore */ } break; }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const line = ev.split('\n').find(l => l.startsWith('data:'));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) { text += delta; stream.markdown(delta); }
        if (json.usage) { usageIn = json.usage.prompt_tokens ?? usageIn; usageOut = json.usage.completion_tokens ?? usageOut; }
      } catch { /* skip malformed chunk */ }
    }
  }

  return {
    text,
    tokensIn: usageIn || Math.ceil((system.length + user.length) / 4),
    tokensOut: usageOut || Math.ceil(text.length / 4),
  };
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

export async function runAssistantTurn(
  prompt: string,
  stream: vscode.ChatResponseStream,
  cancel: vscode.CancellationToken,
  memento: vscode.Memento,
): Promise<AssistantResult> {
  const cfg = getConfig();

  if (ledger.total >= cfg.budget) {
    stream.markdown(`⛔ **Session token budget reached** (${ledger.total.toLocaleString()} / ${cfg.budget.toLocaleString()}). Raise \`storyAgent.chat.tokenBudget\` or run \`/reset\`.`);
    return { tier: 'simple', provider: 'none', model: 'none', cached: false, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: true };
  }

  // RAG context pruning: crew cloud memory/docs (high-value) + local editor snippets.
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
    stream.markdown('⚠️ No LLM backend available. Set an OpenRouter key (`CREW_LLM_APPROVED_KEY` env or `storyAgent.chat.openRouterApiKey`) — or enable GitHub Copilot as the fallback.');
    return { tier, provider: 'none', model: 'none', cached: false, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: false };
  }

  const modelName = provider === 'openrouter'
    ? openRouterModelForTier(tier, cfg)
    : (await selectCopilotModel(tier, cfg))?.name ?? 'copilot';

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
    if (provider === 'openrouter') {
      gen = await openRouterStream(SYSTEM_PROMPT, userContent, modelName, cfg, stream, cancel);
      costUSD = estimateCost(modelName, gen.tokensIn, gen.tokensOut);
    } else {
      const model = await selectCopilotModel(tier, cfg);
      if (!model) throw new Error('Copilot model unavailable');
      const messages = [vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT), vscode.LanguageModelChatMessage.User(userContent)];
      const tokensIn = await model.countTokens(SYSTEM_PROMPT + userContent);
      const res = await model.sendRequest(messages, {}, cancel);
      let text = '';
      for await (const fragment of res.text) { text += fragment; stream.markdown(fragment); }
      gen = { text, tokensIn, tokensOut: await model.countTokens(text) };
      costUSD = 0; // Copilot uses the user's subscription — no per-token spend.
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stream.markdown(`\n\n**LLM error (${provider}):** \`${msg}\``);
    return { tier, provider, model: modelName, cached: false, tokensIn: 0, tokensOut: 0, costUSD: 0, overBudget: false };
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
