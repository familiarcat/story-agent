/**
 * API Route: POST /api/pm/tasks
 * API Route: GET /api/pm/tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { CreateTaskSchema, ListTasksFilterSchema } from '@story-agent/shared/pm-validation';

const DEFAULT_CLIENT_ID = process.env.STORY_AGENT_CLIENT_ID || 'client-int';
const DEFAULT_USER_ID = process.env.STORY_AGENT_USER_ID || 'system-user-1';

/**
 * POST /api/pm/tasks - Create task
 */
export async function POST(request: NextRequest) {
  try {

    // Get storyId from query params
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Missing story_id', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateTaskSchema.safeParse(body);

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

    // Create task
    const task = await PMClient.createTask(
      storyId as any,
      validation.data as any,
      DEFAULT_USER_ID as any
    );

    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/pm/tasks error:', error);
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
 * GET /api/pm/tasks - List tasks for a story
 */
export async function GET(request: NextRequest) {
  try {

    // Get storyId from query params
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Missing story_id', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Build filter options
    const filterOptions: any = {
      offset: parseInt(searchParams.get('offset') ?? '0'),
      limit: Math.min(parseInt(searchParams.get('limit') ?? '20'), 100),
      state: searchParams.get('state') || undefined,
      assigneeId: searchParams.get('assignee_id') || undefined,
      isBlocked: searchParams.get('is_blocked') === 'true' ? true : undefined,
    };

    // Validate filter options
    const validation = ListTasksFilterSchema.safeParse(filterOptions);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter options',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    // List tasks
    const tasks = await PMClient.listTasks(
      storyId as any,
      validation.data
    );

    return NextResponse.json(
      { success: true, data: tasks },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/tasks error:', error);
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
