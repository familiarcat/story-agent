/**
 * Crew Autonomous Learning Loop
 * 
 * Integrates crew self-awareness with real-time mission execution.
 * Enables crew to:
 * 1. Learn from each mission outcome
 * 2. Adapt team composition for next missions
 * 3. Propose system improvements autonomously
 * 4. Self-validate and certify capabilities
 * 5. Make deployment decisions (Admiral gates only policy/risk)
 * 
 * Loop: Mission Complete → Learn → Detect Patterns → Propose Improvements → Auto-Apply (non-policy) → Escalate (policy)
 */

import type {
  CrewMemberPerformance,
  MissionLearning,
  CrewAdaptiveStrategy,
  CrewNegotiation,
} from './crew-self-awareness.js';

export interface CrewLearningLoopState {
  cycleNumber: number;
  missionsProcessed: number;
  lastUpdated: string;
  performanceSnapshot: Map<string, CrewMemberPerformance>;
  missionHistory: MissionLearning[];
  detectedStrategies: CrewAdaptiveStrategy[];
  pendingAdmiralApprovals: Array<{
    proposalId: string;
    title: string;
    description: string;
    phase: number;
    submittedAt: string;
    approved: boolean | null;
  }>;
  autoAppliedTunings: Array<{
    tuningId: string;
    title: string;
    phase: number;
    appliedAt: string;
    expectedImprovement: number;
  }>;
}

/**
 * Execute one cycle of the crew learning loop
 * Called after mission completion, or on interval (e.g., every 5 missions)
 */
export async function executeCrewLearningCycle(
  state: CrewLearningLoopState,
  missionResult: {
    missionId: string;
    taskComplexity: number;
    requiredDomains: Set<string>;
    teamAssignment: string[];
    actualCost: number;
    actualLatency: number;
    consensusQuality: number;
    accuracyScore: number;
    crewMemberScores: Array<{
      crewId: string;
      qualityScore: number;
      latencyMS: number;
      accuracyScore: number;
    }>;
  },
): Promise<CrewLearningLoopState> {
  const {
    updateCrewMemberPerformance,
    detectAdaptiveStrategies,
    crewProposeSystemImprovements,
  } = await import('./crew-self-awareness.js');

  // Step 1: Update crew member performance from mission results
  for (const memberScore of missionResult.crewMemberScores) {
    updateCrewMemberPerformance(state.performanceSnapshot, missionResult.missionId, memberScore);
  }

  // Step 2: Record mission learning
  const missionLearning: MissionLearning = {
    missionId: missionResult.missionId,
    taskComplexity: missionResult.taskComplexity,
    requiredDomains: missionResult.requiredDomains,
    actualTeamSize: missionResult.teamAssignment.length,
    expectedCost: 0, // would be pre-mission estimate
    actualCost: missionResult.actualCost,
    expectedLatency: 0, // would be pre-mission estimate
    actualLatency: missionResult.actualLatency,
    consensusQuality: missionResult.consensusQuality,
    accuracyScore: missionResult.accuracyScore,
    lessonsLearned: generateLessonsLearned(missionResult),
    timestamp: new Date().toISOString(),
  };

  state.missionHistory.push(missionLearning);
  state.missionsProcessed += 1;

  // Step 3: Detect adaptive strategies (every 10 missions)
  if (state.missionsProcessed % 10 === 0) {
    const newStrategies = detectAdaptiveStrategies(state.missionHistory);
    state.detectedStrategies = newStrategies;

    // Step 4: Propose system improvements
    const proposals = crewProposeSystemImprovements(newStrategies);

    // Step 5: Separate proposals into auto-apply and Admiral-approval
    for (const proposal of proposals.proposals) {
      if (!proposal.requiresAdmiralApproval) {
        // Auto-apply tuning changes
        state.autoAppliedTunings.push({
          tuningId: `tuning_${Date.now()}`,
          title: proposal.title,
          phase: proposal.phase,
          appliedAt: new Date().toISOString(),
          expectedImprovement: proposal.expectedImprovement,
        });

        // In real system: apply the tuning to control-lane config
        console.log(`✅ AUTO-APPLIED: ${proposal.title}`);
      } else {
        // Queue for Admiral approval
        state.pendingAdmiralApprovals.push({
          proposalId: `proposal_${Date.now()}`,
          title: proposal.title,
          description: proposal.description,
          phase: proposal.phase,
          submittedAt: new Date().toISOString(),
          approved: null,
        });

        console.log(`📋 ESCALATED TO ADMIRAL: ${proposal.title}`);
      }
    }
  }

  state.cycleNumber += 1;
  state.lastUpdated = new Date().toISOString();

  return state;
}

/**
 * Crew autonomously determines next mission team composition
 * Based on learned performance + mission complexity
 */
export function crewAutonomouslySelectTeam(
  missionComplexity: number,
  requiredDomains: Set<string>,
  state: CrewLearningLoopState,
): {
  selectedTeam: string[];
  rationale: string;
  confidence: number;
  alternativesConsidered: number;
} {
  const { crewNegotiateTeamComposition } = require('./crew-self-awareness.js');

  const negotiation = crewNegotiateTeamComposition(
    missionComplexity,
    requiredDomains,
    state.performanceSnapshot,
  );

  // Check if this complexity level was seen before
  const similarMissions = state.missionHistory.filter(
    m =>
      Math.abs(m.taskComplexity - missionComplexity) < 0.1 &&
      m.requiredDomains.size === requiredDomains.size,
  );

  const confidenceFromHistory = similarMissions.length > 0
    ? Math.min(1, similarMissions.length / 10)
    : 0.5; // default to 50% if no similar missions

  // If high confidence from history, use learned team size
  let adjustedTeamSize = negotiation.finalDecision.length;
  if (similarMissions.length > 5) {
    const avgTeamSize =
      similarMissions.reduce((sum, m) => sum + m.actualTeamSize, 0) /
      similarMissions.length;
    adjustedTeamSize = Math.round(avgTeamSize);
  }

  // Rebuild team with adjusted size
  const finalTeam = negotiation.finalDecision.slice(0, adjustedTeamSize);

  return {
    selectedTeam: finalTeam,
    rationale: `${negotiation.decisionRationale} (based on ${similarMissions.length} prior missions)`,
    confidence: confidenceFromHistory,
    alternativesConsidered: negotiation.alternativeTeams.length,
  };
}

/**
 * Crew validates its own decision-making before large deployment
 * Self-checks: false positive rate, consensus quality, accuracy trends
 */
export function crewSelfValidateReadiness(
  state: CrewLearningLoopState,
): {
  ready: boolean;
  confidence: number;
  concerns: string[];
  validationResults: {
    consensusQualityAvg: number;
    accuracyAvg: number;
    falsePositiveRate: number;
    consensusQualityTrend: 'improving' | 'stable' | 'declining';
    accuracyTrend: 'improving' | 'stable' | 'declining';
  };
} {
  if (state.missionHistory.length < 20) {
    return {
      ready: false,
      confidence: 0.3,
      concerns: [
        `Only ${state.missionHistory.length}/20 missions completed (need 20 for validation)`,
      ],
      validationResults: {
        consensusQualityAvg: 0,
        accuracyAvg: 0,
        falsePositiveRate: 0,
        consensusQualityTrend: 'stable',
        accuracyTrend: 'stable',
      },
    };
  }

  // Calculate averages
  const consensusQualityAvg =
    state.missionHistory.reduce((sum, m) => sum + m.consensusQuality, 0) /
    state.missionHistory.length;
  const accuracyAvg =
    state.missionHistory.reduce((sum, m) => sum + m.accuracyScore, 0) /
    state.missionHistory.length;

  // Calculate false positive rate (decisions that seemed good but weren't)
  const falsePositives = state.missionHistory.filter(
    m => m.consensusQuality > 0.9 && m.accuracyScore < 0.75,
  ).length;
  const falsePositiveRate = falsePositives / state.missionHistory.length;

  // Detect trends (compare first 10 vs last 10 missions)
  const firstHalf = state.missionHistory.slice(
    0,
    Math.floor(state.missionHistory.length / 2),
  );
  const secondHalf = state.missionHistory.slice(
    Math.floor(state.missionHistory.length / 2),
  );

  const consensusQualityFirst =
    firstHalf.reduce((sum, m) => sum + m.consensusQuality, 0) / firstHalf.length;
  const consensusQualitySecond =
    secondHalf.reduce((sum, m) => sum + m.consensusQuality, 0) /
    secondHalf.length;
  const consensusQualityTrend: 'improving' | 'stable' | 'declining' =
    consensusQualitySecond > consensusQualityFirst + 0.05
      ? 'improving'
      : consensusQualitySecond < consensusQualityFirst - 0.05
        ? 'declining'
        : 'stable';

  const accuracyFirst =
    firstHalf.reduce((sum, m) => sum + m.accuracyScore, 0) / firstHalf.length;
  const accuracySecond =
    secondHalf.reduce((sum, m) => sum + m.accuracyScore, 0) / secondHalf.length;
  const accuracyTrend: 'improving' | 'stable' | 'declining' =
    accuracySecond > accuracyFirst + 0.05
      ? 'improving'
      : accuracySecond < accuracyFirst - 0.05
        ? 'declining'
        : 'stable';

  // Validation criteria
  const concerns: string[] = [];
  if (consensusQualityAvg < 0.85)
    concerns.push(
      `Consensus quality ${(consensusQualityAvg * 100).toFixed(0)}% (target ≥85%)`,
    );
  if (accuracyAvg < 0.80)
    concerns.push(`Accuracy ${(accuracyAvg * 100).toFixed(0)}% (target ≥80%)`);
  if (falsePositiveRate > 0.05)
    concerns.push(
      `False positive rate ${(falsePositiveRate * 100).toFixed(1)}% (target <5%)`,
    );
  if (consensusQualityTrend === 'declining')
    concerns.push('Consensus quality declining — investigate cause');
  if (accuracyTrend === 'declining')
    concerns.push('Accuracy declining — may need Phase review');

  const ready =
    consensusQualityAvg >= 0.85 &&
    accuracyAvg >= 0.8 &&
    falsePositiveRate <= 0.05;
  const confidence = Math.min(1, state.missionHistory.length / 100); // increases with mission count

  return {
    ready,
    confidence,
    concerns,
    validationResults: {
      consensusQualityAvg,
      accuracyAvg,
      falsePositiveRate,
      consensusQualityTrend,
      accuracyTrend,
    },
  };
}

/**
 * Crew generates lessons learned from mission
 */
function generateLessonsLearned(missionResult: {
  actualCost: number;
  actualLatency: number;
  consensusQuality: number;
  accuracyScore: number;
  taskComplexity: number;
  teamAssignment: string[];
}): string[] {
  const lessons: string[] = [];

  if (missionResult.consensusQuality > 0.95) {
    lessons.push('High consensus (>95%) — consider Phase 3 early exit threshold reduction');
  }

  if (missionResult.actualLatency < 15000 && missionResult.teamAssignment.length < 7) {
    lessons.push('Small team delivered fast (<15s) — Phase 2 routing effective for this domain');
  }

  if (missionResult.actualCost > 0.001) {
    lessons.push('Cost higher than baseline — review team size, consider full crew for next complex task');
  }

  if (missionResult.accuracyScore < 0.75) {
    lessons.push(
      'Accuracy concern (<75%) — may need larger team or additional reflection round',
    );
  }

  if (missionResult.taskComplexity > 0.7 && missionResult.teamAssignment.length < 8) {
    lessons.push('High complexity (>0.7) with small team — riskier, monitor next mission');
  }

  return lessons;
}

/**
 * Initialize crew learning loop state
 */
export function initializeCrewLearningLoop(): CrewLearningLoopState {
  return {
    cycleNumber: 0,
    missionsProcessed: 0,
    lastUpdated: new Date().toISOString(),
    performanceSnapshot: new Map(),
    missionHistory: [],
    detectedStrategies: [],
    pendingAdmiralApprovals: [],
    autoAppliedTunings: [],
  };
}

/**
 * Format crew learning state for Admiral briefing
 */
export function formatCrewLearningBriefing(state: CrewLearningLoopState): string {
  const lines = [
    '🖖 CREW AUTONOMOUS LEARNING REPORT',
    '='.repeat(50),
    '',
    `Cycle: ${state.cycleNumber}`,
    `Missions Processed: ${state.missionsProcessed}`,
    `Last Updated: ${state.lastUpdated}`,
    '',
    'PERFORMANCE SUMMARY:',
    `  • Crew Members Trained: ${state.performanceSnapshot.size}`,
    `  • Auto-Applied Tunings: ${state.autoAppliedTunings.length}`,
    `  • Pending Admiral Approvals: ${state.pendingAdmiralApprovals.filter(p => !p.approved).length}`,
    '',
    'ADAPTIVE STRATEGIES DETECTED:',
    ...state.detectedStrategies.map(
      s =>
        `  • ${s.pattern} (confidence: ${(s.confidence * 100).toFixed(0)}%, samples: ${s.samplesCount})`,
    ),
    '',
    'AUTO-APPLIED TUNINGS:',
    ...state.autoAppliedTunings.map(
      t =>
        `  ✅ ${t.title} (Phase ${t.phase}, improvement: ${(t.expectedImprovement * 100).toFixed(0)}%)`,
    ),
    '',
    'PENDING ADMIRAL APPROVALS:',
    ...state.pendingAdmiralApprovals
      .filter(p => !p.approved)
      .map(p => `  📋 [Phase ${p.phase}] ${p.title}`),
    '',
  ];

  return lines.join('\n');
}
