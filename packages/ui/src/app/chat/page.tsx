'use client';

import { useRef, useState } from 'react';

const META = '␞ META ␞';

interface Meta {
  model: string;
  tier: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  sources: string[];
}

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  meta?: Meta;
}

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setTurns(t => [...t, { role: 'user', text: message }, { role: 'assistant', text: '' }]);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        setTurns(t => { const c = [...t]; c[c.length - 1] = { role: 'assistant', text: `⚠️ ${err.error}` }; return c; });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const [answer, metaStr] = acc.split(META);
        let meta: Meta | undefined;
        if (metaStr) { try { meta = JSON.parse(metaStr); } catch { /* partial */ } }
        setTurns(t => { const c = [...t]; c[c.length - 1] = { role: 'assistant', text: answer, meta }; return c; });
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
      }
    } catch (e) {
      setTurns(t => { const c = [...t]; c[c.length - 1] = { role: 'assistant', text: `⚠️ ${e instanceof Error ? e.message : String(e)}` }; return c; });
    } finally {
      setBusy(false);
    }
  }

  const sessionCost = turns.reduce((s, t) => s + (t.meta?.costUSD ?? 0), 0);

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🖖 Story Agent — Crew Assistant</h1>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>OpenRouter · cost-optimized · session ~${sessionCost.toFixed(4)}</span>
      </header>

      <div ref={scrollRef} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', height: '60vh', overflowY: 'auto', background: '#fafafa' }}>
        {turns.length === 0 && (
          <p style={{ color: '#9ca3af' }}>Ask anything. Simple questions route to the cheap model ({'haiku'}); complex ones to the quality model (sonnet). Crew memory + docs are injected when relevant.</p>
        )}
        {turns.map((t, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: t.role === 'user' ? '#2563eb' : '#059669' }}>
              {t.role === 'user' ? 'You' : 'Crew'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.5 }}>{t.text || (busy && i === turns.length - 1 ? '…' : '')}</div>
            {t.meta && (
              <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#6b7280', fontFamily: 'ui-monospace, monospace' }}>
                🤖 {t.meta.model} · {t.meta.provider} · {t.meta.tier} route · ↑{t.meta.tokensIn} ↓{t.meta.tokensOut} tok · ~${t.meta.costUSD.toFixed(4)}
                {t.meta.sources?.length ? <><br />📎 {t.meta.sources.join(', ')}</> : null}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask the crew… (Enter to send, Shift+Enter for newline)"
          rows={2}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
        />
        <button onClick={send} disabled={busy || !input.trim()} style={{ padding: '0 1.25rem', borderRadius: 8, border: 'none', background: busy ? '#9ca3af' : '#059669', color: 'white', fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </main>
  );
}
