'use client';

import { useEffect, useState } from 'react';
import type { ObservationDebateResult } from '@story-agent/shared';
import { RecordOutcomeModal } from './RecordOutcomeModal';

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

  if (loading) return <div className="p-4 text-center text-slate-500">Loading...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>;
  if (!observation) return <div className="p-4 text-center text-slate-500">Observation not found</div>;

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
    success: 'bg-green-50 border-green-200 text-green-900',
    partial: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    failed: 'bg-red-50 border-red-200 text-red-900',
    pending: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-slate-100 rounded">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{observation.storyId}</h2>
            <p className="text-sm text-slate-600">
              Deliberated: {new Date(observation.createdAt).toLocaleString()}
            </p>
          </div>
          {observation.missionReference && (
            <div className="text-right">
              <p className="text-xs text-slate-600">Reference</p>
              <p className="text-sm font-mono text-slate-900">{observation.missionReference}</p>
            </div>
          )}
        </div>
      </div>

      {/* Outcome Section */}
      {observation.outcome !== 'pending' && (
        <div className={`p-4 border-l-4 rounded ${outcomeColor[observation.outcome as keyof typeof outcomeColor]}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{outcomeEmoji[observation.outcome as keyof typeof outcomeEmoji]}</span>
            <h3 className="text-lg font-bold">
              {outcomeLabel[observation.outcome as keyof typeof outcomeLabel]}
            </h3>
          </div>

          {observation.executionCompletedAt && (
            <p className="text-sm mb-2">
              Recorded: {new Date(observation.executionCompletedAt).toLocaleString()}
            </p>
          )}

          {observation.outcomeNotes && (
            <div className="mt-3">
              <h4 className="font-semibold text-sm mb-2">Lessons Learned</h4>
              <p className="text-sm whitespace-pre-wrap">{observation.outcomeNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Record Outcome Button */}
      {observation.outcome === 'pending' && (
        <button
          onClick={() => setShowOutcomeModal(true)}
          className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors"
        >
          Record Outcome
        </button>
      )}

      {/* Tags */}
      {observation.tags.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 text-slate-700">Tags</h4>
          <div className="flex gap-2 flex-wrap">
            {observation.tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-900">Deliberation Transcript</h3>

        {observation.transcript.consensusSummary && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-sm text-blue-900 mb-2">Consensus</h4>
            <p className="text-sm text-blue-800">{observation.transcript.consensusSummary}</p>
          </div>
        )}

        {observation.transcript.unresolvedRisks && observation.transcript.unresolvedRisks.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold text-sm text-yellow-900 mb-2">Unresolved Risks</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              {observation.transcript.unresolvedRisks.map((risk, i) => (
                <li key={i}>• {risk}</li>
              ))}
            </ul>
          </div>
        )}

        {observation.transcript.actionItems && observation.transcript.actionItems.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-semibold text-sm text-green-900 mb-2">Action Items</h4>
            <ul className="text-sm text-green-800 space-y-1">
              {observation.transcript.actionItems.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {observation.transcript.rounds && observation.transcript.rounds.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-900">Debate Rounds</h4>
            {observation.transcript.rounds.map((round, roundIdx) => (
              <div key={roundIdx} className="p-4 bg-slate-50 border border-slate-200 rounded">
                <h5 className="font-semibold text-sm text-slate-900 mb-2">{round.title}</h5>
                <ul className="space-y-2">
                  {round.entries.map((entry, entryIdx) => (
                    <li key={entryIdx} className="text-sm">
                      <span className="font-semibold text-slate-900">{entry.speakerId} ({entry.position})</span>
                      <p className="text-slate-700 mt-1">{entry.statement}</p>
                      {entry.evidence.length > 0 && (
                        <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                          {entry.evidence.map((ev, i) => (
                            <li key={i}>📎 {ev}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
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
