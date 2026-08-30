/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PmSchemaValidator } from '@story-agent/shared/pm-contracts';
import { createTask } from '@/lib/pm-db';

/**
 * POST /api/tasks
 * Create a new task in a story with validation and tenant isolation
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const userId = request.headers.get('x-user-id') ?? 'anonymous-user';

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

    // Create task in database
    const task = await createTask(tenantId, userId, body);

    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/tasks]', error);
    
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

/**
 * GET /api/tasks
 * List all tasks for authenticated user's tenant with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? 'default-tenant';
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const storyId = searchParams.get('storyId'); // filter by story
    const state = searchParams.get('state'); // optional filter

    // TODO: Implement task retrieval logic with tenant isolation
    // 1. Extract tenant_id from request headers
    // 2. Query sa_pm_tasks WHERE tenant_id = ?
    // 3. Apply filters: If storyId provided, add AND story_id = ?; if state provided, add AND state = ?
    // 4. Apply pagination (LIMIT limit OFFSET offset)
    // 5. Return array of tasks with total count
    
    return NextResponse.json(
      {
        success: true,
        data: [],
        pagination: { limit, offset, total: 0 },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
