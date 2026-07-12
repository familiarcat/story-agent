/**
 * API Route: /api/crew/observations/[id]
 * GET: Returns full details of a single observation memory
 * Includes full transcript, outcome, and lessons learned
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@story-agent/shared/supabase';
import { mapObservationMemory } from '@story-agent/shared';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Observation ID required' },
        { status: 400 }
      );
    }

    const rows = await (await db())
      .from('sa_observation_memories')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Observation not found' },
        { status: 404 }
      );
    }

    const memory = mapObservationMemory(rows[0] as Record<string, unknown>);

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
