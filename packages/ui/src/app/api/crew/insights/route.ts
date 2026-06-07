/**
 * API Route: /api/crew/insights
 * 
 * Get crew insights filtered by role and story.
 * Reads actual crew skill manifests and derives insights from crew specializations.
 * Supports: GET
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCrewRosterWithStats, getCrewSkillManifest, getCrewPersona } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storyRef = searchParams.get('storyRef');
    const role = searchParams.get('role') as 'developer' | 'project_manager' | undefined;

    // Load real crew data from Supabase
    const roster = await getCrewRosterWithStats();
    const insights: any[] = [];

    // Build insights from crew specializations and improvements
    for (const member of roster) {
      const manifest = await getCrewSkillManifest(member.crewId);
      const persona = await getCrewPersona(member.crewId);

      if (!manifest || !persona) continue;

      // Derive insights from accumulated improvements
      const recentImprovements = manifest.selfImprovementNotes.slice(-3);

      // Create insight for each recent improvement
      recentImprovements.forEach((note, idx) => {
        const insight: any = {
          id: `insight-${member.crewId}-${idx}`,
          type: member.crewId === 'worf' ? 'security_issue' : 
                member.crewId === 'data' ? 'architecture_recommendation' :
                member.crewId === 'yar' ? 'qa_requirement' :
                'general_recommendation',
          crewMember: persona.fullName,
          crewId: member.crewId,
          crewRole: member.role,
          storyRef: storyRef || 'all',
          title: `${persona.fullName}'s Learning: ${note.split(']')[0]}]`,
          description: note,
          actionItems: [],
          priority: member.crewId === 'worf' ? 'critical' : 
                   member.crewId === 'data' ? 'high' : 'medium',
          confidence: 90 - (idx * 5), // Recent improvements more confident
          timestamp: manifest.lastImprovedAt || new Date().toISOString(),
          requiresApproval: member.crewId === 'worf',
          autonomousAction: `Enforced via ${member.crewId}'s system prompt in next mission`,
          skillVersion: manifest.version,
        };

        // Filter by role if specified
        if (!role || 
            (role === 'developer' && ['architecture', 'implementation', 'devops'].includes(member.role)) ||
            (role === 'project_manager' && member.crewId === 'picard')) {
          insights.push(insight);
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        insights: insights.sort((a, b) => b.confidence - a.confidence),
        count: insights.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/insights] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: [],
      },
      { status: 500 }
    );
  }
}
