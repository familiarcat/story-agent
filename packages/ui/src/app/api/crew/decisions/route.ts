/**
 * API Routes: /api/crew/decisions
 * 
 * GET: Fetch crew decisions based on recent missions and consensus
 * POST: Request autonomous decision from crew (not yet implemented)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCrewPersona, getRecentMissionDebriefs } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storyRef = searchParams.get('storyRef');
    const status = searchParams.get('status'); // pending, approved, rejected

    // Load real crew decisions from recent mission debriefs
    const recentDebriefs = await getRecentMissionDebriefs(20);
    const decisions: any[] = [];

    // Build decisions from crew debriefs
    for (const debrief of recentDebriefs) {
      const persona = await getCrewPersona(debrief.crewId);
      if (!persona) continue;

      // Create decision for each approved improvement
      debrief.approvedImprovements.forEach((improvement, idx) => {
        decisions.push({
          id: `decision-${debrief.missionId}-${debrief.crewId}-${idx}`,
          type: debrief.crewId === 'worf' ? 'security_clearance' : 
                debrief.crewId === 'data' ? 'architectural_approval' :
                debrief.crewId === 'picard' ? 'executive_approval' :
                'technical_decision',
          crewMember: persona.fullName,
          crewId: debrief.crewId,
          authority: debrief.crewId === 'picard' ? 'executive' : 
                    debrief.crewId === 'worf' ? 'security_veto' :
                    debrief.crewId === 'data' ? 'architectural' : 'tactical',
          missionId: debrief.missionId,
          storyRef: storyRef || 'recent_mission',
          reasoning: improvement,
          affectedTeams: ['development', 'architecture'],
          approved: debrief.worfReviewed && debrief.dataValidated,
          requiresApproval: debrief.crewId === 'worf',
          timestamp: debrief.appliedAt || debrief.createdAt,
          skillVersion: `Applied to next mission cycle`,
        });
      });
    }

    // Filter by status if specified
    let filtered = decisions;
    if (status === 'approved') {
      filtered = decisions.filter(d => d.approved);
    } else if (status === 'pending') {
      filtered = decisions.filter(d => !d.approved);
    }

    return NextResponse.json(
      {
        success: true,
        decisions: filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        count: filtered.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/decisions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        decisions: [],
      },
      { status: 500 }
    );
  }
}
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
