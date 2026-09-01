/**
 * useSprintList Hook
 * 
 * Fetches sprints for a project.
 * Returns: { sprints, loading, error }
 */

import { useState, useEffect } from 'react';
import { PMSprint } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseSprintListResult {
  sprints: PMSprint[];
  loading: boolean;
  error: string | null;
}

export function useSprintList(projectId: UUID): UseSprintListResult {
  const [sprints, setSprints] = useState<PMSprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/pm/sprints?project_id=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSprints(data.data.items);
        } else {
          setError(data.error);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return { sprints, loading, error };
}
