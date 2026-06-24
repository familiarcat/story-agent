/**
 * API Route: /api/crew/[crewId]/manifest
 * GET: Returns full skill manifest for a crew member
 * 
 * Query params:
 *   - includeEnrichedPrompt: boolean (optional) — include full enriched prompt
 *   - history: boolean (optional) — include version history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCrewSkillManifest, getCrewSkillManifestHistory } from '@story-agent/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const crewId = (await params).crewId as any;
    const includeHistory = request.nextUrl.searchParams.get('history') === 'true';

    const manifest = await getCrewSkillManifest(crewId);
    if (!manifest) {
      return NextResponse.json(
        {
          success: false,
          error: `Crew member ${crewId} not found`,
        },
        { status: 404 }
      );
    }

    let response: any = {
      success: true,
      manifest,
    };

    if (includeHistory) {
      const history = await getCrewSkillManifestHistory(crewId);
      response.history = history;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[crew/[crewId]/manifest] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
