'use client';

import { useState, useCallback } from 'react';
import { useStoryList } from '../hooks/pm';

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

  const { stories, total, loading, error } = useStoryList(filters);

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
          {/* TODO: Render stories table */}
          {stories.length === 0 && !loading && <p className="empty-state">No stories found</p>}
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
