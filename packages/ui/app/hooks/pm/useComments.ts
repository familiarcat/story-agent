/**
 * useComments Hook
 * Fetches comments for a story.
 */

import { useState, useEffect } from 'react';
import { PMStoryComment, ListResponse } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseCommentsOptions {
  threadOnly?: boolean;
  offset?: number;
  limit?: number;
}

interface UseCommentsResult {
  comments: PMStoryComment[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useComments(storyId: UUID, options: UseCommentsOptions = {}): UseCommentsResult {
  const [comments, setComments] = useState<PMStoryComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('story_id', storyId);
      if (options.threadOnly) params.append('threadOnly', 'true');
      params.append('offset', String(options.offset || 0));
      params.append('limit', String(options.limit || 50));

      const response = await fetch(`/api/pm/comments?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json() as { success: boolean; data: ListResponse<PMStoryComment> };
      if (!data.success) throw new Error(data as any);

      setComments(data.data.items);
      setTotal(data.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useComments error:', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [storyId, options.threadOnly, options.offset, options.limit]);

  return { comments, total, loading, error, refetch };
}
