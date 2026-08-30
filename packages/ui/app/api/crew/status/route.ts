/**
 * API Route: /api/crew/status
 * GET: Returns complete starship status including crew, tools, missions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStarshipStatus } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const status = await getStarshipStatus();

    return NextResponse.json(
      {
        success: true,
        starship: {
          name: 'Sovereign Factory',
          status: 'OPERATIONAL',
          ...status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
