'use client';

import { useEffect, useState } from 'react';
import type { ObservationMemoryRecord } from '@story-agent/shared';

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
    success: 'Success',
    partial: 'Partial',
    failed: 'Failed',
    pending: 'Pending',
  };

  const outcomeColor = {
    success: 'text-green-600',
    partial: 'text-yellow-600',
    failed: 'text-red-600',
    pending: 'text-gray-600',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 p-4 bg-slate-100 rounded">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search observations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border border-slate-300 rounded"
        >
          <option value="">All Outcomes</option>
          <option value="success">✅ Success</option>
          <option value="partial">⚠️ Partial</option>
          <option value="failed">❌ Failed</option>
          <option value="pending">⭕ Pending</option>
        </select>
      </div>

      {/* Loading / Error */}
      {loading && <div className="p-4 text-center text-slate-500">Loading...</div>}
      {error && <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* List */}
      {!loading && observations.length === 0 && (
        <div className="p-4 text-center text-slate-500">No observations found</div>
      )}

      <div className="space-y-2">
        {observations.map((obs) => (
          <button
            key={obs.id}
            onClick={() => onSelectObservation(obs.id)}
            className={`w-full text-left p-4 border rounded transition-colors ${
              selectedId === obs.id
                ? 'bg-blue-50 border-blue-500'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xl ${outcomeColor[obs.outcome as keyof typeof outcomeColor]}`}>
                    {outcomeEmoji[obs.outcome as keyof typeof outcomeEmoji]}
                  </span>
                  <span className="text-sm font-medium text-slate-600">
                    {outcomeLabel[obs.outcome as keyof typeof outcomeLabel]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(obs.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 truncate">{obs.summary}</p>
                {obs.tags.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {obs.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                    {obs.tags.length > 3 && (
                      <span className="text-xs text-slate-500 px-2 py-1">+{obs.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {!loading && observations.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-slate-100 rounded">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 border border-slate-300 rounded disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-600">Page {page + 1}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={observations.length < limit}
            className="px-4 py-2 border border-slate-300 rounded disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
