/**
 * API Route: /api/crew/observations/[id]
 * GET: Returns full details of a single observation memory
 * Includes full transcript, outcome, and lessons learned
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentObservationMemories } from '@/lib/db';
import type { ObservationMemoryRecord } from '@story-agent/shared';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Observation ID required' },
        { status: 400 }
      );
    }

    // Fetch a large batch to ensure we find observations even with deep pagination
    const memories = await getRecentObservationMemories(5000);
    const memory = memories.find((m: ObservationMemoryRecord) => m.id === id);

    if (!memory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Observation not found. It may have been archived, deleted, or is too old (beyond recent 5000 deliberations).',
        },
        { status: 404 }
      );
    }

    // Format response with full details
    return NextResponse.json(
      {
        success: true,
        data: {
          id: memory.id,
          storyId: memory.storyId,
          createdAt: memory.createdAt,
          source: memory.source,
          tags: memory.tags,
          transcript: memory.transcript,
          transcriptText: memory.transcriptText,
          missionReference: memory.missionReference,
          outcome: memory.outcome || 'pending',
          outcomeNotes: memory.outcomeNotes,
          executionCompletedAt: memory.executionCompletedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/observations/:id] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
