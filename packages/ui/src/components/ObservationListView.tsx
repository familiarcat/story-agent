'use client';

import { useEffect, useState } from 'react';
import { lcars } from '@/lib/lcars';
import type { ObservationMemoryRecord } from '@story-agent/shared';

const MONO = 'ui-monospace, "Arial Narrow", sans-serif';

interface Observation {
  id: string;
  storyId: string;
  createdAt: string;
  outcome: 'pending' | 'success' | 'partial' | 'failed';
  summary: string;
  tags: string[];
  outcomeNotes?: string | null;
}

interface ObservationListViewProps {
  onSelectObservation: (id: string) => void;
  selectedId?: string;
}

export function ObservationListView({ onSelectObservation, selectedId }: ObservationListViewProps) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchObservations();
  }, [statusFilter, searchTerm, page]);

  async function fetchObservations() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/crew/observations?${params}`);
      const json = await response.json();

      if (json.success) {
        setObservations(json.data.observations);
        setError(null);
      } else {
        setError(json.error || 'Failed to fetch observations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

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
      {/* Filters */}
      <div style={{ display: 'grid', gap: 6 }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          style={{
            background: lcars.space,
            color: lcars.text,
            border: `1px solid ${lcars.border}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontFamily: MONO,
            fontSize: '0.75rem',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = lcars.paleCanary)}
          onBlur={(e) => (e.currentTarget.style.borderColor = lcars.border)}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          style={{
            background: lcars.space,
            color: lcars.text,
            border: `1px solid ${lcars.border}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontFamily: MONO,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <option value="">All Outcomes</option>
          <option value="success">✅ Success</option>
          <option value="partial">⚠️ Partial</option>
          <option value="failed">❌ Failed</option>
          <option value="pending">⭕ Pending</option>
        </select>
      </div>

      {/* Loading / Error */}
      {loading && <div style={{ color: lcars.textDim, textAlign: 'center', padding: '10px 0' }}>Loading...</div>}
      {error && <div style={{ color: lcars.danger, background: lcars.space, borderLeft: `3px solid ${lcars.danger}`, borderRadius: 6, padding: 8 }}>{error}</div>}

      {/* List */}
      {!loading && observations.length === 0 && (
        <div style={{ color: lcars.textDim, textAlign: 'center', padding: '10px 0' }}>No observations found</div>
      )}

      <div style={{ display: 'grid', gap: 4, maxHeight: 600, overflowY: 'auto' }}>
        {observations.map((obs) => (
          <button
            key={obs.id}
            onClick={() => onSelectObservation(obs.id)}
            style={{
              textAlign: 'left',
              background: selectedId === obs.id ? lcars.eggplant : lcars.space,
              border: `1px solid ${selectedId === obs.id ? outcomeColor[obs.outcome as keyof typeof outcomeColor] : lcars.border}`,
              borderLeft: `3px solid ${outcomeColor[obs.outcome as keyof typeof outcomeColor]}`,
              borderRadius: 6,
              padding: 8,
              cursor: 'pointer',
              fontFamily: MONO,
              color: lcars.text,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = lcars.eggplant;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selectedId === obs.id ? lcars.eggplant : lcars.space;
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                <span style={{ fontSize: '1rem' }}>{outcomeEmoji[obs.outcome as keyof typeof outcomeEmoji]}</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', color: outcomeColor[obs.outcome as keyof typeof outcomeColor] }}>
                  {outcomeLabel[obs.outcome as keyof typeof outcomeLabel]}
                </span>
                <span style={{ color: lcars.textDim }}>{new Date(obs.createdAt).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: lcars.tanoi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{obs.summary}</div>
              {obs.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {obs.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={{ fontSize: '0.65rem', background: lcars.space, color: lcars.textDim, padding: '2px 6px', borderRadius: 4, border: `1px solid ${lcars.border}` }}>
                      {tag}
                    </span>
                  ))}
                  {obs.tags.length > 3 && <span style={{ fontSize: '0.65rem', color: lcars.textDim }}>+{obs.tags.length - 3}</span>}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {!loading && observations.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${lcars.border}`, paddingTop: 8, fontSize: '0.72rem', color: lcars.textDim, gap: 8 }}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            style={{
              background: page === 0 ? lcars.space : lcars.eggplant,
              color: lcars.text,
              border: `1px solid ${lcars.border}`,
              borderRadius: 6,
              padding: '6px 12px',
              cursor: page === 0 ? 'default' : 'pointer',
              fontFamily: MONO,
              opacity: page === 0 ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={observations.length < limit}
            style={{
              background: observations.length < limit ? lcars.space : lcars.eggplant,
              color: lcars.text,
              border: `1px solid ${lcars.border}`,
              borderRadius: 6,
              padding: '6px 12px',
              cursor: observations.length < limit ? 'default' : 'pointer',
              fontFamily: MONO,
              opacity: observations.length < limit ? 0.5 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
