/**
 * useProjectMetrics Hook
 * Fetches project metrics (completion, velocity, burndown, cycle time).
 */

import { useState, useEffect } from 'react';

/** UUID type alias */
type UUID = string;

interface ProjectMetrics {
  project_id: UUID;
  sprint_id: UUID | null;
  calculated_at: string;
  completion: {
    total_stories: number;
    completed_stories: number;
    completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
  };
}

interface UseProjectMetricsResult {
  metrics: ProjectMetrics | null;
  loading: boolean;
  error: string | null;
}

export function useProjectMetrics(projectId: UUID): UseProjectMetricsResult {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(
      `/api/pm/metrics?project_id=${projectId}&include_velocity=true&include_burndown=true`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMetrics(data.data);
        } else {
          setError(data.error);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return { metrics, loading, error };
}
