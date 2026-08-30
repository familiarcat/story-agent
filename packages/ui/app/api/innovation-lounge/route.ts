import { getRecentObservationMemories } from '@/lib/db';

/**
 * Innovation Lounge sessions — read-only feed of the crew's creative jams.
 * The engine stores each session to observation memory under storyId 'innovation-lounge'
 * (see packages/mcp-server/src/lib/innovation-lounge.ts), so we fetch by that storyId.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  try {
    const sessions = await getRecentObservationMemories(limit, 'innovation-lounge');
    return Response.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching Innovation Lounge sessions:', error);
    return Response.json({ error: 'Failed to fetch Innovation Lounge sessions' }, { status: 500 });
  }
}
