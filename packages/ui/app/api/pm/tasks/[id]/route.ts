/**
 * API Route: GET /api/pm/tasks/[id]
 * API Route: PUT /api/pm/tasks/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { UpdateTaskSchema } from '@story-agent/shared/pm-validation';

interface Params {
  id: string;
}

/**
 * GET /api/pm/tasks/[id] - Get task details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    const task = await PMClient.getTask(id as any);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: task },
      { status: 200 }
    );
  } catch (error) {
    console.error(`GET /api/pm/tasks/${id} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pm/tasks/[id] - Update task
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Check if this is a state transition
    if (validation.data.state) {
      const task = await PMClient.changeTaskState(
        id as any,
        validation.data.state
      );

      return NextResponse.json(
        { success: true, data: task },
        { status: 200 }
      );
    }

    const task = await PMClient.updateTask(id as any, validation.data as any);

    return NextResponse.json(
      { success: true, data: task },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PUT /api/pm/tasks/${id} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
