/**
 * API Route: POST /api/pm/sprints
 * API Route: GET /api/pm/sprints
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { CreateSprintSchema } from '@story-agent/shared/pm-validation';

const DEFAULT_CLIENT_ID = process.env.STORY_AGENT_CLIENT_ID || 'client-int';
const DEFAULT_USER_ID = process.env.STORY_AGENT_USER_ID || 'system-user-1';

/**
 * POST /api/pm/sprints - Create sprint
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
    const validation = CreateSprintSchema.safeParse(body);

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

    // Create sprint
    const sprint = await PMClient.createSprint(
      projectId as any,
      validation.data as any,
      DEFAULT_USER_ID as any
    );

    return NextResponse.json(
      { success: true, data: sprint },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/pm/sprints error:', error);
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
 * GET /api/pm/sprints - List sprints for a project
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

    // Parse pagination
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

    // List sprints
    const sprints = await PMClient.listSprints(
      projectId as any,
      { offset, limit }
    );

    return NextResponse.json(
      { success: true, data: sprints },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/sprints error:', error);
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
