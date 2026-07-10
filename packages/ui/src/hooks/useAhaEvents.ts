'use client';

import { useEffect, useRef } from 'react';

/**
 * Minimal local mirror of @story-agent/shared AhaEventRecord — deliberately NOT imported from
 * shared so this client hook stays dependency-free (aha-events.ts pulls in supabase-js).
 */
export interface AhaEventLike {
  id: string;
  resourceType: string;
  resourceId: string;
  operation: string;
  actor: string;
  meta: Record<string, string | undefined>;
  createdAt: string;
}

export interface UseAhaEventsOptions {
  intervalMs?: number;
  resourceTypes?: string[];
}

/**
 * Cross-surface sync poll (crew ruling AHA-SYNC-TIERS): polls /api/aha/events using the server's
 * `now` as the next `since` cursor, so pages refetch when ANOTHER surface (MCP crew, extension)
 * changed something in Aha. Fetch errors are ignored — sync lag, not fatal.
 */
export function useAhaEvents(
  onEvents: (events: AhaEventLike[]) => void,
  { intervalMs = 15000, resourceTypes }: UseAhaEventsOptions = {},
): void {
  const sinceRef = useRef<string | null>(null);
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;
  const typesKey = resourceTypes ? resourceTypes.join(',') : null;

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : '';
        const res = await fetch(`/api/aha/events${qs}`);
        if (!res.ok) return;
        const data = await res.json() as { events?: AhaEventLike[]; now?: string };
        if (cancelled) return;
        if (data.now) sinceRef.current = data.now;
        const types = typesKey ? typesKey.split(',') : null;
        const events = (data.events ?? []).filter(e => !types || types.includes(e.resourceType));
        if (events.length > 0) onEventsRef.current(events);
      } catch {
        /* sync lag, not fatal */
      }
    };

    void poll();
    const timer = setInterval(() => { void poll(); }, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs, typesKey]);
}
