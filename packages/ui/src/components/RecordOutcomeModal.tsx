'use client';

import { useState } from 'react';

interface RecordOutcomeModalProps {
  observationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordOutcomeModal({ observationId, onClose, onSuccess }: RecordOutcomeModalProps) {
  const [outcome, setOutcome] = useState<'success' | 'partial' | 'failed'>('success');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crew/observations/${observationId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          outcomeNotes: outcomeNotes || undefined,
        }),
      });

      const json = await response.json();

      if (json.success) {
        onSuccess();
      } else {
        setError(json.error || 'Failed to record outcome');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const outcomeOptions = [
    {
      value: 'success',
      label: '✅ Success',
      description: 'The deliberation led to a working solution',
    },
    {
      value: 'partial',
      label: '⚠️ Partial',
      description: 'Solution worked with caveats or limitations',
    },
    {
      value: 'failed',
      label: '❌ Failed',
      description: 'The deliberation did not help execution',
    },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Record Outcome</h2>
            <p className="text-sm text-slate-600 mt-1">
              How did this deliberation result in execution?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Outcome Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Outcome</label>
              <div className="space-y-2">
                {outcomeOptions.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOutcome(value)}
                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                      outcome === value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-600">{description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lessons Learned */}
            <div className="space-y-2">
              <label htmlFor="lessons" className="block text-sm font-semibold text-slate-900">
                Lessons Learned (Optional)
              </label>
              <textarea
                id="lessons"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Why did this work/fail? What did the crew learn?"
                maxLength={500}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-600">{outcomeNotes.length}/500 characters</p>
            </div>

            {/* Error */}
            {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-300 rounded font-semibold text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Record Outcome'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
