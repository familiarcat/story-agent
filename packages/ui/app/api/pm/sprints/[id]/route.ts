/**
 * API Route: GET /api/pm/sprints/[id]
 * API Route: PUT /api/pm/sprints/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { UpdateSprintSchema } from '@story-agent/shared/pm-validation';

interface Params {
  id: string;
}

/**
 * GET /api/pm/sprints/[id] - Get sprint with stories
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    const sprint = await PMClient.getSprintWithStories(id as any);

    if (!sprint) {
      return NextResponse.json(
        { success: false, error: 'Sprint not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: sprint },
      { status: 200 }
    );
  } catch (error) {
    console.error(`GET /api/pm/sprints/${id} error:`, error);
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
 * PUT /api/pm/sprints/[id] - Update sprint
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateSprintSchema.safeParse(body);

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

    const sprint = await PMClient.updateSprint(
      id as any,
      validation.data
    );

    return NextResponse.json(
      { success: true, data: sprint },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PUT /api/pm/sprints/${id} error:`, error);
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
