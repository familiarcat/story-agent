/**
 * API Route: GET /api/pm/audit-log
 * 
 * Query audit trail for entities (projects, sprints, stories, tasks)
 * Shows all changes with before/after state, timestamps, and user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';

/**
 * GET /api/pm/audit-log - Query audit trail
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entity_id');
    const entityType = searchParams.get('entity_type') || 'story';
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: 'Missing entity_id query param', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // List audit logs for specific entity
    const auditLogs = await PMClient.listAuditLogs(
      entityType,
      entityId as any,
      { offset, limit }
    );

    return NextResponse.json(
      { success: true, data: auditLogs },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/audit-log error:', error);
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
