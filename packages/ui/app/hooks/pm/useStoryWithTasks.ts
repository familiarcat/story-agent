/**
 * useStoryWithTasks Hook
 * Fetches full story details including tasks, comments, attachments.
 */

import { useState, useEffect } from 'react';
import { PMStory } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseStoryWithTasksResult {
  story: PMStory | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStoryWithTasks(storyId: UUID): UseStoryWithTasksResult {
  const [story, setStory] = useState<PMStory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pm/stories/${storyId}`);
      if (!response.ok) throw new Error('Failed to fetch story');

      const data = await response.json() as { success: boolean; data: PMStory };
      if (!data.success) throw new Error(data as any);

      setStory(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useStoryWithTasks error:', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [storyId]);

  return { story, loading, error, refetch };
}
