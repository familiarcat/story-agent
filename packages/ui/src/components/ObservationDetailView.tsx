'use client';

import { useEffect, useState } from 'react';
import { lcars } from '@/lib/lcars';
import type { ObservationDebateResult } from '@story-agent/shared';
import { RecordOutcomeModal } from './RecordOutcomeModal';

const MONO = 'ui-monospace, "Arial Narrow", sans-serif';

interface DetailObservation {
  id: string;
  storyId: string;
  createdAt: string;
  source: 'mcp' | 'ui';
  tags: string[];
  transcript: ObservationDebateResult;
  transcriptText: string;
  missionReference: string | null;
  outcome: 'pending' | 'success' | 'partial' | 'failed';
  outcomeNotes?: string | null;
  executionCompletedAt?: string | null;
}

interface ObservationDetailViewProps {
  observationId: string;
  onOutcomeRecorded?: () => void;
}

export function ObservationDetailView({ observationId, onOutcomeRecorded }: ObservationDetailViewProps) {
  const [observation, setObservation] = useState<DetailObservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  useEffect(() => {
    fetchObservation();
  }, [observationId]);

  async function fetchObservation() {
    try {
      setLoading(true);
      const response = await fetch(`/api/crew/observations/${observationId}`);
      const json = await response.json();

      if (json.success) {
        setObservation(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to fetch observation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ color: lcars.textDim, fontSize: '0.8rem' }}>Loading...</div>;
  if (error) return <div style={{ color: lcars.danger, fontSize: '0.8rem' }}>{error}</div>;
  if (!observation) return <div style={{ color: lcars.textDim, fontSize: '0.8rem' }}>Observation not found</div>;

  const outcomeEmoji = {
    success: '✅',
    partial: '⚠️',
    failed: '❌',
    pending: '⭕',
  };

  const outcomeLabel = {
    success: 'SUCCESS',
    partial: 'PARTIAL',
    failed: 'FAILED',
    pending: 'PENDING',
  };

  const outcomeColor = {
    success: lcars.paleCanary,
    partial: lcars.neonCarrot,
    failed: lcars.danger,
    pending: lcars.textDim,
  };

  return (
    <div style={{ display: 'grid', gap: 8, fontFamily: MONO, color: lcars.text, fontSize: '0.78rem' }}>
      {/* Story ID / Header */}
      <div style={{ borderBottom: `1px solid ${lcars.border}`, paddingBottom: 8 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi }}>{observation.storyId}</div>
        <div style={{ fontSize: '0.7rem', color: lcars.textDim, marginTop: 4 }}>
          Deliberated: {new Date(observation.createdAt).toLocaleString()}
        </div>
        {observation.missionReference && (
          <div style={{ fontSize: '0.7rem', color: lcars.textDim, marginTop: 4 }}>
            Reference: {observation.missionReference}
          </div>
        )}
      </div>

      {/* Outcome Section */}
      {observation.outcome !== 'pending' && (
        <div style={{ background: lcars.space, borderLeft: `3px solid ${outcomeColor[observation.outcome as keyof typeof outcomeColor]}`, borderRadius: 6, padding: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: '1rem' }}>{outcomeEmoji[observation.outcome as keyof typeof outcomeEmoji]}</span>
            <div style={{ fontWeight: 700, textTransform: 'uppercase', color: outcomeColor[observation.outcome as keyof typeof outcomeColor], fontSize: '0.85rem' }}>
              {outcomeLabel[observation.outcome as keyof typeof outcomeLabel]}
            </div>
          </div>

          {observation.executionCompletedAt && (
            <div style={{ fontSize: '0.7rem', color: lcars.textDim, marginBottom: 6 }}>
              Recorded: {new Date(observation.executionCompletedAt).toLocaleString()}
            </div>
          )}

          {observation.outcomeNotes && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 4 }}>Lessons Learned</div>
              <div style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{observation.outcomeNotes}</div>
            </div>
          )}
        </div>
      )}

      {/* Record Outcome Button */}
      {observation.outcome === 'pending' && (
        <button
          onClick={() => setShowOutcomeModal(true)}
          style={{
            background: lcars.neonCarrot,
            color: lcars.onAccent,
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            fontFamily: MONO,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Record Outcome
        </button>
      )}

      {/* Tags */}
      {observation.tags.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 4 }}>Tags</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {observation.tags.map((tag) => (
              <span key={tag} style={{ fontSize: '0.7rem', background: lcars.space, color: lcars.textDim, padding: '3px 8px', borderRadius: 4, border: `1px solid ${lcars.border}` }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div style={{ borderTop: `1px solid ${lcars.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 6 }}>Deliberation</div>

        {observation.transcript.consensusSummary && (
          <div style={{ background: lcars.space, borderLeft: `3px solid ${lcars.paleCanary}`, borderRadius: 6, padding: 8, marginBottom: 6 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 4 }}>Consensus</div>
            <div style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4 }}>{observation.transcript.consensusSummary}</div>
          </div>
        )}

        {observation.transcript.unresolvedRisks && observation.transcript.unresolvedRisks.length > 0 && (
          <div style={{ background: lcars.space, borderLeft: `3px solid ${lcars.neonCarrot}`, borderRadius: 6, padding: 8, marginBottom: 6 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 4 }}>Unresolved Risks</div>
            <ul style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4, margin: 0, paddingLeft: 16 }}>
              {observation.transcript.unresolvedRisks.map((risk, i) => (
                <li key={i}>• {risk}</li>
              ))}
            </ul>
          </div>
        )}

        {observation.transcript.actionItems && observation.transcript.actionItems.length > 0 && (
          <div style={{ background: lcars.space, borderLeft: `3px solid ${lcars.paleCanary}`, borderRadius: 6, padding: 8, marginBottom: 6 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 4 }}>Action Items</div>
            <ul style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4, margin: 0, paddingLeft: 16 }}>
              {observation.transcript.actionItems.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {observation.transcript.rounds && observation.transcript.rounds.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, marginBottom: 4 }}>Debate Rounds</div>
            {observation.transcript.rounds.map((round, roundIdx) => (
              <div key={roundIdx} style={{ background: lcars.space, borderRadius: 6, padding: 6, marginBottom: 6 }}>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: lcars.tanoi, marginBottom: 4 }}>{round.title}</div>
                {round.entries.map((entry, entryIdx) => (
                  <div key={entryIdx} style={{ fontSize: '0.7rem', marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${lcars.border}` }}>
                    <div style={{ fontWeight: 700, color: lcars.text }}>{entry.speakerId} ({entry.position})</div>
                    <div style={{ color: lcars.tanoi, marginTop: 2 }}>{entry.statement}</div>
                    {entry.evidence.length > 0 && (
                      <ul style={{ fontSize: '0.65rem', color: lcars.textDim, marginTop: 2, margin: 0, paddingLeft: 16 }}>
                        {entry.evidence.map((ev, i) => (
                          <li key={i}>📎 {ev}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Outcome Modal */}
      {showOutcomeModal && (
        <RecordOutcomeModal
          observationId={observation.id}
          onClose={() => setShowOutcomeModal(false)}
          onSuccess={() => {
            setShowOutcomeModal(false);
            fetchObservation();
            onOutcomeRecorded?.();
          }}
        />
      )}
    </div>
  );
}
