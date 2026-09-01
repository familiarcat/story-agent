/**
 * useStoryList Hook
 * Fetches stories with optional sprint/state/priority filters.
 */

import { useState, useEffect } from 'react';
import { PMStory, ListResponse } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseStoryListOptions {
  sprintId?: UUID;
  state?: string;
  priority?: string;
  offset?: number;
  limit?: number;
}

interface UseStoryListResult {
  stories: PMStory[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useStoryList(options: UseStoryListOptions = {}): UseStoryListResult {
  const [stories, setStories] = useState<PMStory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (options.sprintId) params.append('sprint_id', options.sprintId);
    if (options.state) params.append('state', options.state);
    if (options.priority) params.append('priority', options.priority);
    params.append('offset', String(options.offset || 0));
    params.append('limit', String(options.limit || 50));

    fetch(`/api/pm/stories?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStories(data.data.items);
          setTotal(data.data.total);
        } else {
          setError(data.error);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [options.sprintId, options.state, options.priority, options.offset, options.limit]);

  return { stories, total, loading, error };
}
