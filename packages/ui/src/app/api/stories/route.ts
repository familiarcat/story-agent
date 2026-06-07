import { listStories, getCommentsForStory } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildClientAccessContext,
  evaluateControlledDataAccess,
  inferClientIdFromStory,
  redactControlledStoryFields,
} from '@story-agent/shared';

export async function GET(request: NextRequest) {
  const stories = await listStories();
  const searchParams = request.nextUrl.searchParams;
  const requestedClientId = (searchParams.get('clientId') ?? '').trim().toLowerCase() || null;
  const projectId = (searchParams.get('projectId') ?? '').trim();
  const includeControlled = searchParams.get('includeControlled') === 'true';

  const context = buildClientAccessContext({
    selectedClientId: request.headers.get('x-client-id'),
    clientRole: request.headers.get('x-client-role'),
    purpose: request.headers.get('x-controlled-data-purpose'),
    includeControlled,
  });

  const decision = evaluateControlledDataAccess({
    context,
    requestedClientId,
  });

  const filtered = stories.filter(story => {
    if (projectId && story.projectId !== projectId) return false;
    if (!requestedClientId) return true;
    return inferClientIdFromStory(story) === requestedClientId;
  });

  const enriched = await Promise.all(
    filtered.map(async s => {
      const visible = decision.allowed ? s : redactControlledStoryFields(s);
      return {
        ...visible,
        openCommentCount: (await getCommentsForStory(s.storyId)).filter(c => c.state === 'SUBMITTED').length,
      };
    })
  );

  process.stderr.write(`[CLIENT_SCOPE] /api/stories ${decision.audit.outcome} (${decision.reason})\n`);

  return NextResponse.json({
    stories: enriched,
    policy: {
      controlledDataAccess: decision.mode,
      reason: decision.reason,
      audit: decision.audit,
    },
  });
}
