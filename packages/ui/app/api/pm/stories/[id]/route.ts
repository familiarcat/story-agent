/**
 * API Route: GET /api/pm/stories/[id]
 * API Route: PUT /api/pm/stories/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { UpdateStorySchema, StateChangeSchema } from '@story-agent/shared/pm-validation';

interface Params {
  id: string;
}

/**
 * GET /api/pm/stories/[id] - Get story with tasks, comments, and attachments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    const story = await PMClient.getStoryWithTasks(id as any);

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: story },
      { status: 200 }
    );
  } catch (error) {
    console.error(`GET /api/pm/stories/${id} error:`, error);
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
 * PUT /api/pm/stories/[id] - Update story
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {

    // Parse and validate request body
    const body = await request.json();

    // Check if this is a state change request
    if (body.state && Object.keys(body).length <= 2 && (body.reason || body.state)) {
      // State change request
      const stateValidation = StateChangeSchema.safeParse(body);

      if (!stateValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: stateValidation.error.flatten(),
          },
          { status: 400 }
        );
      }

      const story = await PMClient.changeStoryState(
        id as any,
        stateValidation.data.state,
        stateValidation.data.reason
      );

      return NextResponse.json(
        { success: true, data: story },
        { status: 200 }
      );
    } else {
      // Regular update request
      const validation = UpdateStorySchema.safeParse(body);

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

      const story = await PMClient.updateStory(
        id as any,
        validation.data as any
      );

      return NextResponse.json(
        { success: true, data: story },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error(`PUT /api/pm/stories/${id} error:`, error);
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
