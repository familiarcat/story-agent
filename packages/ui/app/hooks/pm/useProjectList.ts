/**
 * useProjectList Hook
 * 
 * Fetches paginated list of projects for the current client.
 * Returns: { projects, total, offset, limit, loading, error, refetch }
 */

import { useState, useEffect, useCallback } from 'react';
import { PMProject, ListResponse } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseProjectListOptions {
  offset?: number;
  limit?: number;
}

interface UseProjectListResult {
  projects: PMProject[];
  total: number;
  offset: number;
  limit: number;
  loading: boolean;
  error: string | null;
  refetch: (offset: number) => Promise<void>;
}

export function useProjectList(
  clientId: UUID,
  options: UseProjectListOptions = {}
): UseProjectListResult {
  const [projects, setProjects] = useState<PMProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { offset = 0, limit = 20 } = options;

  const fetchProjects = useCallback(
    async (off: number) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/pm/projects?client_id=${clientId}&offset=${off}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch projects');

        const data = await response.json() as { success: boolean; data: ListResponse<PMProject> };
        if (!data.success) throw new Error(data as any);

        setProjects(data.data.items);
        setTotal(data.data.total);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('useProjectList error:', message);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchProjects(offset);
  }, [offset, fetchProjects]);

  return { projects, total, offset, limit, loading, error, refetch: fetchProjects };
}
