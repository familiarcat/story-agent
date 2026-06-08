import { searchCrewPersonalMemoriesByEmbedding, toEmbedding } from '@story-agent/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crew = searchParams.get('crew');
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') || '10');
  const threshold = parseFloat(searchParams.get('threshold') || '0.7');

  if (!crew || !query) {
    return Response.json({ error: 'crew and query parameters required' }, { status: 400 });
  }

  try {
    const embedding = await toEmbedding(query);
    const memories = await searchCrewPersonalMemoriesByEmbedding(crew, embedding, limit, threshold);
    return Response.json({ success: true, memories });
  } catch (error) {
    console.error('Error searching memories by embedding:', error);
    return Response.json({ error: 'Failed to search memories' }, { status: 500 });
  }
}
