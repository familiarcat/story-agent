/**
 * API Route: /api/crew/decisions/[id]/approve
 * 
 * POST: Approve a crew decision
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
    const approvedBy = body.approvedBy || 'user';

    // TODO: Call crewAutonomyManager.approveDecision(decisionId, approvedBy)
    // await crewAutonomyManager.approveDecision(decisionId, approvedBy);

    return NextResponse.json({
      success: true,
      message: `Decision ${decisionId} approved by ${approvedBy}`,
    });
  } catch (err) {
    console.error('Error approving decision:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to approve decision' },
      { status: 500 }
    );
  }
}
