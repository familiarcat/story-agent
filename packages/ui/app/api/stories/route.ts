/* eslint-disable @typescript-eslint/no-explicit-any */
import { listStories, getCommentsForStory } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildClientAccessContext,
  evaluateControlledDataAccess,
  inferClientIdFromStory,
  redactControlledStoryFields,
  PmSchemaValidator,
} from '@story-agent/shared';
import { createStory } from '@/lib/pm-db';

/**
 * POST /api/stories
 * Create a new story in a sprint with validation and tenant isolation
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';

    const body = await request.json();
    const validationResult = PmSchemaValidator.validateStory(body);

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Create story in database
    const story = await createStory(tenantId, userId, body);

    return NextResponse.json(
      { success: true, data: story },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/stories]', error);
    
    if (error.message?.includes('RBAC_DENIED')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    if (error.message?.includes('VALIDATION_ERROR') || error.message?.includes('NOT_FOUND')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
