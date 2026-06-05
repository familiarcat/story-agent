import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getStory } from '@/lib/agile';
import { upsertStory } from '@/lib/db';

type ImportPayload = {
  referenceNum: string;
  repoFullName: string;
  baseBranch?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ImportPayload>;

    if (!body.referenceNum || !body.repoFullName) {
      return NextResponse.json({ error: 'referenceNum and repoFullName are required' }, { status: 400 });
    }

    const agileStory = await getStory(body.referenceNum);
    await upsertStory({
      id: randomUUID(),
      storyId: agileStory.referenceNum,
      storyTitle: agileStory.name,
      storyUrl: agileStory.url,
      repoFullName: body.repoFullName,
      branch: 'UNASSIGNED',
      baseBranch: body.baseBranch ?? 'dev',
      status: 'pending',
      prNumber: null,
      prUrl: null,
      prStatus: null,
      phase: 1,
      notes: `Imported from agile provider (${agileStory.workflowStatus})`,
    });

    return NextResponse.json({
      imported: true,
      storyId: agileStory.referenceNum,
      title: agileStory.name,
      storyUrl: agileStory.url,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to import story from Aha',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
