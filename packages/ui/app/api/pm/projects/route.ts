/**
 * API Route: POST /api/pm/projects
 * Create a new project
 * 
 * Note: Phase 1 uses environment-based client context.
 * Future: Will integrate with Clerk for user authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';
import { CreateProjectSchema } from '@story-agent/shared/pm-validation';

// Phase 1: Use hardcoded client/user IDs (from environment)
const DEFAULT_CLIENT_ID = process.env.STORY_AGENT_CLIENT_ID || 'client-int';
const DEFAULT_USER_ID = process.env.STORY_AGENT_USER_ID || 'system-user-1';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = CreateProjectSchema.safeParse(body);

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

    // Create project
    const project = await PMClient.createProject(
      DEFAULT_CLIENT_ID as any,
      validation.data as any,
      DEFAULT_USER_ID as any
    );

    return NextResponse.json(
      { success: true, data: project },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/pm/projects error:', error);
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
 * API Route: GET /api/pm/projects
 * List projects for the authenticated user's client
 */

export async function GET(request: NextRequest) {
  try {
    // Parse pagination and client from query params
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id') || DEFAULT_CLIENT_ID;
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

    // List projects
    const projects = await PMClient.listProjects(
      clientId as any,
      { offset, limit }
    );

    return NextResponse.json(
      { success: true, data: projects },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/projects error:', error);
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
