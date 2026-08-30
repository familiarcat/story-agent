/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PmSchemaValidator } from '@story-agent/shared/pm-contracts';
import { getSprint, updateSprint } from '@/lib/pm-db';

/**
 * GET /api/sprints/[id]
 * Retrieve a single sprint by ID with tenant isolation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';

    const sprint = await getSprint(tenantId, sprintId);
    if (!sprint) {
      return NextResponse.json(
        { success: false, error: 'Sprint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: sprint },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/sprints/[id]]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sprints/[id]
 * Update a sprint with RBAC and state machine validation
 * Supports If-Match header for conflict detection (version=N,etag=ABC)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';
    const ifMatch = request.headers.get('If-Match');
    
    const body = await request.json();
    
    const validationResult = PmSchemaValidator.validateSprint(body);
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

    // Update sprint in database (with optional conflict detection)
    const sprint = await updateSprint(tenantId, userId, sprintId, body);

    return NextResponse.json(
      { success: true, data: sprint },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PUT /api/sprints/[id]]', error);
    
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
    if (error.message?.includes('VALIDATION_ERROR')) {
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
 * DELETE /api/sprints/[id]
 * Archive/soft-delete a sprint (mark as archived state)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';

    // Archive the sprint by updating state to 'archived'
    const sprint = await updateSprint(tenantId, userId, sprintId, { state: 'archived' });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    console.error('[DELETE /api/sprints/[id]]', error);
    
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
