import { getCrewMemoryStats } from '@story-agent/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crew = searchParams.get('crew');

  if (!crew) {
    return Response.json({ error: 'crew parameter required' }, { status: 400 });
  }

  try {
    const stats = await getCrewMemoryStats(crew);
    return Response.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching memory stats:', error);
    return Response.json({ error: 'Failed to fetch memory stats' }, { status: 500 });
  }
}
