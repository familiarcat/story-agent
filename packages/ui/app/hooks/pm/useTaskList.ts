/**
 * useTaskList Hook
 * Fetches tasks for a story with optional state filter.
 */

import { useState, useEffect } from 'react';
import { PMTask, ListResponse } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseTaskListOptions {
  state?: string;
  offset?: number;
  limit?: number;
}

interface UseTaskListResult {
  tasks: PMTask[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useTaskList(storyId: UUID, options: UseTaskListOptions = {}): UseTaskListResult {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append('story_id', storyId);
    if (options.state) params.append('state', options.state);
    params.append('offset', String(options.offset || 0));
    params.append('limit', String(options.limit || 50));

    fetch(`/api/pm/tasks?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTasks(data.data.items);
          setTotal(data.data.total);
        } else {
          setError(data.error);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [storyId, options.state, options.offset, options.limit]);

  return { tasks, total, loading, error };
}
