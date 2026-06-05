/**
 * API Route: /api/crew/insights
 * 
 * Get crew insights filtered by role and story.
 * Supports: GET
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storyRef = searchParams.get('storyRef');
    const role = searchParams.get('role') as 'developer' | 'project_manager' | undefined;
    const projectId = searchParams.get('projectId');

    // TODO: Query crew autonomy manager for insights
    // import { crewAutonomyManager } from '@story-agent/mcp-server';
    
    // For now, return mock data
    const insights = [];

    if (role === 'developer' && storyRef) {
      // Developer-focused insights
      insights.push({
        id: 'insight-1',
        type: 'architecture_recommendation',
        crewMember: 'Data',
        targetRole: 'developer',
        storyRef,
        title: 'Architecture Review: Consider Singleton Pattern',
        description:
          'For the database connection management, a singleton pattern would improve resource efficiency.',
        actionItems: [
          'Review existing connection pooling',
          'Implement singleton wrapper',
          'Add unit tests',
        ],
        priority: 'medium',
        confidence: 88,
        timestamp: new Date().toISOString(),
        requiresApproval: false,
        autonomousAction: 'Post code review suggestion to PR',
      });

      insights.push({
        id: 'insight-2',
        type: 'security_issue',
        crewMember: 'Worf',
        targetRole: 'developer',
        storyRef,
        title: 'Security Check: SQL Injection Risk',
        description:
          'Detected potential SQL injection vulnerability in the user query handler. Recommend parameterized queries.',
        actionItems: [
          'Use prepared statements',
          'Add input validation',
          'Run security tests',
        ],
        priority: 'critical',
        confidence: 95,
        timestamp: new Date().toISOString(),
        requiresApproval: false,
        autonomousAction: 'Block PR merge until resolved',
      });
    }

    if (role === 'project_manager') {
      // Project manager focused insights
      insights.push({
        id: 'insight-3',
        type: 'timeline_risk',
        crewMember: 'Captain',
        targetRole: 'project_manager',
        storyRef: projectId || 'PROJECT',
        title: 'Sprint Timeline at Risk',
        description: '3 stories behind schedule. May impact sprint completion.',
        actionItems: [
          'Review resource allocation',
          'Identify blockers',
          'Consider scope reduction',
        ],
        priority: 'high',
        confidence: 82,
        timestamp: new Date().toISOString(),
        requiresApproval: false,
      });

      insights.push({
        id: 'insight-4',
        type: 'budget_concern',
        crewMember: 'Quark',
        targetRole: 'project_manager',
        storyRef: projectId || 'PROJECT',
        title: 'LLM Usage Over Budget',
        description: 'Current crew execution costs ($2,340) exceed monthly budget ($2,000).',
        actionItems: [
          'Review execution strategies',
          'Optimize crew assignments',
          'Negotiate increased budget',
        ],
        priority: 'high',
        confidence: 100,
        timestamp: new Date().toISOString(),
        requiresApproval: false,
      });
    }

    return NextResponse.json({ success: true, insights });
  } catch (err) {
    console.error('Error fetching insights:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
