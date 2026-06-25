'use client';

import { useEffect, useState } from 'react';

interface Summary {
  turns: number;
  totalUSD: number;
  tokensIn: number;
  tokensOut: number;
  perProvider: Record<string, { costUSD: number; turns: number }>;
  perModel: Record<string, { costUSD: number; turns: number }>;
  baseline: { model: string; wouldCostUSD: number; savedUSD: number; savedPct: number };
  recent: Array<{ timestamp: string; surface: string; model: string; provider: string; costUSD: number }>;
}

export default function CostPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string>('');

  async function load() {
    try {
      const r = await fetch('/api/cost');
      const d = await r.json();
      if (!r.ok) { setErr(d.error || `HTTP ${r.status}`); return; }
      setErr(''); setData(d);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const card: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', background: '#fff' };
  const bar = (frac: number, color: string) => ({ width: `${Math.min(100, frac * 100)}%`, height: 8, background: color, borderRadius: 4 });

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>💰 Cost Observatory — Quark</h1>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>OpenRouter pool · auto-refresh 10s</span>
      </header>

      {err && <div style={{ ...card, color: '#b91c1c' }}>⚠️ {err}<div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 6 }}>Start the crew brain (<code>STORY_AGENT_AGENT_PORT=3103 pnpm --filter @story-agent/mcp-server start</code>) or set <code>STORY_AGENT_AGENT_URL</code> to the deployed ALB.</div></div>}

      {data && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={card}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total spend ({data.turns} turns)</div><div style={{ fontSize: '1.6rem', fontWeight: 700 }}>${data.totalUSD.toFixed(4)}</div></div>
            <div style={card}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Saved vs {data.baseline.model.split('/')[1]}</div><div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#059669' }}>{data.baseline.savedPct}%</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>${data.baseline.savedUSD.toFixed(4)} saved</div></div>
            <div style={card}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Tokens</div><div style={{ fontSize: '1.1rem', fontWeight: 600 }}>↑{data.tokensIn.toLocaleString()} ↓{data.tokensOut.toLocaleString()}</div></div>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem' }}>By model (Quark's picks)</h2>
            {Object.entries(data.perModel).sort((a, b) => b[1].costUSD - a[1].costUSD).map(([m, v]) => (
              <div key={m} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}><span style={{ fontFamily: 'ui-monospace, monospace' }}>{m}</span><span style={{ color: '#6b7280' }}>{v.turns} turns · ${v.costUSD.toFixed(4)}</span></div>
                <div style={bar(data.totalUSD ? v.costUSD / data.totalUSD : 0, m.startsWith('anthropic') ? '#9333ea' : '#059669')} />
              </div>
            ))}
            {!Object.keys(data.perModel).length && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No turns yet — use the chat or agent to populate.</p>}
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem' }}>Recent turns</h2>
            <div style={{ fontSize: '0.78rem', fontFamily: 'ui-monospace, monospace', color: '#374151' }}>
              {data.recent.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span>{e.surface} · {e.model}</span><span style={{ color: '#6b7280' }}>${e.costUSD.toFixed(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
