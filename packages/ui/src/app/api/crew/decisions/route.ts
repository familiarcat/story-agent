/**
 * API Routes: /api/crew/decisions
 * 
 * GET: Fetch pending crew decisions
 * POST: Request autonomous decision from crew
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storyRef = searchParams.get('storyRef');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // pending, approved, rejected

    // TODO: Query crew autonomy manager for decisions
    // import { crewAutonomyManager } from '@story-agent/mcp-server';

    // Mock data
    const decisions = [
      {
        id: 'decision-1',
        type: 'approve_implementation',
        crewMember: 'Picard',
        authority: 'individual',
        storyRef: storyRef || 'STORY-123',
        reasoning:
          'All crew reviews complete. No blockers identified. Ready to proceed with PR merge.',
        affectedTeams: ['development'],
        approved: false,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'decision-2',
        type: 'accelerate_timeline',
        crewMember: 'Geordi',
        authority: 'consensus',
        storyRef: projectId || 'STORY-456',
        reasoning:
          'Infrastructure optimizations completed early. Can reduce deployment time by 30%.',
        affectedTeams: ['project_management'],
        approved: false,
        timestamp: new Date().toISOString(),
      },
    ];

    const filtered =
      status === 'pending'
        ? decisions.filter(d => !d.approved)
        : decisions;

    return NextResponse.json({ success: true, decisions: filtered });
  } catch (err) {
    console.error('Error fetching decisions:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch decisions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyRef, decisionType, context } = body;

    if (!storyRef || !decisionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Call crewAutonomyManager.requestAutonomousDecision()
    // const decision = await crewAutonomyManager.requestAutonomousDecision(
    //   storyRef,
    //   decisionType,
    //   context
    // );

    // Mock response
    const decision = {
      id: `decision-${Date.now()}`,
      type: decisionType,
      crewMember: 'Captain',
      authority: 'individual',
      storyRef,
      reasoning: context || 'Crew reviewed and approved.',
      affectedTeams: ['development', 'project_management'],
      approved: false,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, decision });
  } catch (err) {
    console.error('Error creating decision request:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create decision' },
      { status: 500 }
    );
  }
}
