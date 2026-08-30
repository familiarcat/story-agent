import { NextResponse } from 'next/server';
import { getAhaStory } from '@/lib/aha';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 });
    }

    const story = await getAhaStory(reference);
    return NextResponse.json(story);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch Aha story',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
