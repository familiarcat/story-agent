/**
 * API Route: /api/crew/tools
 * GET: Returns tool registry with filtering
 * 
 * Query params:
 *   - status: proposed|under_evaluation|approved|rejected|deprecated
 *   - category: tool category name
 *   - clearance: approved|review|blocked
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToolRegistry, getApprovedTools, getWorfVetoedTools } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status');
    const category = request.nextUrl.searchParams.get('category');
    const clearance = request.nextUrl.searchParams.get('clearance');
    const vetoedOnly = request.nextUrl.searchParams.get('vetoed') === 'true';
    const approvedOnly = request.nextUrl.searchParams.get('approved') === 'true';

    let tools;

    if (vetoedOnly) {
      tools = await getWorfVetoedTools();
    } else if (approvedOnly) {
      tools = await getApprovedTools();
    } else {
      tools = await getToolRegistry({
        status: status || undefined,
        category: category || undefined,
        securityClearance: clearance || undefined,
      });
    }

    return NextResponse.json(
      {
        success: true,
        tools: {
          total: tools.length,
          approved: tools.filter(t => t.status === 'approved' && !t.worfVeto).length,
          worfVetoed: tools.filter(t => t.worfVeto).length,
          pending: tools.filter(t => t.status === 'proposed' || t.status === 'under_evaluation').length,
          tools,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/tools] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
