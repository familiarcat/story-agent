/**
 * Client Team Roster Manager
 * 
 * Manages assignment of:
 * - Human team members
 * - AI Crew (OpenRouter crew for assistance)
 * - AI Agents (profile-based from GitHub)
 * 
 * Ensures proper hand-off, escalation, and approval gates.
 */

import { getDbClient } from '@story-agent/shared/db';
import type {
  HumanTeamMember,
  AICrew,
  AIProfileBasedAgent,
  ClientTeamRoster,
  ApprovalGate,
  HumanFeedbackRecord,
} from '@story-agent/shared/human-team-member.js';
import { UUID } from '@story-agent/shared/pm-types.js';

// ============================================================================
// ROSTER QUERY & MANAGEMENT
// ============================================================================

export async function getClientTeamRoster(clientId: UUID): Promise<ClientTeamRoster | null> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_client_team_rosters')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as ClientTeamRoster;
  } catch (err) {
    console.error('[ROSTER] Error fetching roster:', err);
    return null;
  }
}

export async function createClientTeamRoster(
  clientId: UUID,
  humanMembers: UUID[],
  aiCrew: UUID[],
  aiAgents: UUID[],
): Promise<ClientTeamRoster> {
  const roster: ClientTeamRoster = {
    id: `roster-${clientId}-${Date.now()}` as any,
    clientId,
    humanMembers,
    aiCrew,
    aiAgents,
    roleAssignments: [],
    totalCapacityHoursPerWeek: 0,
    humanCapacityHours: 0,
    aiCapacityHours: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const db = await getDbClient();
    const { error } = await db.from('sa_client_team_rosters').insert([roster]);
    if (error) throw error;
  } catch (err) {
    console.error('[ROSTER] Error creating roster:', err);
  }

  return roster;
}

export async function addHumanToRoster(clientId: UUID, humanId: UUID): Promise<boolean> {
  try {
    const db = await getDbClient();

    // Get current roster
    let roster = await getClientTeamRoster(clientId);
    if (!roster) {
      roster = await createClientTeamRoster(clientId, [humanId], [], []);
      return true;
    }

    // Add if not already present
    if (roster.humanMembers.includes(humanId)) return true;

    roster.humanMembers.push(humanId);
    roster.updatedAt = new Date().toISOString();

    const { error } = await db
      .from('sa_client_team_rosters')
      .update({ human_members: roster.humanMembers, updated_at: roster.updatedAt })
      .eq('client_id', clientId);

    return !error;
  } catch (err) {
    console.error('[ROSTER] Error adding human:', err);
    return false;
  }
}

export async function addAICrewToRoster(clientId: UUID, crewId: UUID): Promise<boolean> {
  try {
    const db = await getDbClient();

    let roster = await getClientTeamRoster(clientId);
    if (!roster) {
      roster = await createClientTeamRoster(clientId, [], [crewId], []);
      return true;
    }

    if (roster.aiCrew.includes(crewId)) return true;

    roster.aiCrew.push(crewId);
    roster.updatedAt = new Date().toISOString();

    const { error } = await db
      .from('sa_client_team_rosters')
      .update({ ai_crew: roster.aiCrew, updated_at: roster.updatedAt })
      .eq('client_id', clientId);

    return !error;
  } catch (err) {
    console.error('[ROSTER] Error adding AI crew:', err);
    return false;
  }
}

// ============================================================================
// SMART TASK ROUTING — Who should work on this?
// ============================================================================

export interface TaskRoutingContext {
  storyType: string; // e.g., 'backend', 'security', 'ui', 'devops'
  complexity: 'simple' | 'medium' | 'complex' | 'critical';
  requiresHumanApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskRouting {
  assignTo: UUID; // Person/AI ID
  assignToKind: 'human' | 'ai-crew' | 'ai-profile-based';
  assignToName: string;
  reasoning: string[];
  requiresApprovalFrom: UUID[]; // Human IDs who must approve
  handoffSequence: Array<{ order: number; id: UUID; kind: string; reason: string }>;
}

export async function routeTaskToTeamMember(
  roster: ClientTeamRoster,
  context: TaskRoutingContext,
  humanMembers: Map<UUID, HumanTeamMember>,
  aiAgents: Map<UUID, AIProfileBasedAgent>,
): Promise<TaskRouting | null> {
  const reasoning: string[] = [];

  // For critical/high-risk: escalate to human
  if (context.riskLevel === 'critical' || context.complexity === 'critical') {
    const reviewers = roster.reviewers || [];
    if (reviewers.length === 0) return null; // No one to escalate to

    reasoning.push(`Critical risk level (${context.riskLevel}) — requires human decision-maker`);

    return {
      assignTo: reviewers[0],
      assignToKind: 'human',
      assignToName: humanMembers.get(reviewers[0])?.name || 'Unknown',
      reasoning,
      requiresApprovalFrom: reviewers,
      handoffSequence: [
        {
          order: 1,
          id: reviewers[0],
          kind: 'human',
          reason: 'Critical decision-maker',
        },
      ],
    };
  }

  // For medium complexity: try AI assistant, human oversight
  if (context.complexity === 'complex' && context.requiresHumanApproval) {
    // Find best-matched AI agent for this story type
    let bestAgent: AIProfileBasedAgent | null = null;
    let bestMatch = 0;

    for (const agentId of roster.aiAgents) {
      const agent = aiAgents.get(agentId);
      if (!agent) continue;

      // Simple match: does agent's specialization align with story type?
      // (In real implementation, would use more sophisticated matching)
      const match = agent.ragMemoryTags.includes(context.storyType) ? 1 : 0.5;
      if (match > bestMatch) {
        bestMatch = match;
        bestAgent = agent;
      }
    }

    if (bestAgent) {
      reasoning.push(`Complex story (${context.complexity}) — AI agent as implementer`);
      reasoning.push(`Best match: AI profile-based agent (${bestAgent.agentName})`);
      reasoning.push(`Requires human approval for: ${bestAgent.requiresApprovalFor.join(', ')}`);

      return {
        assignTo: bestAgent.id,
        assignToKind: 'ai-profile-based',
        assignToName: bestAgent.agentName,
        reasoning,
        requiresApprovalFrom: bestAgent.requiresApprovalFor.length > 0 ? [bestAgent.escalationContact || roster.teamLead || roster.reviewers?.[0]] : [],
        handoffSequence: [
          {
            order: 1,
            id: bestAgent.id,
            kind: 'ai-profile-based',
            reason: 'Primary implementer (best match for story type)',
          },
          {
            order: 2,
            id: bestAgent.escalationContact || roster.reviewers?.[0],
            kind: 'human',
            reason: 'Approval gate (security/data decisions)',
          },
        ],
      };
    }
  }

  // For simple tasks: AI crew can handle async
  if (context.complexity === 'simple') {
    if (roster.aiCrew.length > 0) {
      reasoning.push(`Simple task (${context.complexity}) — AI crew as assistant`);
      return {
        assignTo: roster.aiCrew[0],
        assignToKind: 'ai-crew',
        assignToName: 'OpenRouter Crew',
        reasoning,
        requiresApprovalFrom: [],
        handoffSequence: [
          {
            order: 1,
            id: roster.aiCrew[0],
            kind: 'ai-crew',
            reason: 'Quick execution',
          },
        ],
      };
    }
  }

  // Default: escalate to available human
  if (roster.humanMembers.length > 0) {
    reasoning.push(`Assigning to available human team member`);
    return {
      assignTo: roster.humanMembers[0],
      assignToKind: 'human',
      assignToName: humanMembers.get(roster.humanMembers[0])?.name || 'Unknown',
      reasoning,
      requiresApprovalFrom: [],
      handoffSequence: [
        {
          order: 1,
          id: roster.humanMembers[0],
          kind: 'human',
          reason: 'Team member',
        },
      ],
    };
  }

  return null;
}

// ============================================================================
// APPROVAL GATE MANAGEMENT
// ============================================================================

export async function getApprovalGatesForMission(missionId: UUID): Promise<ApprovalGate[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_approval_gates')
      .select('*')
      .eq('mission_id', missionId)
      .eq('status', 'pending');

    if (error) throw error;
    return (data || []) as ApprovalGate[];
  } catch (err) {
    console.error('[GATES] Error fetching gates:', err);
    return [];
  }
}

export async function approveGate(gateId: UUID, humanId: UUID, feedback?: string): Promise<boolean> {
  try {
    const db = await getDbClient();

    // Fetch gate
    const { data: gate, error: fetchErr } = await db
      .from('sa_approval_gates')
      .select('*')
      .eq('id', gateId)
      .single();

    if (fetchErr) throw fetchErr;

    // Add approval
    const approvals = gate.approvals_received || [];
    approvals.push({
      humanId,
      approvedAt: new Date().toISOString(),
      feedback,
    });

    // Mark as approved if all reviewers have signed off
    const allApproved = gate.requires_approval_from.every((reviewer: UUID) =>
      approvals.some((a: any) => a.humanId === reviewer),
    );

    const { error: updateErr } = await db
      .from('sa_approval_gates')
      .update({
        approvals_received: approvals,
        status: allApproved ? 'approved' : 'pending',
        resolved_at: allApproved ? new Date().toISOString() : undefined,
      })
      .eq('id', gateId);

    return !updateErr;
  } catch (err) {
    console.error('[GATES] Error approving gate:', err);
    return false;
  }
}

// ============================================================================
// LEARNING FROM HUMAN FEEDBACK
// ============================================================================

export async function recordHumanFeedback(feedback: HumanFeedbackRecord): Promise<boolean> {
  try {
    const db = await getDbClient();
    const { error } = await db.from('sa_human_feedback').insert([feedback]);
    return !error;
  } catch (err) {
    console.error('[FEEDBACK] Error recording feedback:', err);
    return false;
  }
}

export async function getAgentLearningFeedback(agentId: UUID): Promise<HumanFeedbackRecord[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_human_feedback')
      .select('*')
      .eq('ai_agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HumanFeedbackRecord[];
  } catch (err) {
    console.error('[FEEDBACK] Error fetching feedback:', err);
    return [];
  }
}

/**
 * Aggregate feedback to improve agent's learning score
 */
export async function updateAgentLearningScore(agentId: UUID): Promise<number> {
  const feedback = await getAgentLearningFeedback(agentId);

  if (feedback.length === 0) return 0.5; // Default

  // Simple scoring: approvals boost, revisions penalize
  let score = 0.5;
  let weightedCount = 0;

  for (const f of feedback) {
    if (f.feedbackType === 'approval') {
      score += 0.05;
    } else if (f.feedbackType === 'revision') {
      score -= 0.02;
    } else if (f.feedbackType === 'escalation') {
      score -= 0.1;
    }
    weightedCount++;
  }

  // Normalize
  return Math.max(0, Math.min(1, score + weightedCount * 0.01));
}
