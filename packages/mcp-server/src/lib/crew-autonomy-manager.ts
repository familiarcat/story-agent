/**
 * Crew Autonomy Manager - Orchestrates autonomous crew behavior
 *
 * Responsibilities:
 * - Continuously monitor active stories and projects
 * - Provide proactive insights to developers and PMs
 * - Execute autonomous decisions (status updates, PR comments, etc.)
 * - Facilitate crew collaboration and communication
 * - Track crew "workload" and availability
 */

import { EventEmitter } from 'events';
import type { CrewExecutionState, StoryRecord } from '@story-agent/shared';
import { crewStateBroadcaster } from './crew-state-broadcaster.js';
import { crewCommunicationBus } from './crew-communication.js';

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
  crewMember: string; // Picard, Data, Riker, etc.
  targetRole: 'developer' | 'project_manager' | 'both';
  storyRef: string;
  title: string;
  description: string;
  actionItems?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  timestamp: string;
  requiresApproval: boolean;
  autonomousAction?: string; // Action crew can take without approval
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

export class CrewAutonomyManager extends EventEmitter {
  private activeStories: Map<string, CrewExecutionState> = new Map();
  private crewWorkload: Map<string, CrewWorkload> = new Map();
  private insights: CrewInsight[] = [];
  private decisions: CrewDecision[] = [];
  private monitoringInterval: NodeJS.Timer | null = null;

  constructor() {
    super();
    this.initializeWorkload();
  }

  /**
   * Start autonomous crew monitoring and operations.
   * Runs continuously to provide proactive guidance.
   */
  start(): void {
    if (this.monitoringInterval) {
      console.warn('[AUTONOMY] Already monitoring');
      return;
    }

    console.log('[AUTONOMY] Starting autonomous crew operations');

    // Monitor every 5 seconds for opportunities to help
    this.monitoringInterval = setInterval(() => {
      this.monitorActiveStories();
      this.generateProactiveInsights();
      this.evaluateAutonomousDecisions();
      this.facilitateCrewCommunication();
    }, 5000);
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[AUTONOMY] Stopped autonomous crew operations');
    }
  }

  /**
   * Register a story for autonomous crew monitoring.
   */
  monitorStory(storyRef: string, state: CrewExecutionState): void {
    this.activeStories.set(storyRef, state);
    console.log(`[AUTONOMY] Now monitoring: ${storyRef}`);
    this.emit('story:monitored', storyRef);
  }

  /**
   * Stop monitoring a story (e.g., when complete or blocked).
   */
  stopMonitoring(storyRef: string): void {
    this.activeStories.delete(storyRef);
    console.log(`[AUTONOMY] Stopped monitoring: ${storyRef}`);
    this.emit('story:unmonitored', storyRef);
  }

  /**
   * Get all insights for a role (developer or project manager).
   */
  getInsightsForRole(
    role: 'developer' | 'project_manager',
    storyRef?: string
  ): CrewInsight[] {
    return this.insights.filter(
      i =>
        (i.targetRole === role || i.targetRole === 'both') &&
        (!storyRef || i.storyRef === storyRef)
    );
  }

  /**
   * Get crew workload status.
   */
  getCrewWorkload(): CrewWorkload[] {
    return Array.from(this.crewWorkload.values());
  }

  /**
   * Get workload for specific crew member.
   */
  getCrewMemberWorkload(crewId: string): CrewWorkload | null {
    return this.crewWorkload.get(crewId) || null;
  }

  /**
   * Request autonomous decision from crew.
   * Used when PM/developer wants crew to decide.
   */
  async requestAutonomousDecision(
    storyRef: string,
    decisionType: CrewDecisionType,
    context: string
  ): Promise<CrewDecision | null> {
    console.log(`[AUTONOMY] Decision requested for ${storyRef}: ${decisionType}`);

    // Route to appropriate crew member based on decision type
    const crewMember = this.routeDecisionRequest(decisionType);
    if (!crewMember) {
      console.warn(`[AUTONOMY] No crew member suited for decision: ${decisionType}`);
      return null;
    }

    // Generate decision from crew member
    const decision = await this.generateCrewDecision(
      storyRef,
      crewMember,
      decisionType,
      context
    );

    if (decision) {
      this.decisions.push(decision);
      this.emit('decision:created', decision);
    }

    return decision || null;
  }

  /**
   * Approve a decision by human (developer or PM).
   */
  async approveDecision(decisionId: string, approvedBy: string): Promise<boolean> {
    const decision = this.decisions.find(d => d.id === decisionId);
    if (!decision) {
      console.warn(`[AUTONOMY] Decision not found: ${decisionId}`);
      return false;
    }

    decision.approved = true;
    decision.approvedBy = approvedBy;
    console.log(`[AUTONOMY] Decision approved: ${decisionId} by ${approvedBy}`);

    // Execute the decision if applicable
    await this.executeDecision(decision);
    this.emit('decision:approved', decision);
    return true;
  }

  /**
   * Reject a decision.
   */
  rejectDecision(decisionId: string, reason: string): boolean {
    const idx = this.decisions.findIndex(d => d.id === decisionId);
    if (idx === -1) return false;

    const decision = this.decisions[idx];
    console.log(`[AUTONOMY] Decision rejected: ${decisionId} - ${reason}`);
    this.emit('decision:rejected', { decision, reason });

    // Remove rejected decision
    this.decisions.splice(idx, 1);
    return true;
  }

  // ── Private Methods ────────────────────────────────────────────────────────

  private initializeWorkload(): void {
    const crewIds = [
      'captain',
      'architect',
      'developer',
      'infrastructure',
      'devops',
      'security',
      'qa',
      'analyst',
      'health',
      'communications',
      'finance',
    ];

    crewIds.forEach(crewId => {
      this.crewWorkload.set(crewId, {
        crewId,
        activeAssignments: 0,
        storiesMonitoring: [],
        insightsPending: 0,
        decisionsPending: 0,
        lastActivity: new Date().toISOString(),
        status: 'idle',
      });
    });
  }

  private monitorActiveStories(): void {
    const monitored = Array.from(this.activeStories.entries());

    monitored.forEach(([storyRef, state]) => {
      // Check for stuck stories (no progress in 5 minutes)
      if (state.status === 'in_progress') {
        const timeSinceUpdate =
          Date.now() - new Date(state.updatedAt).getTime();
        if (timeSinceUpdate > 5 * 60 * 1000) {
          this.addInsight({
            type: 'timeline_risk',
            crewMember: 'captain',
            targetRole: 'project_manager',
            storyRef,
            title: 'Story Progress Stalled',
            description: `${storyRef} has not progressed in 5 minutes. May need intervention.`,
            priority: 'medium',
            confidence: 85,
            requiresApproval: false,
          });
        }
      }

      // Check for high costs
      if (state.totalCostUsd > 0.5) {
        this.addInsight({
          type: 'budget_concern',
          crewMember: 'finance',
          targetRole: 'project_manager',
          storyRef,
          title: 'High Execution Cost',
          description: `${storyRef} execution cost ($${state.totalCostUsd.toFixed(4)}) exceeds budget threshold.`,
          priority: 'high',
          confidence: 95,
          requiresApproval: false,
        });
      }

      // Check for vetoes
      if (state.blockers && state.blockers.length > 0) {
        this.addInsight({
          type: 'security_issue',
          crewMember: 'security',
          targetRole: 'both',
          storyRef,
          title: 'Blocked by Security',
          description: `${storyRef} blocked: ${state.blockers[0]}`,
          priority: 'critical',
          confidence: 100,
          requiresApproval: false,
          actionItems: ['Review security veto', 'Mitigate risk', 'Resubmit'],
        });
      }
    });
  }

  private generateProactiveInsights(): void {
    // This would call crew agents to generate insights
    // For now, just monitor and react to state changes
    // In production, this would execute crew thinking on each active story
  }

  private evaluateAutonomousDecisions(): void {
    // Check if any decisions can be autonomously executed
    // (e.g., "approve_implementation" with high confidence and no blockers)
    this.decisions.forEach(decision => {
      if (!decision.approved && decision.authority === 'individual') {
        // Auto-approve low-risk individual decisions
        if (decision.type === 'approve_implementation' && !this.hasBlockers(decision.storyRef)) {
          this.approveDecision(decision.id, 'crew_autonomy_system');
        }
      }
    });
  }

  private facilitateCrewCommunication(): void {
    // Look for consensus-based decisions that need crew discussion
    const consensusDecisions = this.decisions.filter(
      d => d.authority === 'consensus' && !d.approved
    );

    consensusDecisions.forEach(decision => {
      // Request consensus from crew
      crewCommunicationBus.requestConsensus(
        decision.storyRef,
        `Should we: ${decision.reasoning}?`,
        ['captain', 'architect', 'developer', 'security']
      );
    });
  }

  private async generateCrewDecision(
    storyRef: string,
    crewMember: string,
    decisionType: CrewDecisionType,
    context: string
  ): Promise<CrewDecision> {
    const decision: CrewDecision = {
      id: `decision-${storyRef}-${Date.now()}`,
      type: decisionType,
      crewMember,
      authority: this.getDecisionAuthority(crewMember, decisionType),
      storyRef,
      reasoning: context,
      affectedTeams: this.getAffectedTeams(decisionType),
      approved: false,
      timestamp: new Date().toISOString(),
    };

    return decision;
  }

  private routeDecisionRequest(decisionType: CrewDecisionType): string | null {
    const routing: Record<CrewDecisionType, string> = {
      approve_implementation: 'captain', // Executive authority
      request_revision: 'architect', // Technical authority
      block_for_security: 'security', // Veto authority
      accelerate_timeline: 'infrastructure', // DevOps authority
      add_resources: 'finance', // Resource authority
      escalate_to_human: 'communications', // Stakeholder authority
    };

    return routing[decisionType] || 'captain';
  }

  private getDecisionAuthority(
    crewMember: string,
    decisionType: CrewDecisionType
  ): 'individual' | 'consensus' | 'veto' {
    // Security always has veto authority
    if (crewMember === 'security' && decisionType === 'block_for_security') {
      return 'veto';
    }

    // High-stakes decisions require consensus
    if (decisionType === 'request_revision' || decisionType === 'add_resources') {
      return 'consensus';
    }

    // Most decisions are individual authority
    return 'individual';
  }

  private getAffectedTeams(
    decisionType: CrewDecisionType
  ): ('development' | 'project_management')[] {
    switch (decisionType) {
      case 'approve_implementation':
      case 'request_revision':
        return ['development'];
      case 'accelerate_timeline':
      case 'add_resources':
        return ['project_management'];
      case 'block_for_security':
        return ['development', 'project_management'];
      default:
        return ['development', 'project_management'];
    }
  }

  private async executeDecision(decision: CrewDecision): Promise<void> {
    console.log(`[AUTONOMY] Executing decision: ${decision.type}`);
    decision.executedAt = new Date().toISOString();

    // Route to appropriate action handler
    switch (decision.type) {
      case 'approve_implementation':
        await this.autonomouslyApproveStory(decision.storyRef);
        break;
      case 'request_revision':
        await this.autonomouslyRequestRevision(decision.storyRef);
        break;
      case 'block_for_security':
        await crewStateBroadcaster.blockStory(decision.storyRef, decision.reasoning);
        break;
      // ... other decision types
    }

    this.emit('decision:executed', decision);
  }

  private async autonomouslyApproveStory(storyRef: string): Promise<void> {
    console.log(`[AUTONOMY] Autonomously approving: ${storyRef}`);
    // This would transition story to next phase
    // In production: call story update API, create PR, etc.
  }

  private async autonomouslyRequestRevision(storyRef: string): Promise<void> {
    console.log(`[AUTONOMY] Autonomously requesting revision for: ${storyRef}`);
    // Post comment on PR, update story status, etc.
  }

  private addInsight(partialInsight: Partial<CrewInsight>): void {
    const insight: CrewInsight = {
      id: `insight-${Date.now()}`,
      type: partialInsight.type!,
      crewMember: partialInsight.crewMember!,
      targetRole: partialInsight.targetRole!,
      storyRef: partialInsight.storyRef!,
      title: partialInsight.title!,
      description: partialInsight.description!,
      actionItems: partialInsight.actionItems,
      priority: partialInsight.priority!,
      confidence: partialInsight.confidence!,
      timestamp: new Date().toISOString(),
      requiresApproval: partialInsight.requiresApproval!,
      autonomousAction: partialInsight.autonomousAction,
    };

    // Avoid duplicate insights
    const isDuplicate = this.insights.some(
      i =>
        i.storyRef === insight.storyRef &&
        i.type === insight.type &&
        i.crewMember === insight.crewMember
    );

    if (!isDuplicate) {
      this.insights.push(insight);
      this.emit('insight:created', insight);
    }
  }

  private hasBlockers(storyRef: string): boolean {
    const state = this.activeStories.get(storyRef);
    return !!(state && state.blockers && state.blockers.length > 0);
  }
}

// Singleton instance
export const crewAutonomyManager = new CrewAutonomyManager();
