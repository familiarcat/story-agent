import { NextResponse } from 'next/server';
import { getAhaSprintStories } from '@/lib/aha';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get('releaseId');
    if (!releaseId) {
      return NextResponse.json({ error: 'releaseId query parameter required' }, { status: 400 });
    }
    const stories = await getAhaSprintStories(releaseId);
    const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
    return NextResponse.json({ stories, totalPoints });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get sprint stories',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
