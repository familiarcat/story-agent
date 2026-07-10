'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface LoungeEntry {
  speakerId: string;
  position: string;
  statement: string;
  evidence?: string[];
}
interface LoungeRound {
  title: string;
  entries: LoungeEntry[];
}
interface LoungeTranscript {
  rounds: LoungeRound[];
  consensusSummary: string;
  unresolvedRisks: string[];
  finalDecision: string;
  actionItems: string[];
}
interface LoungeSession {
  id: string;
  storyId: string;
  createdAt: string;
  tags: string[];
  transcript: LoungeTranscript;
}

const CREW_NAMES: Record<string, string> = {
  picard: 'Jean-Luc Picard', data: 'Data', riker: 'William Riker', worf: 'Worf',
  geordi: 'Geordi La Forge', obrien: "Miles O'Brien", yar: 'Tasha Yar', troi: 'Deanna Troi',
  crusher: 'Beverly Crusher', uhura: 'Nyota Uhura', quark: 'Quark', crew: 'The Crew',
};
const name = (id: string) => CREW_NAMES[id] ?? id;

export default function InnovationLoungePage() {
  const [sessions, setSessions] = useState<LoungeSession[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/innovation-lounge?limit=10');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setSessions(data.sessions || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const session = sessions[selected];
  const pitches = session?.transcript?.rounds?.[0]?.entries ?? [];
  const debate = session?.transcript?.rounds?.[1]?.entries ?? [];

  return (
    <div className="page">
      <header className="section" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-6)' }}>
        <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Innovation Lounge' }]} />
        <h1>💡 Innovation Lounge</h1>
        <p className="lead">
          The crew&apos;s creative jams — each member invents a project in-persona, the crew debates, Picard resolves a portfolio.
        </p>
      </header>

      <div>
        {loading && <p className="meta">Loading sessions…</p>}
        {error && (
          <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            {error}. Is the RAG service reachable? Run a jam with{' '}
            <code className="tag">npx tsx scripts/innovation-lounge.ts</code>.
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="card" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
            No Innovation Lounge sessions yet. Run one:{' '}
            <code className="tag">npx tsx scripts/innovation-lounge.ts</code> or the{' '}
            <code className="tag">run_innovation_lounge</code> MCP tool.
          </div>
        )}

        {session && (
          <>
            {sessions.length > 1 && (
              <div className="cluster section" style={{ marginBottom: 'var(--space-6)' }}>
                <span className="meta">Session:</span>
                {sessions.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(i)}
                    className={`btn ${i === selected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 'var(--text-sm)' }}
                  >
                    {new Date(s.createdAt).toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            {/* Picard's resolution */}
            <section data-dev-tour="il-resolution" className="card section">
              <h2>🖖 Captain Picard&apos;s Resolution</h2>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-loose)' }}>
                {session.transcript.consensusSummary}
              </p>
              {session.transcript.actionItems?.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <h3>Portfolio — pursue</h3>
                  <ul style={{ listStylePosition: 'inside', fontSize: 'var(--text-sm)', paddingLeft: 'var(--space-2)' }}>
                    {session.transcript.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {session.transcript.unresolvedRisks?.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <h3>⚔️ Preserved dissent</h3>
                  <ul style={{ listStylePosition: 'inside', fontSize: 'var(--text-sm)', color: 'var(--text-dim)', paddingLeft: 'var(--space-2)' }}>
                    {session.transcript.unresolvedRisks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </section>

            {/* Pitches */}
            <section data-dev-tour="il-pitches" className="section">
              <h2>The Pitches</h2>
              <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {pitches.map((p, i) => (
                  <div key={i} className="card" style={{ marginBottom: 0, padding: 'var(--space-4)' }}>
                    <div className="meta" style={{ color: 'var(--accent4)', fontWeight: 600 }}>{name(p.speakerId)}</div>
                    <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{p.statement}</p>
                    {p.evidence && p.evidence.length > 0 && (
                      <div className="meta" style={{ marginTop: 'var(--space-2)' }}>{p.evidence.join(' · ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Debate */}
            {debate.length > 0 && (
              <section data-dev-tour="il-debate" className="section">
                <h2>The Debate</h2>
                <div className="stack" style={{ gap: 'var(--space-2)' }}>
                  {debate.map((d, i) => (
                    <div key={i} className="card" style={{ marginBottom: 0, padding: 'var(--space-3)' }}>
                      <span style={{ fontWeight: 600 }}>{name(d.speakerId)}:</span>{' '}
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)' }}>{d.statement}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="meta">
              Session {session.id} · {new Date(session.createdAt).toLocaleString()} · tags: {session.tags?.join(', ')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
