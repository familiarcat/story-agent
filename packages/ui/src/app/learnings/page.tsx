'use client';

import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ViewHeader, ViewPresentationProvider } from '@/components/ViewPresentation';

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
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem' }}>
      <ViewPresentationProvider tone="learn">
        <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Learnings' }]} />
        <ViewHeader
          title="🧠 Learnings — self-learning loop"
          subtitle="Every autonomous agent run records a feedback card to RAG (input, model, tools, WorfGate posture, outcome). Future runs recall these so the crew gets better over time."
          badge="agent-run feedback cards · RAG"
        />

        {err && <div className="view-card" style={{ borderRadius: 8, padding: '1rem', color: 'var(--danger)' }}>⚠️ {err}</div>}

        {cards && cards.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No agent runs recorded yet. Use <code>/agent</code> in the extension to generate learnings.</p>}

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {cards?.map((c, i) => (
            <div key={i} className="view-card" style={{ borderRadius: 8, padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="view-meta" style={{ fontFamily: 'ui-monospace, monospace' }}>{c.model || 'model n/a'}{c.clientId ? ` · ${c.clientId}` : ''}</span>
                <span className="view-meta">{c.timestamp ? new Date(c.timestamp).toLocaleString() : ''}</span>
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 650, margin: '0.45rem 0 0.35rem', letterSpacing: '0.005em' }}>{c.input || '(no input recorded)'}</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.48 }}>{c.outcome}</div>
              {c.tools && <div style={{ marginTop: 7, fontSize: '0.73rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>🔧 {c.tools}</div>}
            </div>
          ))}
        </div>
      </ViewPresentationProvider>
    </main>
  );
}
