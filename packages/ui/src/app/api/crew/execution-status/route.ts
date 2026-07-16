/**
 * API Route: /api/crew/execution-status
 * GET: Returns real-time crew execution outcomes + live task status
 *
 * Used by VSCode chat + dashboard for status display/polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentCrewExecutionOutcomes,
  getCrewExecutionStats,
} from '@story-agent/shared';

export const dynamic = 'force-dynamic'; // Always fresh, never cached

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const crewId = searchParams.get('crewId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Fetch recent outcomes
    const recentOutcomes = await getRecentCrewExecutionOutcomes(limit, crewId);

    // Fetch aggregate stats
    const stats = await getCrewExecutionStats();

    // Parse outcomes into display format
    const activeTasks = recentOutcomes
      .filter((o: { status: string }) => o.status === 'retry' || o.status === 'blocked')
      .map((o: { crew_id: string; task_description: string; status: string; timestamp: string }) => ({
        crew_id: o.crew_id,
        task: o.task_description,
        status: o.status,
        elapsed_seconds: Math.round(
          (Date.now() - new Date(o.timestamp).getTime()) / 1000
        ),
        progress_step: o.status === 'retry' ? 2 : 1,
      }));

    const completedTasks = recentOutcomes
      .filter((o: { status: string }) => o.status === 'success' || o.status === 'failed')
      .slice(0, 10)
      .map((o: { crew_id: string; task_description: string; status: string; duration_seconds?: number; confidence_level?: string; error_message?: string }) => ({
        crew_id: o.crew_id,
        task: o.task_description,
        status: o.status,
        duration_seconds: o.duration_seconds,
        confidence: o.confidence_level || 'unknown',
        error: o.error_message || undefined,
      }));

    return NextResponse.json(
      {
        success: true,
        active_tasks: activeTasks,
        completed_tasks: completedTasks,
        recent_outcomes: recentOutcomes.slice(0, 10),
        aggregate: {
          today_count: stats.today_count,
          today_success_rate: stats.today_success_rate,
          today_cost_usd: stats.today_cost_usd,
          active_tasks_count: stats.active_tasks_count,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[crew/execution-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        active_tasks: [],
        completed_tasks: [],
        recent_outcomes: [],
        aggregate: {
          today_count: 0,
          today_success_rate: 0,
          today_cost_usd: 0,
          active_tasks_count: 0,
        },
      },
      { status: 500 }
    );
  }
}
