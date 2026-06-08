import { getCrewMemoriesByProject } from '@story-agent/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crew = searchParams.get('crew');
  const project = searchParams.get('project');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!crew || !project) {
    return Response.json({ error: 'crew and project parameters required' }, { status: 400 });
  }

  try {
    const memories = await getCrewMemoriesByProject(crew, project, limit);
    return Response.json({ success: true, memories });
  } catch (error) {
    console.error('Error fetching project memories:', error);
    return Response.json({ error: 'Failed to fetch project memories' }, { status: 500 });
  }
}
