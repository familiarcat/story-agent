/**
 * API Route: POST /api/pm/stories
 * API Route: GET /api/pm/stories
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { CreateStorySchema, ListStoriesFilterSchema } from '@story-agent/shared/pm-validation';

const DEFAULT_CLIENT_ID = process.env.STORY_AGENT_CLIENT_ID || 'client-int';
const DEFAULT_USER_ID = process.env.STORY_AGENT_USER_ID || 'system-user-1';

/**
 * POST /api/pm/stories - Create story
 */
export async function POST(request: NextRequest) {
  try {

    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing project_id', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateStorySchema.safeParse(body);

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

    // Create story
    const story = await PMClient.createStory(
      projectId as any,
      validation.data as any,
      DEFAULT_USER_ID as any
    );

    return NextResponse.json(
      { success: true, data: story },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/pm/stories error:', error);
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
 * GET /api/pm/stories - List stories for a project
 */
export async function GET(request: NextRequest) {
  try {

    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing project_id', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Build filter options
    const filterOptions: any = {
      offset: parseInt(searchParams.get('offset') ?? '0'),
      limit: Math.min(parseInt(searchParams.get('limit') ?? '20'), 100),
      sprint_id: searchParams.get('sprint_id') || undefined,
      state: searchParams.get('state') || undefined,
      assignee_id: searchParams.get('assignee_id') || undefined,
      priority: searchParams.get('priority') || undefined,
      is_blocked: searchParams.get('is_blocked') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Validate filter options
    const validation = ListStoriesFilterSchema.safeParse(filterOptions);

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

    // List stories
    const stories = await PMClient.listStories(
      projectId as any,
      validation.data
    );

    return NextResponse.json(
      { success: true, data: stories },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/stories error:', error);
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
