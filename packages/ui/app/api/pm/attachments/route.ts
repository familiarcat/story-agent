/**
 * API Route: POST /api/pm/attachments
 * API Route: GET /api/pm/attachments
 * 
 * Manage story attachments (files, links, documents)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';

const DEFAULT_USER_ID = process.env.STORY_AGENT_USER_ID || 'system-user-1';

/**
 * POST /api/pm/attachments - Add attachment to story
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
    if (!body.file_name) {
      return NextResponse.json(
        { success: false, error: 'Missing file_name', code: 'MISSING_FIELD' },
        { status: 400 }
      );
    }
    if (!body.file_url) {
      return NextResponse.json(
        { success: false, error: 'Missing file_url', code: 'MISSING_FIELD' },
        { status: 400 }
      );
    }

    // Add attachment
    const attachment = await PMClient.addAttachment(
      body.story_id as any,
      {
        name: body.file_name,
        url: body.file_url,
        type: body.attachment_type || 'file',
      } as any,
      DEFAULT_USER_ID as any
    );

    return NextResponse.json(
      { success: true, data: attachment },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/pm/attachments error:', error);
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
 * GET /api/pm/attachments - List attachments for a story
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500);

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Missing story_id query param', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // List attachments
    const attachments = await PMClient.listAttachments(
      storyId as any,
      { offset, limit }
    );

    return NextResponse.json(
      { success: true, data: attachments },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/attachments error:', error);
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
