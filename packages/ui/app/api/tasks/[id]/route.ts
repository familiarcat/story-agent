/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PmSchemaValidator } from '@story-agent/shared/pm-contracts';
import { getTask, updateTask } from '@/lib/pm-db';

/**
 * GET /api/tasks/[id]
 * Retrieve a single task by ID with tenant isolation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';

    const task = await getTask(tenantId, taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: task },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/tasks/[id]]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a task with RBAC and state machine validation
 * Supports If-Match header for conflict detection (version=N,etag=ABC)
 * Supports blocked_by array for dependency tracking with cycle detection
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';
    const ifMatch = request.headers.get('If-Match');
    
    const body = await request.json();
    
    const validationResult = PmSchemaValidator.validateTask(body);
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

    const task = await updateTask(tenantId, userId, taskId, body);

    return NextResponse.json(
      { success: true, data: task },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PUT /api/tasks/[id]]', error);
    
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
 * DELETE /api/tasks/[id]
 * Archive/soft-delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';

    const task = await updateTask(tenantId, userId, taskId, { state: 'archived' });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    console.error('[DELETE /api/tasks/[id]]', error);
    
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
