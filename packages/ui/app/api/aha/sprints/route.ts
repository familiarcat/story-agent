import { NextResponse } from 'next/server';
import { listAhaSprints } from '@/lib/aha';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId query parameter required' }, { status: 400 });
    }
    const sprints = await listAhaSprints(projectId);
    return NextResponse.json(sprints);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to list sprints',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
