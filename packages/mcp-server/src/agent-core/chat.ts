/**
 * Canonical crew CHAT brain — a single-shot, RAG-grounded NL assistant turn whose model is chosen by
 * QUARK (quarkSelectModel) over the cost-ranked multi-provider pool. This is THE optimized selection
 * path; both the web UI (/api/chat) and the VS Code assistant route here so every natural-language
 * request defaults to the crew's cost/efficiency optimization — never a hardcoded model.
 *
 * Mounted at POST /chat on the agent HTTP server (alongside /agent, /symphony).
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { quarkSelectModel } from '../lib/crew-team-assembly.js';
import { buildBridges } from './bridges.js';
import { recordCost } from './cost-ledger.js';

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';

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

/** Serve POST /chat. Returns true if it handled the request. */
export async function handleChatRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url || '').split('?')[0];
  if (!(req.method === 'POST' && url === '/chat')) return false;

  const json = (code: number, obj: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

  if (!OR_KEY) { json(503, { error: 'openrouter_not_configured' }); return true; }
  let body: any;
  try { body = await readJson(req); } catch { json(400, { error: 'bad_json' }); return true; }
  const message = String(body.message ?? body.input ?? '').trim();
  if (!message) { json(400, { error: 'message_required' }); return true; }

  // Multi-turn memory: accept prior turns (capped) so the chat is conversational, not single-shot.
  const history: Array<{ role: string; content: string }> = Array.isArray(body.history)
    ? body.history
        .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
        .slice(-8)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    : [];

  const tier = classifyTier(message);
  const picked = quarkSelectModel(tier);        // QUARK: cheapest adequate model at/above the tier
  const clientId = body.clientId ?? null;

  let context = '';
  try { context = (await buildBridges(clientId).ragRecall?.(message, 4)) ?? ''; } catch { /* RAG optional */ }
  const hasCtx = context && context !== '(no relevant crew memories)';

  const messages = [
    { role: 'system', content: 'You are the Story Agent crew assistant (OpenRouter, Quark cost-optimized). Be concise and token-efficient: answer directly, prefer short code over prose. Use CONTEXT when relevant.' },
    ...(hasCtx ? [{ role: 'system', content: `CONTEXT (crew RAG memory):\n${context}` }] : []),
    ...history,
    { role: 'user', content: message },
  ];

  try {
    const r = await fetch(`${OR_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: picked.id, messages, max_tokens: 900 }),
    });
    if (!r.ok) { json(502, { error: `openrouter ${r.status}` }); return true; }
    const d: any = await r.json();
    const answer = d?.choices?.[0]?.message?.content ?? '(no response)';
    const usage = d?.usage ?? {};
    const tokensIn = usage.prompt_tokens ?? 0, tokensOut = usage.completion_tokens ?? 0;
    const costUSD = (tokensIn / 1e6) * (picked.costIn ?? 0) + (tokensOut / 1e6) * (picked.costOut ?? 0);
    recordCost({ timestamp: new Date().toISOString(), surface: 'chat', model: picked.id, provider: picked.provider, tokensIn, tokensOut, costUSD });
    json(200, {
      answer, model: picked.id, provider: picked.provider, tier,
      tokensIn, tokensOut, costUSD: Number(costUSD.toFixed(6)),
      sources: hasCtx ? ['crew-rag'] : [],
    });
  } catch (e: any) {
    json(502, { error: e?.message || 'chat_failed' });
  }
  return true;
}
