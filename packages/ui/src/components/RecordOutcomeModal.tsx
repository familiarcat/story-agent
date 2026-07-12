'use client';

import { useState } from 'react';
import { lcars } from '@/lib/lcars';

const MONO = 'ui-monospace, "Arial Narrow", sans-serif';

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 1000,
        fontFamily: MONO,
      }}
    >
      <div
        style={{
          background: lcars.black,
          color: lcars.text,
          borderRadius: 6,
          border: `1px solid ${lcars.border}`,
          maxWidth: 480,
          width: '100%',
          padding: 16,
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi, margin: 0 }}>Record Outcome</h2>
            <p style={{ fontSize: '0.75rem', color: lcars.textDim, marginTop: 4, letterSpacing: 'normal' }}>
              How did this deliberation result in execution?
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
            {/* Outcome Selection */}
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi }}>Outcome</label>
              <div style={{ display: 'grid', gap: 4 }}>
                {outcomeOptions.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOutcome(value)}
                    style={{
                      textAlign: 'left',
                      background: outcome === value ? lcars.eggplant : lcars.space,
                      border: `1px solid ${outcome === value ? lcars.paleCanary : lcars.border}`,
                      borderRadius: 6,
                      padding: 8,
                      cursor: 'pointer',
                      fontFamily: MONO,
                      color: lcars.text,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: lcars.tanoi }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: lcars.textDim, marginTop: 2, letterSpacing: 'normal' }}>{description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lessons Learned */}
            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="lessons" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: lcars.tanoi }}>
                Lessons Learned (Optional)
              </label>
              <textarea
                id="lessons"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Why did this work/fail? What did the crew learn?"
                maxLength={500}
                rows={4}
                style={{
                  background: lcars.space,
                  color: lcars.text,
                  border: `1px solid ${lcars.border}`,
                  borderRadius: 6,
                  padding: 8,
                  fontFamily: MONO,
                  fontSize: '0.75rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = lcars.paleCanary)}
                onBlur={(e) => (e.currentTarget.style.borderColor = lcars.border)}
              />
              <p style={{ fontSize: '0.7rem', color: lcars.textDim, margin: 0 }}>{outcomeNotes.length}/500 characters</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: lcars.danger,
                color: lcars.onAccent,
                borderRadius: 6,
                padding: 8,
                fontSize: '0.75rem',
              }}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: `1px solid ${lcars.border}` }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1,
                  background: lcars.space,
                  color: lcars.text,
                  border: `1px solid ${lcars.border}`,
                  borderRadius: 6,
                  padding: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontFamily: MONO,
                  cursor: 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  background: lcars.neonCarrot,
                  color: lcars.onAccent,
                  border: 'none',
                  borderRadius: 6,
                  padding: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontFamily: MONO,
                  cursor: 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
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
