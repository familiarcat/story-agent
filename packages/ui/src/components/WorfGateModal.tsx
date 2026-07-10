'use client';

/**
 * Worf Gate confirm modal — the ONLY component allowed to POST Aha write endpoints.
 * Protocol: dry-run POST (confirm:false) is mandatory before the confirm POST (confirm:true).
 */

import { useCallback, useEffect, useState } from 'react';
import type { WorfGateAction } from '@/app/observation-lounge/components/types';

export interface WorfGateModalProps {
  action: WorfGateAction | null;
  onConfirm: (result: unknown) => void;
  onCancel: () => void;
}

type PreviewState = 'idle' | 'loading' | 'ready' | 'error';
type CommitState = 'idle' | 'loading' | 'done' | 'error';

export function WorfGateModal({ action, onConfirm, onCancel }: WorfGateModalProps) {
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [commitState, setCommitState] = useState<CommitState>('idle');
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    if (!action) return;
    let cancelled = false;
    setPreviewState('loading');
    setPreviewData(null);
    setCommitState('idle');
    setCommitError(null);
    (async () => {
      try {
        const res = await fetch(action.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...action.payload, confirm: false }),
        });
        const data: unknown = await res.json();
        if (cancelled) return;
        if (!res.ok || (typeof data === 'object' && data !== null && 'error' in data)) {
          setPreviewState('error');
          return;
        }
        setPreviewData(data);
        setPreviewState('ready');
      } catch {
        if (!cancelled) setPreviewState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [action]);

  const committing = commitState === 'loading';

  const handleCommit = useCallback(async () => {
    if (!action || previewState !== 'ready') return;
    setCommitState('loading');
    setCommitError(null);
    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...action.payload, confirm: true }),
      });
      const data: unknown = await res.json();
      const errObj = typeof data === 'object' && data !== null && 'error' in data
        ? (data as { error?: unknown; details?: unknown })
        : null;
      if (!res.ok || errObj) {
        setCommitState('error');
        setCommitError(
          errObj
            ? [errObj.error, errObj.details].filter(Boolean).map(String).join(' — ')
            : `Write failed (HTTP ${res.status})`
        );
        return;
      }
      setCommitState('done');
      onConfirm(data);
    } catch (e) {
      setCommitState('error');
      setCommitError(e instanceof Error ? e.message : String(e));
    }
  }, [action, previewState, onConfirm]);

  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !committing) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action, committing, onCancel]);

  if (!action) return null;

  return (
    <div className="worf-gate-overlay" role="dialog" aria-modal="true">
      <div className="card worf-gate-panel">
        <h3>⚠ Worf Gate — {action.label}</h3>
        <section>
          <span className="meta">Proposed payload</span>
          <pre className="worf-gate-payload">{JSON.stringify(action.payload, null, 2)}</pre>
        </section>
        <section>
          <span className="meta">Dry-run preview</span>
          {previewState === 'loading' && <span className="meta">Consulting tactical systems…</span>}
          {previewState === 'error' && (
            <span className="tag worf-gate-error">Dry-run failed — confirm blocked</span>
          )}
          {previewState === 'ready' && (
            <pre className="worf-gate-payload">{JSON.stringify(previewData, null, 2)}</pre>
          )}
        </section>
        {commitState === 'error' && commitError && (
          <span className="tag worf-gate-error">{commitError}</span>
        )}
        <div className="worf-gate-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={committing}>
            Retreat
          </button>
          <button
            className="btn btn-primary"
            disabled={previewState !== 'ready' || committing}
            onClick={handleCommit}
          >
            {committing ? 'Executing…' : 'Confirm — Engage'}
          </button>
        </div>
      </div>
    </div>
  );
}
