'use client';

import { useEffect, useState } from 'react';
import { lcars } from '@/lib/lcars';
import type { ObservationDebateResult } from '@story-agent/shared';

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
}

export function ObservationDetailView({ observationId }: ObservationDetailViewProps) {
  const [observation, setObservation] = useState<DetailObservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    consensus: true,
    risks: true,
    actions: true,
    rounds: false,
  });
  const [viewMode, setViewMode] = useState<'natural' | 'raw'>('natural');

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const generateSummary = (): string => {
    if (!observation) return '';
    const parts: string[] = [];

    if (observation.transcript.consensusSummary) {
      parts.push(`Consensus: ${observation.transcript.consensusSummary.substring(0, 60)}${observation.transcript.consensusSummary.length > 60 ? '...' : ''}`);
    }
    if (observation.transcript.actionItems?.length) {
      parts.push(`${observation.transcript.actionItems.length} action item${observation.transcript.actionItems.length !== 1 ? 's' : ''}`);
    }
    if (observation.transcript.unresolvedRisks?.length) {
      parts.push(`${observation.transcript.unresolvedRisks.length} risk${observation.transcript.unresolvedRisks.length !== 1 ? 's' : ''}`);
    }
    if (observation.transcript.rounds?.length) {
      parts.push(`${observation.transcript.rounds.length} round${observation.transcript.rounds.length !== 1 ? 's' : ''}`);
    }
    return parts.join(' • ') || 'Crew deliberation completed';
  };

  const renderNaturalLanguageDeliberation = (): React.ReactNode => {
    if (!observation) return null;
    return (
      <div style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: MONO }}>
        {observation.transcript.rounds && observation.transcript.rounds.length > 0 ? (
          <>
            {observation.transcript.rounds.map((round, roundIdx) => (
              <div key={roundIdx} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: lcars.paleCanary, marginBottom: 6 }}>{'═'.repeat(40)}</div>
                <div style={{ fontWeight: 700, color: lcars.paleCanary, marginBottom: 6 }}>Round {roundIdx + 1}: {round.title}</div>
                <div style={{ fontWeight: 700, color: lcars.paleCanary, marginBottom: 6 }}>{'═'.repeat(40)}</div>
                {round.entries.map((entry, entryIdx) => (
                  <div key={entryIdx} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: lcars.neonCarrot }}>
                      {entry.speakerId} [{entry.position.toUpperCase()}]
                    </div>
                    <div style={{ marginTop: 2, marginLeft: 12, color: lcars.text }}>{entry.statement}</div>
                    {entry.evidence.length > 0 && (
                      <div style={{ marginTop: 4, marginLeft: 12, fontSize: '0.7rem', color: lcars.textDim }}>
                        {entry.evidence.map((ev, i) => (
                          <div key={i}>📎 {ev}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        ) : (
          <div style={{ color: lcars.textDim }}>No debate rounds recorded</div>
        )}
        {observation.transcript.consensusSummary && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${lcars.border}`, paddingTop: 8 }}>
            <div style={{ fontWeight: 700, color: lcars.paleCanary, marginBottom: 6 }}>CONSENSUS</div>
            <div style={{ color: lcars.text }}>{observation.transcript.consensusSummary}</div>
          </div>
        )}
      </div>
    );
  };

  const renderRawJsonDeliberation = (): React.ReactNode => {
    if (!observation) return null;
    const jsonData = {
      rounds: observation.transcript.rounds,
      consensus: observation.transcript.consensusSummary,
      actionItems: observation.transcript.actionItems,
      unresolvedRisks: observation.transcript.unresolvedRisks,
    };
    return (
      <div
        style={{
          fontSize: '0.65rem',
          color: lcars.textDim,
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          fontFamily: MONO,
          background: lcars.space,
          padding: 8,
          borderRadius: 6,
          border: `1px solid ${lcars.border}`,
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 600,
          maxWidth: '100%',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(jsonData, null, 2)}
      </div>
    );
  };

  if (loading) return <div style={{ color: lcars.textDim, fontSize: '0.8rem' }}>Loading...</div>;
  if (error) return (
    <div style={{
      background: lcars.space,
      borderLeft: `3px solid ${lcars.danger}`,
      borderRadius: 6,
      padding: 10,
      color: lcars.text,
      fontSize: '0.8rem',
      lineHeight: 1.5,
      wordBreak: 'break-word',
      whiteSpace: 'normal',
    }}>
      <div style={{ fontWeight: 700, color: lcars.danger, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⚠️</span>
        <span>Error Loading Deliberation</span>
      </div>
      <div style={{ color: lcars.text, marginBottom: 8 }}>{error}</div>
      {error?.includes('too old') && (
        <div style={{ fontSize: '0.75rem', color: lcars.textDim, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${lcars.border}`, fontStyle: 'italic' }}>
          💡 Try searching for similar deliberations or checking older records.
        </div>
      )}
    </div>
  );
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi }}>Deliberation</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setViewMode('natural')}
              style={{
                background: viewMode === 'natural' ? lcars.paleCanary : lcars.space,
                color: viewMode === 'natural' ? lcars.onAccent : lcars.text,
                border: `1px solid ${viewMode === 'natural' ? lcars.paleCanary : lcars.border}`,
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: MONO,
              }}
            >
              Natural
            </button>
            <button
              onClick={() => setViewMode('raw')}
              style={{
                background: viewMode === 'raw' ? lcars.neonCarrot : lcars.space,
                color: viewMode === 'raw' ? lcars.onAccent : lcars.text,
                border: `1px solid ${viewMode === 'raw' ? lcars.neonCarrot : lcars.border}`,
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: MONO,
              }}
            >
              Raw JSON
            </button>
          </div>
        </div>

        {viewMode === 'natural' ? (
          <>
            <div style={{ fontSize: '0.75rem', color: lcars.textDim, marginBottom: 6, lineHeight: 1.4 }}>{generateSummary()}</div>

            {/* Natural Language View - Collapsible Sections */}
            {/* Consensus Section */}
            {observation.transcript.consensusSummary && (
              <div style={{ marginBottom: 6 }}>
                <button
                  onClick={() => toggleSection('consensus')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: lcars.paleCanary }}>{expandedSections.consensus ? '▼' : '▶'}</span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.paleCanary }}>Consensus</div>
                </button>
                {expandedSections.consensus && (
                  <div style={{ background: lcars.space, borderLeft: `3px solid ${lcars.paleCanary}`, borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4 }}>{observation.transcript.consensusSummary}</div>
                  </div>
                )}
              </div>
            )}

            {/* Unresolved Risks Section */}
            {observation.transcript.unresolvedRisks && observation.transcript.unresolvedRisks.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <button
                  onClick={() => toggleSection('risks')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: lcars.neonCarrot }}>{expandedSections.risks ? '▼' : '▶'}</span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.neonCarrot }}>Unresolved Risks</div>
                </button>
                {expandedSections.risks && (
                  <div style={{ background: lcars.space, borderLeft: `3px solid ${lcars.neonCarrot}`, borderRadius: 6, padding: 8 }}>
                    <ul style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4, margin: 0, paddingLeft: 16 }}>
                      {observation.transcript.unresolvedRisks.map((risk, i) => (
                        <li key={i}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Items Section */}
            {observation.transcript.actionItems && observation.transcript.actionItems.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <button
                  onClick={() => toggleSection('actions')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: lcars.paleCanary }}>{expandedSections.actions ? '▼' : '▶'}</span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.paleCanary }}>Action Items</div>
                </button>
                {expandedSections.actions && (
                  <div style={{ background: lcars.space, borderLeft: `3px solid ${lcars.paleCanary}`, borderRadius: 6, padding: 8 }}>
                    <ul style={{ fontSize: '0.75rem', color: lcars.text, lineHeight: 1.4, margin: 0, paddingLeft: 16 }}>
                      {observation.transcript.actionItems.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Debate Rounds Section */}
            {observation.transcript.rounds && observation.transcript.rounds.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('rounds')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: lcars.goldenTanoi }}>{expandedSections.rounds ? '▼' : '▶'}</span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.goldenTanoi }}>Debate Rounds</div>
                </button>
                {expandedSections.rounds && (
                  <div style={{ marginTop: 6, background: lcars.space, borderRadius: 6, padding: 8 }}>
                    {renderNaturalLanguageDeliberation()}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ background: lcars.space, borderRadius: 6, padding: 8 }}>
            {renderRawJsonDeliberation()}
          </div>
        )}
      </div>
    </div>
  );
}
