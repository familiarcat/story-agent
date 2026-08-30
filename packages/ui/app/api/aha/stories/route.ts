import { NextResponse } from 'next/server';
import { listAhaStoriesForProject } from '@/lib/aha';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = Number(searchParams.get('page') ?? '1');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const stories = await listAhaStoriesForProject(projectId, page);
    return NextResponse.json(stories);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to list Aha stories',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
