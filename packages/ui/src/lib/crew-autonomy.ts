/**
 * Crew Autonomy Types - Shared between MCP server and UI
 */

export type CrewInsightType =
  | 'architecture_recommendation'
  | 'code_quality_warning'
  | 'security_issue'
  | 'test_strategy'
  | 'stakeholder_alignment'
  | 'budget_concern'
  | 'timeline_risk'
  | 'health_improvement'
  | 'requirement_clarification';

export type CrewDecisionType =
  | 'approve_implementation'
  | 'request_revision'
  | 'block_for_security'
  | 'accelerate_timeline'
  | 'add_resources'
  | 'escalate_to_human';

export interface CrewInsight {
  id: string;
  type: CrewInsightType;
  crewMember: string;
  targetRole: 'developer' | 'project_manager' | 'both';
  storyRef: string;
  title: string;
  description: string;
  actionItems?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timestamp: string;
  requiresApproval: boolean;
  autonomousAction?: string;
}

export interface CrewDecision {
  id: string;
  type: CrewDecisionType;
  crewMember: string;
  authority: 'individual' | 'consensus' | 'veto';
  storyRef: string;
  reasoning: string;
  affectedTeams: ('development' | 'project_management')[];
  approved: boolean;
  approvedBy?: string;
  executedAt?: string;
  timestamp: string;
}

export interface CrewWorkload {
  crewId: string;
  activeAssignments: number;
  storiesMonitoring: string[];
  insightsPending: number;
  decisionsPending: number;
  lastActivity: string;
  status: 'idle' | 'busy' | 'overloaded';
}
