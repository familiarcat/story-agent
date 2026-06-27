'use client';

import { useEffect, useState } from 'react';

interface Card {
  timestamp: string;
  input: string;
  outcome: string;
  model: string;
  tools: string;
  clientId: string | null;
}

export default function LearningsPage() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const r = await fetch('/api/learnings');
      const d = await r.json();
      if (!r.ok) { setErr(d.error || `HTTP ${r.status}`); return; }
      setErr(''); setCards(d.cards ?? []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🧠 Crew Learnings — self-learning loop</h1>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>agent-run feedback cards · RAG</span>
      </header>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 0 }}>
        Every autonomous agent run records a feedback card to RAG (input, model, tools, WorfGate posture, outcome).
        Future runs recall these — the crew gets better over time.
      </p>

      {err && <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', color: 'var(--danger)' }}>⚠️ {err}</div>}

      {cards && cards.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No agent runs recorded yet. Use <code>/agent</code> in the extension to generate learnings.</p>}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {cards?.map((c, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{c.model || 'model n/a'}{c.clientId ? ` · ${c.clientId}` : ''}</span>
              <span>{c.timestamp ? new Date(c.timestamp).toLocaleString() : ''}</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.35rem 0' }}>{c.input || '(no input recorded)'}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{c.outcome}</div>
            {c.tools && <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>🔧 {c.tools}</div>}
          </div>
        ))}
      </div>
    </main>
  );
}
