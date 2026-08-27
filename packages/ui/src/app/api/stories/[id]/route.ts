/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PmSchemaValidator } from '@story-agent/shared/pm-contracts';
import { getStory, updateStory } from '@/lib/pm-db';

/**
 * GET /api/stories/[id]
 * Retrieve a single story by ID with tenant isolation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';

    const story = await getStory(tenantId, storyId);
    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: story },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/stories/[id]]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stories/[id]
 * Update a story with RBAC and state machine validation
 * Supports If-Match header for conflict detection (version=N,etag=ABC)
 * Supports blocked_by array for dependency tracking
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';
    const ifMatch = request.headers.get('If-Match');
    
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

    const story = await updateStory(tenantId, userId, storyId, body);

    return NextResponse.json(
      { success: true, data: story },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PUT /api/stories/[id]]', error);
    
    if (error.message?.includes('CONFLICT')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    
    if (error.message?.includes('NOT_FOUND')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    if (error.message?.includes('RBAC_DENIED')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    if (error.message?.includes('VALIDATION_ERROR') || error.message?.includes('Cyclical dependency')) {
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

/**
 * DELETE /api/stories/[id]
 * Archive/soft-delete a story
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';

    const story = await updateStory(tenantId, userId, storyId, { state: 'archived' });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    console.error('[DELETE /api/stories/[id]]', error);
    
    if (error.message?.includes('NOT_FOUND')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    if (error.message?.includes('RBAC_DENIED')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
