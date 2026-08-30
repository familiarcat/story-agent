import { NextResponse } from 'next/server';
import { listAhaProjects } from '@/lib/aha';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') ?? '1');
    const projects = await listAhaProjects(page);
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to list Aha projects',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
