/**
 * API Route: /api/crew/roster
 * GET: Returns all crew members with current skill versions and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCrewRosterWithStats } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const roster = await getCrewRosterWithStats();

    return NextResponse.json(
      {
        success: true,
        crew: {
          total: roster.length,
          roster,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/roster] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
