import { NextResponse } from 'next/server';
import { getProjectRoadmap } from '@/lib/aha';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId query parameter required' }, { status: 400 });
    }
    const roadmap = await getProjectRoadmap(projectId);
    return NextResponse.json(roadmap);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch project roadmap',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
