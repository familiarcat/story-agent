import { getCrewPersonalMemories, searchCrewPersonalMemories, getCrewMemoryStats } from '@story-agent/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crew = searchParams.get('crew');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!crew) {
    return Response.json({ error: 'crew parameter required' }, { status: 400 });
  }

  try {
    const memories = await getCrewPersonalMemories(crew, limit, false);
    return Response.json({ success: true, memories });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return Response.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}
