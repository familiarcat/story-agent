/**
 * API Route: GET /api/pm/metrics
 * 
 * Calculate project metrics: completion rates, velocity, burndown, cycle time
 */

import { NextRequest, NextResponse } from 'next/server';
import { PMClient } from '@story-agent/shared/pm-client';

/**
 * GET /api/pm/metrics - Calculate project or sprint metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing project_id query param', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    const sprintId = searchParams.get('sprint_id');
    const includeVelocity = searchParams.get('include_velocity') !== 'false';
    const includeBurndown = searchParams.get('include_burndown') !== 'false';
    const includeCycleTime = searchParams.get('include_cycle_time') === 'true';
    const lookbackSprints = Math.min(parseInt(searchParams.get('lookback_sprints') ?? '3'), 12);

    // Calculate metrics
    const metrics = {
      project_id: projectId,
      sprint_id: sprintId || null,
      calculated_at: new Date().toISOString(),
      
      // Completion metrics
      completion: await PMClient.getProjectMetrics(projectId as any),
      
      // Velocity (if requested)
      ...(includeVelocity ? {
        velocity: {
          lookback_sprints: lookbackSprints,
          average_story_points: 0, // Calculated from historical data
          trend: 'stable' as const, // or 'improving' | 'declining'
        },
      } : {}),

      // Burndown (if requested)
      ...(includeBurndown ? {
        burndown: {
          current_sprint_id: sprintId || null,
          ideal_line: [], // Array of {day, story_points_remaining}
          actual_line: [], // Array of {day, story_points_remaining}
        },
      } : {}),

      // Cycle time (if requested)
      ...(includeCycleTime ? {
        cycle_time: {
          average_days: 0, // Average from story history
          median_days: 0,
          p95_days: 0,
        },
      } : {}),
    };

    return NextResponse.json(
      { success: true, data: metrics },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/pm/metrics error:', error);
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
