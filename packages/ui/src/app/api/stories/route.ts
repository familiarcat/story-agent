import { listStories, getCommentsForStory } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const stories = await listStories();
  const enriched = await Promise.all(
    stories.map(async s => ({
      ...s,
      openCommentCount: (await getCommentsForStory(s.storyId)).filter(c => c.state === 'SUBMITTED').length,
    }))
  );
  return NextResponse.json(enriched);
}
