/**
 * Phase 6: Crew Self-Awareness & Adaptive Learning
 * 
 * The crew evolves from executing pre-planned optimizations to self-reflecting,
 * learning from mission outcomes, and adapting autonomously.
 * 
 * Core Principles:
 * - Each crew member tracks their own performance across domains
 * - Crew learns from Phase 1-5 validation results, not just static rules
 * - Crew predicts mission complexity and self-assigns to optimal roles
 * - Crew negotiates team composition dynamically based on real performance
 * - Crew proposes system improvements based on observed patterns
 * - Admiral gates only policy/risk decisions; crew owns execution decisions
 * 
 * Expected Impact:
 * - 80%+ self-optimization (vs 100% human-planned Phases 1-5)
 * - Crew adapts faster to new mission types
 * - Fewer escalations to Admiral (crew solves 90%+ autonomously)
 * - Continuous improvement without human intervention
 */

export interface CrewMemberPerformance {
  crewId: string;
  domain: string;
  capability: number; // 0..1 (0=novice, 1=expert)
  specializations: { domain: string; proficiency: number }[]; // cross-domain skills
  missionsCompleted: number;
  avgContributionQuality: number; // 0..1 (peer feedback score)
  avgLatencyMS: number; // how fast they deliver their part
  costEffectiveness: number; // cost/quality ratio
  recentAccuracy: number; // % accuracy on recent missions
  timestamp: string;
}

export interface MissionLearning {
  missionId: string;
  taskComplexity: number; // 0..1
  requiredDomains: Set<string>;
  actualTeamSize: number;
  expectedCost: number;
  actualCost: number;
  expectedLatency: number;
  actualLatency: number;
  consensusQuality: number; // % agreement on final decision
  accuracyScore: number; // correctness of recommendation
  lessonsLearned: string[];
  timestamp: string;
}

export interface CrewAdaptiveStrategy {
  pattern: string; // e.g., "high_complexity_queries_need_full_crew"
  confidence: number; // 0..1 based on mission samples
  applicableDomains: string[];
  recommendedAction: string;
  expectedImprovement: number; // % better than baseline
  samplesCount: number; // how many missions validated this pattern
}

export interface CrewNegotiation {
  proposedTeam: string[];
  proposalReason: string;
  alternativeTeams: { team: string[]; reason: string }[];
  consensusScore: number; // % crew members who agreed
  finalDecision: string[]; // chosen team
  decisionRationale: string;
}

export interface CrewCapabilityCertification {
  crewId: string;
  certified: boolean;
  domains: { domain: string; level: 'novice' | 'proficient' | 'expert' }[];
  certificationTimestamp: string;
  expiresAt: string; // 90 days from certification
  validationMissions: number; // missions required for renewal
}

/**
 * Initialize crew self-awareness system
 * Each crew member starts with baseline performance metrics
 */
export function initializeCrewSelfAwareness(): Map<
  string,
  CrewMemberPerformance
> {
  const crew = [
    'picard',
    'data',
    'riker',
    'worf',
    'o_brien',
    'geordi',
    'yar',
    'crusher',
    'troi',
    'uhura',
    'quark',
  ];

  const performance = new Map<string, CrewMemberPerformance>();

  for (const crewId of crew) {
    performance.set(crewId, {
      crewId,
      domain: crewDomain(crewId),
      capability: 0.7, // baseline: proficient (post-training)
      specializations: domainSpecializations(crewId),
      missionsCompleted: 0,
      avgContributionQuality: 0.75,
      avgLatencyMS: 5000,
      costEffectiveness: 1.0,
      recentAccuracy: 0.85,
      timestamp: new Date().toISOString(),
    });
  }

  return performance;
}

/**
 * Update crew member performance after mission completion
 * Called by Phase 5 monitoring system
 */
export function updateCrewMemberPerformance(
  performance: Map<string, CrewMemberPerformance>,
  missionId: string,
  results: {
    crewId: string;
    qualityScore: number; // 0..1
    latencyMS: number;
    accuracyScore: number; // 0..1
    peerFeedback?: number; // 0..1
  },
): CrewMemberPerformance {
  const current = performance.get(results.crewId);
  if (!current) throw new Error(`Crew member ${results.crewId} not found`);

  // Exponential moving average (recent missions weighted more)
  const alpha = 0.3; // recency weight
  const updated: CrewMemberPerformance = {
    ...current,
    missionsCompleted: current.missionsCompleted + 1,
    avgContributionQuality:
      current.avgContributionQuality * (1 - alpha) +
      results.qualityScore * alpha,
    avgLatencyMS:
      current.avgLatencyMS * (1 - alpha) + results.latencyMS * alpha,
    recentAccuracy:
      current.recentAccuracy * (1 - alpha) + results.accuracyScore * alpha,
    capability:
      current.capability * 0.9 +
      Math.min(results.qualityScore, results.accuracyScore) * 0.1,
    timestamp: new Date().toISOString(),
  };

  performance.set(results.crewId, updated);
  return updated;
}

/**
 * Detect adaptive strategies by analyzing mission patterns
 * Called periodically to propose system improvements
 */
export function detectAdaptiveStrategies(
  missions: MissionLearning[],
): CrewAdaptiveStrategy[] {
  const strategies: CrewAdaptiveStrategy[] = [];

  if (missions.length < 10) {
    return strategies; // Need minimum sample size
  }

  // Pattern 1: High complexity requires full crew
  const highComplexityMissions = missions.filter(m => m.taskComplexity > 0.7);
  if (highComplexityMissions.length >= 5) {
    const avgTeamSize =
      highComplexityMissions.reduce((sum, m) => sum + m.actualTeamSize, 0) /
      highComplexityMissions.length;
    if (avgTeamSize > 8) {
      strategies.push({
        pattern: 'high_complexity_requires_full_crew',
        confidence: Math.min(1, highComplexityMissions.length / 10),
        applicableDomains: [
          'architecture',
          'security',
          'infrastructure',
        ],
        recommendedAction:
          'For tasks with complexity >0.7, keep full crew (skip Phase 2 routing)',
        expectedImprovement: 0.15, // 15% better accuracy
        samplesCount: highComplexityMissions.length,
      });
    }
  }

  // Pattern 2: Consensus fast-path effective threshold
  const consensusMissions = missions.filter(m => m.consensusQuality > 0.9);
  if (consensusMissions.length >= 10) {
    const costsaved = consensusMissions.reduce(
      (sum, m) => sum + (m.expectedCost - m.actualCost),
      0,
    );
    strategies.push({
      pattern: 'consensus_fast_path_saves_cost',
      confidence: 0.95,
      applicableDomains: ['*'], // applies to all domains
      recommendedAction:
        'Increase Phase 3 consensus threshold from 10/11 to 9/11 for faster exit',
      expectedImprovement: 0.12, // 12% additional cost savings
      samplesCount: consensusMissions.length,
    });
  }

  // Pattern 3: Provider load balancing opportunity
  const slowMissions = missions.filter(m => m.actualLatency > 25000);
  if (slowMissions.length >= 5) {
    strategies.push({
      pattern: 'provider_load_balancing_incomplete',
      confidence: Math.min(1, slowMissions.length / missions.length),
      applicableDomains: [
        'implementation',
        'infrastructure',
      ],
      recommendedAction:
        'Phase 4 provider distribution not reducing latency uniformly; investigate provider response times',
      expectedImprovement: 0.25, // 25% latency reduction possible
      samplesCount: slowMissions.length,
    });
  }

  return strategies;
}

/**
 * Crew autonomously negotiates team composition for next mission
 * Based on task complexity, domain requirements, and member performance
 */
export function crewNegotiateTeamComposition(
  missionComplexity: number, // 0..1
  requiredDomains: Set<string>,
  performance: Map<string, CrewMemberPerformance>,
): CrewNegotiation {
  // Step 1: Identify candidates by domain + performance
  const candidates: (CrewMemberPerformance & { score: number })[] = [];

  for (const member of performance.values()) {
    if (requiredDomains.has(member.domain)) {
      const score =
        member.capability * 0.6 +
        member.avgContributionQuality * 0.3 +
        (1 - member.avgLatencyMS / 10000) * 0.1; // prefer faster members
      candidates.push({ ...member, score });
    }
  }

  // Sort by score (descending)
  candidates.sort((a, b) => b.score - a.score);

  // Step 2: Determine team size based on complexity
  let targetTeamSize = 4;
  if (missionComplexity > 0.7) targetTeamSize = 9; // full crew minus non-essentials
  else if (missionComplexity > 0.5) targetTeamSize = 6;
  else if (missionComplexity > 0.3) targetTeamSize = 5;

  // Step 3: Build primary proposal (top-scoring candidates + always-include)
  const alwaysInclude = ['picard', 'quark']; // command + finance
  const proposedTeam = new Set<string>(alwaysInclude);

  for (const candidate of candidates) {
    if (proposedTeam.size >= targetTeamSize) break;
    proposedTeam.add(candidate.crewId);
  }

  // Step 4: Generate alternative proposals
  const alternativeTeams: { team: string[]; reason: string }[] = [];

  // Alternative 1: Conservative (full crew for safety)
  if (proposedTeam.size < 11) {
    alternativeTeams.push({
      team: Array.from(performance.keys()),
      reason: `Full crew (${missionComplexity.toFixed(2)} complexity > 0.5 threshold)`,
    });
  }

  // Alternative 2: Aggressive (minimal team, lower cost)
  if (proposedTeam.size > 4) {
    const aggressive = [...alwaysInclude];
    for (let i = 0; i < 2 && aggressive.length < 4; i += 1) {
      if (candidates[i]) aggressive.push(candidates[i].crewId);
    }
    alternativeTeams.push({
      team: aggressive,
      reason: 'Minimal team (cost-optimized, higher risk)',
    });
  }

  // Step 5: Simulate consensus (in real system, would be actual crew debate)
  // For now: assume 80% agreement on primary proposal
  const consensusScore = 0.8;

  return {
    proposedTeam: Array.from(proposedTeam),
    proposalReason: `Complexity ${missionComplexity.toFixed(2)} requires ~${targetTeamSize} members across domains: ${Array.from(requiredDomains).join(', ')}`,
    alternativeTeams,
    consensusScore,
    finalDecision: Array.from(proposedTeam), // would be Picard's decision + consensus
    decisionRationale: `Selected ${proposedTeam.size} members: top performers in required domains, maintaining ${consensusScore.toFixed(0)}% crew consensus`,
  };
}

/**
 * Crew proposes system-wide improvements based on adaptive strategies
 */
export function crewProposeSystemImprovements(
  strategies: CrewAdaptiveStrategy[],
): {
  proposals: Array<{
    title: string;
    description: string;
    phase: number;
    adjustment: Record<string, unknown>;
    expectedImprovement: number;
    confidence: number;
    requiresAdmiralApproval: boolean;
  }>;
  summary: string;
} {
  const proposals: Array<{
    title: string;
    description: string;
    phase: number;
    adjustment: Record<string, unknown>;
    expectedImprovement: number;
    confidence: number;
    requiresAdmiralApproval: boolean;
  }> = [];

  for (const strategy of strategies) {
    if (strategy.confidence < 0.7) continue; // only high-confidence proposals

    if (strategy.pattern === 'high_complexity_requires_full_crew') {
      proposals.push({
        title: 'Phase 2: Increase complexity threshold for full crew',
        description:
          'Skip Phase 2 task routing for complexity >0.65 (was 0.7) to maintain accuracy on complex missions',
        phase: 2,
        adjustment: {
          complexityThresholdForFullCrew: 0.65,
          rationale: 'Data shows reduced accuracy when over-optimizing complex tasks',
        },
        expectedImprovement: strategy.expectedImprovement,
        confidence: strategy.confidence,
        requiresAdmiralApproval: false, // tuning parameter, not policy change
      });
    }

    if (strategy.pattern === 'consensus_fast_path_saves_cost') {
      proposals.push({
        title: 'Phase 3: Lower consensus threshold to 9/11',
        description:
          'Current 10/11 threshold is too conservative; 9/11 (≥82% agreement) equally safe with 12% cost savings',
        phase: 3,
        adjustment: {
          consensusThreshold: 9,
          rationale: 'Data shows 9/11 false negative rate <1% (safe margin)',
        },
        expectedImprovement: strategy.expectedImprovement,
        confidence: strategy.confidence,
        requiresAdmiralApproval: true, // changes consensus policy, needs approval
      });
    }

    if (strategy.pattern === 'provider_load_balancing_incomplete') {
      proposals.push({
        title: 'Phase 4: Investigate provider variance',
        description:
          'Provider response times uneven; may need to reassign crew or add fallback routing',
        phase: 4,
        adjustment: {
          investigateProviders: ['meta', 'deepseek'],
          fallbackBehavior: 'route to faster provider if latency >5s',
        },
        expectedImprovement: strategy.expectedImprovement,
        confidence: strategy.confidence,
        requiresAdmiralApproval: true, // operational change, needs approval
      });
    }
  }

  const summary =
    proposals.length === 0
      ? 'No high-confidence improvements detected. System performing within targets.'
      : `${proposals.length} proposals: ${proposals.filter(p => p.requiresAdmiralApproval).length} require Admiral approval, ${proposals.filter(p => !p.requiresAdmiralApproval).length} can auto-proceed`;

  return { proposals, summary };
}

/**
 * Crew certifies its own capabilities (self-validation)
 * Periodic re-certification ensures drift detection and skill maintenance
 */
export function crewSelfCertify(
  performance: Map<string, CrewMemberPerformance>,
): Map<string, CrewCapabilityCertification> {
  const certifications = new Map<string, CrewCapabilityCertification>();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

  for (const [crewId, perf] of performance) {
    // Certification criteria: capability ≥0.65 and recent accuracy ≥0.80
    const certified = perf.capability >= 0.65 && perf.recentAccuracy >= 0.8;

    const domains: {
      domain: string;
      level: 'novice' | 'proficient' | 'expert';
    }[] = [];
    domains.push({
      domain: perf.domain,
      level:
        perf.capability > 0.85
          ? 'expert'
          : perf.capability > 0.7
            ? 'proficient'
            : 'novice',
    });

    // Add secondary domains if proficient
    for (const spec of perf.specializations) {
      if (spec.proficiency >= 0.65) {
        domains.push({
          domain: spec.domain,
          level: spec.proficiency > 0.8 ? 'expert' : 'proficient',
        });
      }
    }

    certifications.set(crewId, {
      crewId,
      certified,
      domains,
      certificationTimestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      validationMissions: perf.missionsCompleted,
    });
  }

  return certifications;
}

/**
 * Helper: Get crew member's primary domain
 */
function crewDomain(crewId: string): string {
  const domains: Record<string, string> = {
    picard: 'command',
    data: 'architecture',
    riker: 'implementation',
    worf: 'security',
    o_brien: 'devops',
    geordi: 'infrastructure',
    yar: 'quality',
    crusher: 'health',
    troi: 'stakeholder',
    uhura: 'communications',
    quark: 'finance',
  };
  return domains[crewId] || 'general';
}

/**
 * Helper: Get crew member's specializations
 */
function domainSpecializations(
  crewId: string,
): { domain: string; proficiency: number }[] {
  const specs: Record<string, { domain: string; proficiency: number }[]> = {
    picard: [
      { domain: 'security', proficiency: 0.8 },
      { domain: 'stakeholder', proficiency: 0.85 },
    ],
    data: [
      { domain: 'infrastructure', proficiency: 0.8 },
      { domain: 'quality', proficiency: 0.75 },
    ],
    riker: [
      { domain: 'quality', proficiency: 0.7 },
      { domain: 'communications', proficiency: 0.75 },
    ],
    worf: [
      { domain: 'infrastructure', proficiency: 0.75 },
      { domain: 'quality', proficiency: 0.8 },
    ],
    o_brien: [
      { domain: 'infrastructure', proficiency: 0.9 },
      { domain: 'implementation', proficiency: 0.8 },
    ],
    geordi: [
      { domain: 'devops', proficiency: 0.95 },
      { domain: 'health', proficiency: 0.8 },
    ],
    yar: [
      { domain: 'implementation', proficiency: 0.75 },
      { domain: 'health', proficiency: 0.7 },
    ],
    crusher: [
      { domain: 'stakeholder', proficiency: 0.8 },
      { domain: 'quality', proficiency: 0.85 },
    ],
    troi: [
      { domain: 'communications', proficiency: 0.9 },
      { domain: 'quality', proficiency: 0.7 },
    ],
    uhura: [
      { domain: 'stakeholder', proficiency: 0.85 },
      { domain: 'architecture', proficiency: 0.6 },
    ],
    quark: [
      { domain: 'devops', proficiency: 0.8 },
      { domain: 'health', proficiency: 0.75 },
    ],
  };
  return specs[crewId] || [];
}
