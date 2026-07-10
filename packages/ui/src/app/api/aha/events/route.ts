import { NextResponse } from 'next/server';
import { listAhaEventsSince } from '@story-agent/shared/aha-events';

export const dynamic = 'force-dynamic';

/**
 * Cross-surface Aha sync poll (crew ruling AHA-SYNC-TIERS, RAG afa2fbb9).
 * GET /api/aha/events?since=<ISO> → { events, now }. Pass the returned `now` as the next `since`;
 * omit `since` on the first call to start from the present. Polls Supabase, never Aha itself.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const since = new URL(request.url).searchParams.get('since');
  try {
    const result = await listAhaEventsSince(since);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'events_unavailable', details: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
