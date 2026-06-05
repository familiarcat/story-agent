/**
 * Crew Communication Bus - Enables inter-crew coordination and consensus
 *
 * Allows crew members to:
 * - Discuss decisions asynchronously
 * - Reach consensus on complex issues
 * - Escalate disagreements
 * - Share findings for collaborative problem-solving
 */

import { EventEmitter } from 'events';

export type DebatePosition = 'support' | 'challenge' | 'amendment' | 'abstain';

export interface DebateStatement {
  crewId: string;
  crewName: string;
  position: DebatePosition;
  statement: string;
  evidence: string[];
  confidence: number; // 0-100
  timestamp: string;
}

export interface CrewConsensusRequest {
  id: string;
  storyRef: string;
  topic: string;
  participants: string[]; // crew IDs
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  statements: DebateStatement[];
  consensusResult?: 'approved' | 'rejected' | 'needs_human_input';
  finalSummary?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CrewFindings {
  storyRef: string;
  from: string; // crewId
  findings: string[];
  recommendations: string[];
  concerns: string[];
  confidenceScore: number;
  sharedWith: string[]; // crew IDs who received this
  timestamp: string;
}

export class CrewCommunicationBus extends EventEmitter {
  private consensusRequests: Map<string, CrewConsensusRequest> = new Map();
  private sharedFindings: CrewFindings[] = [];
  private crewAvailability: Map<string, boolean> = new Map(); // crewId → available
  private discussionThreads: Map<string, DebateStatement[]> = new Map();

  constructor() {
    super();
    this.initializeAvailability();
  }

  /**
   * Request consensus from crew members on a decision.
   * Useful for complex decisions that need multiple perspectives.
   */
  async requestConsensus(
    storyRef: string,
    topic: string,
    participantCrewIds: string[]
  ): Promise<CrewConsensusRequest> {
    const requestId = `consensus-${storyRef}-${Date.now()}`;

    const request: CrewConsensusRequest = {
      id: requestId,
      storyRef,
      topic,
      participants: participantCrewIds,
      status: 'pending',
      statements: [],
      createdAt: new Date().toISOString(),
    };

    this.consensusRequests.set(requestId, request);
    console.log(`[CREW_COMM] Consensus requested: ${topic} (${requestId})`);

    // Notify participants
    this.emit(`consensus:requested:${requestId}`, request);

    // Simulate crew thinking time, then generate responses
    await this.simulateCrewDebate(requestId, request);

    return request;
  }

  /**
   * Add a statement from a crew member in a debate.
   */
  addDebateStatement(
    requestId: string,
    crewId: string,
    crewName: string,
    position: DebatePosition,
    statement: string,
    evidence: string[] = [],
    confidence: number = 75
  ): boolean {
    const request = this.consensusRequests.get(requestId);
    if (!request) {
      console.warn(`[CREW_COMM] Consensus request not found: ${requestId}`);
      return false;
    }

    const debateStatement: DebateStatement = {
      crewId,
      crewName,
      position,
      statement,
      evidence,
      confidence,
      timestamp: new Date().toISOString(),
    };

    request.statements.push(debateStatement);
    request.status = 'in_progress';

    console.log(
      `[CREW_COMM] ${crewName} (${position}): ${statement.substring(0, 60)}...`
    );

    this.emit(`debate:statement:${requestId}`, debateStatement);

    // Check if consensus reached
    this.evaluateConsensus(requestId);

    return true;
  }

  /**
   * Share findings across crew members.
   * One crew member's findings inform others.
   */
  shareFindings(
    storyRef: string,
    fromCrewId: string,
    findings: string[],
    recommendations: string[],
    concerns: string[],
    confidenceScore: number,
    shareWithCrewIds: string[]
  ): CrewFindings {
    const crewFindings: CrewFindings = {
      storyRef,
      from: fromCrewId,
      findings,
      recommendations,
      concerns,
      confidenceScore,
      sharedWith: shareWithCrewIds,
      timestamp: new Date().toISOString(),
    };

    this.sharedFindings.push(crewFindings);

    console.log(
      `[CREW_COMM] ${fromCrewId} shared findings with: ${shareWithCrewIds.join(', ')}`
    );

    this.emit('findings:shared', crewFindings);

    return crewFindings;
  }

  /**
   * Get all findings shared for a story.
   */
  getFindingsForStory(storyRef: string): CrewFindings[] {
    return this.sharedFindings.filter(f => f.storyRef === storyRef);
  }

  /**
   * Get findings from specific crew member.
   */
  getFindingsFromCrew(crewId: string, storyRef?: string): CrewFindings[] {
    return this.sharedFindings.filter(
      f => f.from === crewId && (!storyRef || f.storyRef === storyRef)
    );
  }

  /**
   * Mark a crew member as busy/unavailable.
   */
  setCrewAvailability(crewId: string, available: boolean): void {
    this.crewAvailability.set(crewId, available);
    this.emit('crew:availability:changed', { crewId, available });
  }

  /**
   * Check if crew member is available for new work.
   */
  isCrewAvailable(crewId: string): boolean {
    return this.crewAvailability.get(crewId) !== false;
  }

  /**
   * Get consensus result when complete.
   */
  getConsensusResult(requestId: string): CrewConsensusRequest | null {
    return this.consensusRequests.get(requestId) || null;
  }

  /**
   * Get all active consensus requests.
   */
  getActiveConsensusRequests(): CrewConsensusRequest[] {
    return Array.from(this.consensusRequests.values()).filter(
      r => r.status === 'pending' || r.status === 'in_progress'
    );
  }

  // ── Private Methods ────────────────────────────────────────────────────────

  private initializeAvailability(): void {
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
      this.crewAvailability.set(crewId, true);
    });
  }

  private async simulateCrewDebate(
    requestId: string,
    request: CrewConsensusRequest
  ): Promise<void> {
    // Simulate crew thinking time (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const crewNames: Record<string, string> = {
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

    // Generate synthetic debate statements
    const debateResponses: Array<{
      crewId: string;
      position: DebatePosition;
      statement: string;
    }> = [
      {
        crewId: 'architect',
        position: 'support',
        statement:
          'From a technical perspective, this approach aligns well with our architecture.',
      },
      {
        crewId: 'security',
        position: 'challenge',
        statement:
          'We need to evaluate potential security implications before moving forward.',
      },
      {
        crewId: 'captain',
        position: 'amendment',
        statement:
          'Agree on direction, but suggest we also consider timeline impact.',
      },
    ];

    // Add responses from interested crew
    for (const response of debateResponses) {
      if (request.participants.includes(response.crewId)) {
        this.addDebateStatement(
          requestId,
          response.crewId,
          crewNames[response.crewId] || response.crewId,
          response.position,
          response.statement,
          [],
          75 + Math.random() * 20
        );

        // Simulate thinking time between responses
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      }
    }
  }

  private evaluateConsensus(requestId: string): void {
    const request = this.consensusRequests.get(requestId);
    if (!request || request.status === 'complete') {
      return;
    }

    // Consensus criteria:
    // - All participants have spoken (or majority after timeout)
    // - More support than challenge positions
    // - No vetoes

    const supportCount = request.statements.filter(s => s.position === 'support').length;
    const challengeCount = request.statements.filter(s => s.position === 'challenge')
      .length;
    const vetoCount = request.statements.filter(
      s => s.crewId === 'security' && s.position === 'challenge'
    ).length;

    // Check for veto (security override)
    if (vetoCount > 0) {
      request.status = 'complete';
      request.consensusResult = 'rejected';
      request.finalSummary = 'Security raised concerns - requires revision.';
      request.completedAt = new Date().toISOString();
      console.log(`[CREW_COMM] Consensus REJECTED (security veto): ${requestId}`);
      this.emit(`consensus:complete:${requestId}`, request);
      return;
    }

    // Check if consensus reached (2:1 support:challenge ratio)
    if (
      supportCount >= 2 &&
      (challengeCount === 0 || supportCount > challengeCount * 2)
    ) {
      request.status = 'complete';
      request.consensusResult = 'approved';
      request.finalSummary = `Crew consensus reached: ${supportCount} support vs ${challengeCount} challenges.`;
      request.completedAt = new Date().toISOString();
      console.log(`[CREW_COMM] Consensus APPROVED: ${requestId}`);
      this.emit(`consensus:complete:${requestId}`, request);
      return;
    }

    // If debate seems exhausted but no clear winner, needs human input
    if (request.statements.length >= request.participants.length) {
      request.status = 'complete';
      request.consensusResult = 'needs_human_input';
      request.finalSummary =
        'Crew could not reach consensus - human decision needed.';
      request.completedAt = new Date().toISOString();
      console.log(`[CREW_COMM] Consensus STALLED (needs human): ${requestId}`);
      this.emit(`consensus:complete:${requestId}`, request);
    }
  }
}

// Singleton instance
export const crewCommunicationBus = new CrewCommunicationBus();
