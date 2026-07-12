/**
 * API Route: /api/crew/observations
 * GET: Lists all observation memories with pagination and filtering
 * Supports filtering by outcome status, complexity, tags, date range, and text search
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentObservationMemories } from '@story-agent/shared/db';
import type { ObservationMemoryRecord } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Filtering
    const status = searchParams.get('status'); // success|partial|failed|pending
    const complexity = searchParams.get('complexity'); // low|medium|high
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const search = searchParams.get('search') || '';
    const clientId = searchParams.get('clientId') || null;

    // Fetch recent observations
    const allMemories = await getRecentObservationMemories(limit + offset, undefined, clientId);

    // Apply filters
    let filtered = allMemories.slice(offset, offset + limit);

    if (status && status !== 'pending') {
      filtered = filtered.filter((m: ObservationMemoryRecord) => m.outcome === status);
    }

    if (tags.length > 0) {
      filtered = filtered.filter((m: ObservationMemoryRecord) =>
        tags.some(tag => m.tags.includes(tag))
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((m: ObservationMemoryRecord) => {
        const textToSearch = (m.transcriptText || m.storyId || '').toLowerCase();
        return textToSearch.includes(searchLower) ||
               m.storyId.toLowerCase().includes(searchLower);
      });
    }

    // Map to response format with summary
    const observations = filtered.map((m: ObservationMemoryRecord) => {
      // Generate summary from transcript consensus or action items
      let summary = m.storyId;
      if (m.transcript?.consensusSummary) {
        summary = m.transcript.consensusSummary.substring(0, 100);
      } else if (m.transcriptText) {
        summary = m.transcriptText.substring(0, 100);
      }

      return {
        id: m.id,
        storyId: m.storyId,
        createdAt: m.createdAt,
        outcome: m.outcome || 'pending',
        summary,
        tags: m.tags,
        outcomeNotes: m.outcomeNotes,
        transcriptHash: m.transcriptHash,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          observations,
          pagination: {
            limit,
            offset,
            total: allMemories.length,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/observations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
