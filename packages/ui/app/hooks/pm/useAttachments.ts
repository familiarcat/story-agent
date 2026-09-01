/**
 * useAttachments Hook
 * Fetches attachments for a story.
 */

import { useState, useEffect } from 'react';
import { PMStoryAttachment, ListResponse } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

interface UseAttachmentsOptions {
  offset?: number;
  limit?: number;
}

interface UseAttachmentsResult {
  attachments: PMStoryAttachment[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAttachments(
  storyId: UUID,
  options: UseAttachmentsOptions = {}
): UseAttachmentsResult {
  const [attachments, setAttachments] = useState<PMStoryAttachment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('story_id', storyId);
      params.append('offset', String(options.offset || 0));
      params.append('limit', String(options.limit || 50));

      const response = await fetch(`/api/pm/attachments?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attachments');

      const data = await response.json() as {
        success: boolean;
        data: ListResponse<PMStoryAttachment>;
      };
      if (!data.success) throw new Error(data as any);

      setAttachments(data.data.items);
      setTotal(data.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useAttachments error:', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [storyId, options.offset, options.limit]);

  return { attachments, total, loading, error, refetch };
}
