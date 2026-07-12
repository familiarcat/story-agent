/**
 * API Route: /api/crew/observations/[id]/outcome
 * POST: Records the outcome of a crew deliberation after execution
 * Allows crew to learn from successes/failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordObservationMemoryOutcome } from '@story-agent/shared';

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Observation ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { outcome, outcomeNotes } = body;

    // Validate outcome
    if (!outcome || !['success', 'partial', 'failed'].includes(outcome)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid outcome. Must be one of: success, partial, failed',
        },
        { status: 400 }
      );
    }

    // Record the outcome
    const updated = await recordObservationMemoryOutcome({
      memoryId: id,
      outcome,
      outcomeNotes: outcomeNotes || undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Observation not found or failed to update' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Outcome recorded: ${outcome}. Crew learns from this.`,
        data: {
          id: updated.id,
          outcome: updated.outcome,
          outcomeNotes: updated.outcomeNotes,
          executionCompletedAt: updated.executionCompletedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/observations/:id/outcome] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
