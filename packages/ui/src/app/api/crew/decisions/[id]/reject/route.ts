/**
 * API Route: /api/crew/decisions/[id]/reject
 * 
 * POST: Reject a crew decision
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const decisionId = params.id;
    const body = await request.json();
    const reason = body.reason || 'No reason provided';

    // TODO: Call crewAutonomyManager.rejectDecision(decisionId, reason)
    // crewAutonomyManager.rejectDecision(decisionId, reason);

    return NextResponse.json({
      success: true,
      message: `Decision ${decisionId} rejected`,
    });
  } catch (err) {
    console.error('Error rejecting decision:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to reject decision' },
      { status: 500 }
    );
  }
}
