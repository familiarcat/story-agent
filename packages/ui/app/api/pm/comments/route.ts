/**
 * API Route: POST /api/pm/comments
 * API Route: GET /api/pm/comments
 * 
 * Manage story comments (discussions, feedback, notes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';

const DEFAULT_USER_ID = process.env.STORY_AGENT_USER_ID || 'system-user-1';

/**
 * POST /api/pm/comments - Add comment to story
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.story_id) {
      return NextResponse.json(
        { success: false, error: 'Missing story_id', code: 'MISSING_FIELD' },
        { status: 400 }
      );
    }
    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'Missing content', code: 'MISSING_FIELD' },
        { status: 400 }
      );
    }

    // Add comment
    const comment = await PMClient.addComment(
      body.story_id as any,
      body.content,
      DEFAULT_USER_ID as any,
      body.parent_comment_id || null
    );

    return NextResponse.json(
      { success: true, data: comment },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/pm/comments error:', error);
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
 * GET /api/pm/comments - List comments for a story
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500);
    const threadOnly = searchParams.get('thread_only') === 'true'; // top-level only if true

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Missing story_id query param', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // List comments
    const comments = await PMClient.listComments(
      storyId as any,
      { offset, limit, threadOnly }
    );

    return NextResponse.json(
      { success: true, data: comments },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/comments error:', error);
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
