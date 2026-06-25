/**
 * Web chat API — free-form NL → OpenRouter (cost-optimized), streamed.
 *
 * Mirrors the VS Code assistant: Quark cost-optimized tiering (cheap model for simple
 * turns, quality for complex), Anthropic-direct provider routing, and optional crew RAG
 * context from the local RAG read service. Reads the same CREW_LLM_APPROVED_* env the
 * crew uses (the UI server must be launched with that env in scope).
 */
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const CHEAP = process.env.CREW_LLM_APPROVED_MODEL_CHEAP || 'anthropic/claude-haiku-4.5';
const QUALITY = process.env.CREW_LLM_APPROVED_MODEL || 'anthropic/claude-sonnet-4.6';
const PROFILE = process.env.CREW_LLM_MODEL_PROFILE || 'cost_optimized';
const RAG_URL = process.env.STORY_AGENT_RAG_URL || 'http://localhost:3102';

const RATES: Record<string, { in: number; out: number }> = {
  'anthropic/claude-haiku-4.5': { in: 1, out: 5 },
  'anthropic/claude-sonnet-4.6': { in: 3, out: 15 },
};
const costUSD = (m: string, i: number, o: number) => {
  const r = RATES[m] ?? { in: 1, out: 5 };
  return (i / 1e6) * r.in + (o / 1e6) * r.out;
};

const META = '␞ META ␞'; // sentinel separating the answer from the JSON telemetry footer

function classify(prompt: string): 'simple' | 'complex' {
  const p = prompt.toLowerCase();
  const complex = ['refactor', 'architect', 'design', 'debug', 'why', 'explain', 'review', 'optimize', 'migrate', 'security', 'compare', 'plan', 'trade-off'];
  return prompt.includes('```') || prompt.length > 600 || complex.some(w => p.includes(w)) ? 'complex' : 'simple';
}

async function ragContext(query: string): Promise<{ text: string; sources: string[] }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const resp = await fetch(`${RAG_URL}/rag/query`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 4 }), signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return { text: '', sources: [] };
    const d: any = await resp.json();
    const blocks: string[] = [], sources: string[] = [];
    for (const m of d.memories ?? []) { sources.push(`crew-memory:${m.storyId}`); blocks.push(`// crew memory (${m.storyId})\n${m.text}`); }
    for (const doc of d.docs ?? []) { sources.push(`docs:${doc.title}`); blocks.push(`// doc: ${doc.title}\n${doc.snippet}`); }
    return { text: blocks.join('\n\n').slice(0, 5000), sources };
  } catch {
    return { text: '', sources: [] };
  }
}

const SYSTEM = 'You are the Story Agent crew assistant. Be concise and token-efficient: answer directly, prefer short code over prose. Use the provided CONTEXT when relevant.';

export async function POST(req: NextRequest) {
  if (!OR_KEY) {
    return Response.json({ error: 'OpenRouter not configured (CREW_LLM_APPROVED_KEY missing in the UI server env). Launch the UI from a shell with the crew env.' }, { status: 503 });
  }
  const { message, history } = await req.json().catch(() => ({ message: '' }));
  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'message (string) required' }, { status: 400 });
  }

  // Canonical path: route to the Story Agent crew brain (/chat), whose model is chosen by QUARK
  // (quarkSelectModel) — the single optimized selection. Falls back to local routing if unreachable.
  const AGENT_CHAT = (process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103').replace(/\/$/, '') + '/chat';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const a = await fetch(AGENT_CHAT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }), signal: ctrl.signal,
    });
    clearTimeout(t);
    if (a.ok) {
      const d: any = await a.json();
      const meta = { model: d.model, tier: String(d.tier), provider: d.provider ?? 'openrouter', tokensIn: d.tokensIn ?? 0, tokensOut: d.tokensOut ?? 0, costUSD: d.costUSD ?? 0, sources: d.sources ?? [] };
      return new Response(`${d.answer ?? ''}${META}${JSON.stringify(meta)}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  } catch { /* agent brain unreachable — fall back to local cost-optimized routing below */ }

  const tier = classify(message);
  const model = (!PROFILE || PROFILE === 'quality_first') ? QUALITY : (tier === 'simple' ? CHEAP : QUALITY);
  const ctx = await ragContext(message);
  const userContent = (ctx.text ? `CONTEXT:\n${ctx.text}\n\n---\n\n` : '') + `QUESTION:\n${message}`;

  const orResp = await fetch(`${OR_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0.3, stream: true,
      stream_options: { include_usage: true },
      provider: { order: ['Anthropic'], allow_fallbacks: true },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userContent }],
    }),
  });
  if (!orResp.ok || !orResp.body) {
    return Response.json({ error: `OpenRouter ${orResp.status}: ${(await orResp.text()).slice(0, 200)}` }, { status: 502 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const reader = (orResp.body as any).getReader();
      const dec = new TextDecoder();
      let buffer = '', usageIn = 0, usageOut = 0, answerLen = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const events = buffer.split('\n\n'); buffer = events.pop() ?? '';
        for (const ev of events) {
          const line = ev.split('\n').find(l => l.startsWith('data:'));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) { answerLen += delta.length; controller.enqueue(enc.encode(delta)); }
            if (json.usage) { usageIn = json.usage.prompt_tokens ?? usageIn; usageOut = json.usage.completion_tokens ?? usageOut; }
          } catch { /* skip */ }
        }
      }
      const tokensIn = usageIn || Math.ceil(userContent.length / 4);
      const tokensOut = usageOut || Math.ceil(answerLen / 4);
      const meta = { model, tier, provider: 'openrouter', tokensIn, tokensOut, costUSD: Number(costUSD(model, tokensIn, tokensOut).toFixed(5)), sources: ctx.sources };
      controller.enqueue(enc.encode(`\n${META}${JSON.stringify(meta)}`));
      controller.close();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
