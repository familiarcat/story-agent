'use client';

import { useState, useCallback, useEffect } from 'react';
import { PMStory } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

/**
 * Stories Page (Feed/List View)
 * 
 * Shows all stories across projects with filtering and pagination.
 */

export default function StoriesPage() {
  const [filters, setFilters] = useState({
    state: '',
    priority: '',
    offset: 0,
    limit: 20,
  });
  const [stories, setStories] = useState<PMStory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stories with current filters
  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.state) params.append('state', filters.state);
        if (filters.priority) params.append('priority', filters.priority);
        params.append('offset', filters.offset.toString());
        params.append('limit', filters.limit.toString());

        const response = await fetch(`/api/pm/stories?${params}`);
        if (!response.ok) throw new Error('Failed to fetch stories');
        const data = await response.json();
        setStories(data.data.items || []);
        setTotal(data.data.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stories');
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, [filters]);

  const { state: filterState, priority } = filters;

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, offset: 0 }));
  }, []);

  const handlePrevPage = useCallback(() => {
    setFilters((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  }, []);

  const handleNextPage = useCallback(() => {
    setFilters((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
  }, []);

  return (
    <main className="page stories-page">
      <div className="page-container">
        <div className="page-header">
          <h1>All Stories</h1>
        </div>

        <div className="stories-filters">
          <select
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
          >
            <option value="">All States</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="complete">Complete</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {loading && <p className="loading">Loading stories...</p>}
        {error && <p className="error">{error}</p>}

        <div className="stories-table">
          {loading && <p className="loading">Loading stories...</p>}
          {error && <p className="error-message">{error}</p>}
          
          {!loading && stories.length === 0 && <p className="empty-state">No stories found</p>}
          
          {!loading && stories.length > 0 && (
            <table className="stories-list-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id} className="story-row">
                    <td className="story-title">{story.title}</td>
                    <td className="story-description">{story.description}</td>
                    <td className="story-priority">
                      <span className={`badge priority-${story.priority}`}>{story.priority}</span>
                    </td>
                    <td className="story-state">
                      <span className={`badge state-${story.state}`}>{story.state.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="story-action">
                      <a href={`/stories/${story.id}`} className="btn-link">
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pagination">
          <button onClick={handlePrevPage} disabled={filters.offset === 0}>
            ← Previous
          </button>
          <span className="page-indicator">
            Page {filters.offset / filters.limit + 1} of {Math.ceil(total / filters.limit)}
          </span>
          <button onClick={handleNextPage} disabled={filters.offset + filters.limit >= total}>
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}
