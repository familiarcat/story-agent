'use client';

import { useState, useEffect } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900">💡 Innovation Lounge</h1>
          <p className="text-slate-600 mt-2">
            The crew&apos;s creative jams — each member invents a project in-persona, the crew debates, Picard resolves a portfolio.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && <p className="text-slate-500">Loading sessions…</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}. Is the RAG service reachable? Run a jam with{' '}
            <code className="bg-red-100 px-1 rounded">npx tsx scripts/innovation-lounge.ts</code>.
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
            No Innovation Lounge sessions yet. Run one:{' '}
            <code className="bg-amber-100 px-1 rounded">npx tsx scripts/innovation-lounge.ts</code> or the{' '}
            <code className="bg-amber-100 px-1 rounded">run_innovation_lounge</code> MCP tool.
          </div>
        )}

        {session && (
          <>
            {sessions.length > 1 && (
              <div className="mb-6 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500">Session:</span>
                {sessions.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(i)}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      i === selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {new Date(s.createdAt).toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            {/* Picard's resolution */}
            <section data-dev-tour="il-resolution" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">🖖 Captain Picard&apos;s Resolution</h2>
              <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">
                {session.transcript.consensusSummary}
              </p>
              {session.transcript.actionItems?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-slate-800 mb-1">Portfolio — pursue</h3>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {session.transcript.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {session.transcript.unresolvedRisks?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-slate-800 mb-1">⚔️ Preserved dissent</h3>
                  <ul className="list-disc list-inside text-sm text-slate-600">
                    {session.transcript.unresolvedRisks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </section>

            {/* Pitches */}
            <section data-dev-tour="il-pitches" className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">The Pitches</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pitches.map((p, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-blue-600 font-semibold">{name(p.speakerId)}</div>
                    <p className="text-sm text-slate-700 mt-1">{p.statement}</p>
                    {p.evidence && p.evidence.length > 0 && (
                      <div className="text-xs text-slate-400 mt-2">{p.evidence.join(' · ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Debate */}
            {debate.length > 0 && (
              <section data-dev-tour="il-debate" className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">The Debate</h2>
                <div className="space-y-2">
                  {debate.map((d, i) => (
                    <div key={i} className="bg-white rounded-lg border border-slate-200 p-3">
                      <span className="font-semibold text-slate-800">{name(d.speakerId)}:</span>{' '}
                      <span className="text-sm text-slate-700">{d.statement}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs text-slate-400">
              Session {session.id} · {new Date(session.createdAt).toLocaleString()} · tags: {session.tags?.join(', ')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
