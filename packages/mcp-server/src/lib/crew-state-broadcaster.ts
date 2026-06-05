/**
 * Crew State Broadcaster - Real-time execution state updates
 *
 * Responsible for:
 * - Tracking crew member execution progress
 * - Determining next steps based on findings
 * - Broadcasting state changes to UI clients via WebSocket
 * - Persisting state to Supabase for archival
 */

import { EventEmitter } from 'events';
import type {
  CrewExecutionState,
  CrewMemberExecution,
  ExecutionPhase,
  ProjectExecutionState,
  CrewRole,
} from '@story-agent/shared';

interface CrewStateCache {
  [storyRef: string]: CrewExecutionState;
}

interface ProjectCache {
  [projectId: string]: ProjectExecutionState;
}

export class CrewStateBroadcaster extends EventEmitter {
  private storyStateCache: CrewStateCache = {};
  private projectCache: ProjectCache = {};
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // storyRef → subscriber IDs

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent subscriptions
  }

  /**
   * Initialize a new crew execution state for a story.
   * Called at the start of Phase 1.
   */
  initializeStoryExecution(
    storyRef: string,
    crewIds: string[],
    phase: ExecutionPhase = 'phase_1_execution'
  ): CrewExecutionState {
    const state: CrewExecutionState = {
      id: `crew-state-${storyRef}-${Date.now()}`,
      storyRef,
      phase,
      status: 'in_progress',
      crewExecutions: crewIds.map(crewId => ({
        crewId,
        crewName: this.crewIdToName(crewId),
        specialty: this.crewIdToSpecialty(crewId),
        status: 'pending',
      })),
      activeCrewMembers: crewIds,
      activeSinceMs: Date.now(),
      nextStep: `Starting ${phase}: Awaiting findings from ${crewIds.length} crew members`,
      blockers: [],
      totalCostUsd: 0,
      totalExecutionTimeMs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      broadcastCount: 0,
    };

    this.storyStateCache[storyRef] = state;
    this.broadcastStateChange(storyRef, state);
    return state;
  }

  /**
   * Record a crew member's finding and update state.
   * Called whenever a crew member completes LLM execution.
   */
  async recordCrewFinding(
    storyRef: string,
    crewId: string,
    finding: {
      findings: string;
      recommendations: string[];
      confidence: number;
      isVeto?: boolean;
      costUsd: number;
      durationMs: number;
    }
  ): Promise<CrewExecutionState> {
    let state = this.storyStateCache[storyRef];
    if (!state) {
      throw new Error(`No execution state found for story: ${storyRef}`);
    }

    // Update crew member execution
    const crewExecution = state.crewExecutions.find(c => c.crewId === crewId);
    if (crewExecution) {
      crewExecution.status = finding.isVeto ? 'vetoed' : 'complete';
      crewExecution.findings = finding.findings;
      crewExecution.recommendations = finding.recommendations;
      crewExecution.confidence = finding.confidence;
      crewExecution.isVeto = finding.isVeto;
      crewExecution.costUsd = finding.costUsd;
      crewExecution.executedAt = new Date().toISOString();
      crewExecution.durationMs = finding.durationMs;
    }

    // Update aggregates
    state.totalCostUsd += finding.costUsd;
    state.totalExecutionTimeMs = Math.max(
      state.totalExecutionTimeMs,
      finding.durationMs
    ); // Max of all durations
    state.updatedAt = new Date().toISOString();

    // Determine next step
    state.nextStep = this.determineNextStep(state);
    state.status = this.determineStatus(state);

    // Broadcast update
    this.broadcastStateChange(storyRef, state);

    return state;
  }

  /**
   * Transition to next phase (e.g., Phase 1 → Phase 2).
   */
  async transitionPhase(
    storyRef: string,
    newPhase: ExecutionPhase
  ): Promise<CrewExecutionState> {
    let state = this.storyStateCache[storyRef];
    if (!state) {
      throw new Error(`No execution state found for story: ${storyRef}`);
    }

    state.phase = newPhase;
    state.updatedAt = new Date().toISOString();

    if (newPhase !== 'complete') {
      // Reset crew executions for next phase
      state.crewExecutions = state.crewExecutions.map(c => ({
        ...c,
        status: 'pending',
        findings: undefined,
        recommendations: undefined,
        confidence: undefined,
        isVeto: undefined,
      }));
      state.status = 'in_progress';
    } else {
      state.status = 'complete';
    }

    state.nextStep = this.determineNextStep(state);
    this.broadcastStateChange(storyRef, state);
    return state;
  }

  /**
   * Mark story as blocked (veto, error, manual block).
   */
  async blockStory(
    storyRef: string,
    reason: string
  ): Promise<CrewExecutionState> {
    let state = this.storyStateCache[storyRef];
    if (!state) {
      throw new Error(`No execution state found for story: ${storyRef}`);
    }

    state.status = 'blocked';
    state.blockers = state.blockers || [];
    if (!state.blockers.includes(reason)) {
      state.blockers.push(reason);
    }
    state.nextStep = `🛑 BLOCKED: ${reason}`;
    state.updatedAt = new Date().toISOString();

    this.broadcastStateChange(storyRef, state);
    return state;
  }

  /**
   * Get current state for a story.
   */
  getStoryState(storyRef: string): CrewExecutionState | null {
    return this.storyStateCache[storyRef] || null;
  }

  /**
   * Get all active stories.
   */
  getActiveStories(): CrewExecutionState[] {
    return Object.values(this.storyStateCache).filter(
      s => s.status === 'in_progress'
    );
  }

  /**
   * Watch a story - returns async iterator of state updates.
   * Used by WebSocket server to stream updates.
   */
  watchStory(storyRef: string): AsyncIterableIterator<CrewExecutionState> {
    const state = this.storyStateCache[storyRef];
    if (!state) {
      throw new Error(`No execution state found for story: ${storyRef}`);
    }

    const self = this;
    let finished = false;
    const queue: CrewExecutionState[] = [state]; // Start with current state

    const listener = (updatedState: CrewExecutionState) => {
      queue.push(updatedState);
    };

    this.on(`story:${storyRef}`, listener);

    return {
      async next() {
        while (queue.length === 0 && !finished) {
          // Wait for next update
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        return { done: true };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  /**
   * Subscribe a client to story updates.
   * Returns unsubscribe function.
   */
  subscribe(
    storyRef: string,
    clientId: string,
    callback: (state: CrewExecutionState) => void
  ): () => void {
    // Track subscription
    if (!this.activeSubscriptions.has(storyRef)) {
      this.activeSubscriptions.set(storyRef, new Set());
    }
    this.activeSubscriptions.get(storyRef)!.add(clientId);

    // Send current state immediately
    const currentState = this.storyStateCache[storyRef];
    if (currentState) {
      callback(currentState);
    }

    // Listen for future updates
    const listener = (state: CrewExecutionState) => callback(state);
    this.on(`story:${storyRef}`, listener);

    // Return unsubscribe function
    return () => {
      this.off(`story:${storyRef}`, listener);
      this.activeSubscriptions.get(storyRef)?.delete(clientId);
    };
  }

  /**
   * Get subscription count for a story.
   */
  getSubscriptionCount(storyRef: string): number {
    return this.activeSubscriptions.get(storyRef)?.size || 0;
  }

  /**
   * Determine next step based on crew progress.
   * Human-readable description of what's currently happening.
   */
  private determineNextStep(state: CrewExecutionState): string {
    const completedCount = state.crewExecutions.filter(
      c => c.status === 'complete'
    ).length;
    const totalCount = state.crewExecutions.length;
    const vetoDCount = state.crewExecutions.filter(c => c.status === 'vetoed').length;

    // Check for vetoes
    if (vetoDCount > 0) {
      const vetoers = state.crewExecutions
        .filter(c => c.status === 'vetoed')
        .map(c => c.crewName)
        .join(', ');
      return `🛑 BLOCKED: Security veto from ${vetoers}`;
    }

    // Still waiting for crew
    if (completedCount < totalCount) {
      const remaining = state.crewExecutions
        .filter(c => c.status !== 'complete')
        .map(c => c.crewName)
        .join(', ');
      return `⏳ Awaiting findings from: ${remaining} (${completedCount}/${totalCount} done)`;
    }

    // All crew complete - determine phase-specific next step
    if (state.phase === 'phase_1_execution') {
      return '✅ Phase 1 complete. Ready to create PR.';
    } else if (state.phase === 'phase_2_revision') {
      return '✅ Revision complete. Ready to merge.';
    } else if (state.phase === 'complete') {
      return '🎉 Story delivery complete!';
    }

    return 'Ready for next step';
  }

  /**
   * Determine overall status based on crew findings.
   */
  private determineStatus(
    state: CrewExecutionState
  ): 'pending' | 'in_progress' | 'blocked' | 'complete' {
    const hasVeto = state.crewExecutions.some(c => c.status === 'vetoed');
    if (hasVeto) return 'blocked';

    const hasError = state.crewExecutions.some(c => c.status === 'error');
    if (hasError) return 'blocked';

    const allComplete = state.crewExecutions.every(
      c => c.status === 'complete' || c.status === 'vetoed'
    );
    if (allComplete) {
      return state.phase === 'complete' ? 'complete' : 'in_progress';
    }

    return 'in_progress';
  }

  /**
   * Broadcast state change to all listeners.
   */
  private broadcastStateChange(storyRef: string, state: CrewExecutionState): void {
    state.broadcastCount++;
    state.updatedAt = new Date().toISOString();

    // Emit to TypeScript listeners
    this.emit(`story:${storyRef}`, state);
    this.emit('any:story-update', { storyRef, state });

    // TODO: Persist to Supabase sa_crew_state table
    // await db.upsertCrewState(storyRef, state);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private crewIdToName(crewId: string): string {
    const names: Record<string, string> = {
      captain: 'Picard',
      architect: 'Data',
      developer: 'Riker',
      infrastructure: 'Geordi',
      devops: "O'Brien",
      security: 'Worf',
      qa: 'Yar',
      analyst: 'Troi',
      health: 'Crusher',
      communications: 'Uhura',
      finance: 'Quark',
    };
    return names[crewId] || crewId;
  }

  private crewIdToSpecialty(crewId: string): string {
    const specialties: Record<string, string> = {
      captain: 'Strategic Decomposition',
      architect: 'Technical Validation',
      developer: 'Implementation Tactics',
      infrastructure: 'DevOps & Scaling',
      devops: 'Build & CI/CD',
      security: 'Security & Veto Authority',
      qa: 'Test Strategy',
      analyst: 'Stakeholder Alignment',
      health: 'Code Health',
      communications: 'Requirement Clarity',
      finance: 'Cost & Resources',
    };
    return specialties[crewId] || 'Unknown';
  }

  /**
   * Clear all cached state (useful for testing or reset).
   */
  clear(): void {
    this.storyStateCache = {};
    this.projectCache = {};
    this.activeSubscriptions.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const crewStateBroadcaster = new CrewStateBroadcaster();
