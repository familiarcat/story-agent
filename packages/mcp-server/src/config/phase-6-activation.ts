/**
 * Phase 6 Activation Configuration
 * Admiral Approval: August 27, 2026, 04:30 UTC
 * Status: ENABLED
 *
 * This configuration file activates the crew self-awareness and autonomous
 * learning loop. Phase 6 runs as a non-blocking background process parallel
 * to all production missions.
 */

export const PHASE_6_CONFIG = {
  // === ACTIVATION ===
  enabled: true, // Admiral approval: Aug 27, 2026
  startTime: new Date('2026-08-27T04:30:00Z'),

  // === CREW SELF-AWARENESS (Non-blocking Learning) ===
  crewSelfAwareness: {
    mode: 'semi_autonomous' as const, // passive | semi_autonomous | full_autonomous
    learningActive: true,
    backgroundProcess: true, // Non-blocking, runs in parallel
  },

  // === AUTONOMY LEVELS ===
  autonomyProgression: {
    level0: {
      description: 'Phases 1-5: Pre-learning execution',
      status: 'ACTIVE',
      requiresMissions: 0,
    },
    level1: {
      description: 'Early learning: Passive observation, crew proposes',
      status: 'PENDING',
      requiresMissions: 10,
      estimatedReach: '20-30 min from activation',
    },
    level2: {
      description: 'Active learning: Auto-apply tunings, escalate policy',
      status: 'PENDING',
      requiresMissions: 20,
      estimatedReach: '3-4 hours from activation',
    },
    level3: {
      description: 'Autonomous: Team selection, Admiral gates policy/risk',
      status: 'PENDING',
      requiresMissions: 50,
      estimatedReach: '18-24 hours from activation',
    },
    level4: {
      description: 'Mastery: Mid-mission adaptation, execution ownership',
      status: 'PENDING',
      requiresMissions: 200,
      estimatedReach: '48-72 hours from activation',
    },
    level5: {
      description: 'Full autonomy: Crew owns decisions, Admiral oversight',
      status: 'PENDING',
      requiresMissions: 500,
      estimatedReach: '5-7 days from activation',
    },
  },

  // === LEARNING LOOP ===
  learningLoop: {
    enabled: true,
    updateInterval: 'per_mission', // Update performance after each mission
    patternDetectionInterval: 10, // Detect patterns every 10 missions
    performanceAlpha: 0.3, // Exponential moving average weight
    consensusThreshold: 0.8, // 80% agreement for fast-path
  },

  // === PERFORMANCE TRACKING ===
  performanceMetrics: {
    trackIndividualMembers: true,
    trackTeamComposition: true,
    trackCostOptimization: true,
    trackAccuracy: true,
  },

  // === ADMIRAL GATES (Always Active) ===
  admiralGates: {
    policyGate: true, // Admiral decides policy changes
    riskGate: true, // Admiral decides risk escalations
    overrideGate: true, // Admiral can veto any decision
    auditTrail: true, // Log all decisions
  },

  // === AUTO-TUNING ===
  autoTuning: {
    enabled: true,
    autoApplyNonPolicyTunings: true, // Apply automatically, log for review
    requiresApprovalFor: ['threshold_changes', 'provider_weights', 'consensus_rules'],
    rollbackCapability: true, // Can instantly revert tunings
  },

  // === MONITORING & DASHBOARDS ===
  monitoring: {
    realTimeDashboard: true,
    dashboardPath: '/crew/learning-status',
    refreshInterval: 'real_time', // Update as missions complete
    metricsExposed: [
      'missions_processed',
      'patterns_detected',
      'autonomy_level',
      'cost_trend',
      'accuracy_score',
      'consensus_quality',
      'learning_proposals',
      'auto_applied_tunings',
    ],
  },

  // === SAFETY & ROLLBACK ===
  safety: {
    instantRollback: true, // Can disable Phase 6 instantly
    fallbackMode: 'phase_1_5', // Revert to Phases 1-5 if issues detected
    rollbackTime: '< 5 minutes',
    accuracyFloor: 0.92, // Never reduce accuracy below 92%
    costFloor: null, // No minimum cost constraint
  },

  // === LOGGING & OBSERVABILITY ===
  logging: {
    logLearningDecisions: true,
    logPatternDetection: true,
    logAutonomyProgression: true,
    logAdmiralApprovals: true,
    retentionDays: 90,
  },
};

/**
 * Crew Learning State Initialization
 * Executed when Phase 6 activates
 */
export const initializeCrewLearningState = () => {
  return {
    cycleNumber: 0,
    missionsProcessed: 0,
    performanceSnapshot: new Map(), // Per-crew-member tracking
    missionHistory: [], // Last 500 missions
    detectedStrategies: [],
    pendingAdmiralApprovals: [],
    autoAppliedTunings: [],
    autonomyLevel: 0,
    lastUpdateTime: new Date(),
    statusMessage: 'Phase 6 Learning Loop Initialized',
  };
};

/**
 * Real-time dashboard configuration
 * Shows learning progression in hours/days (AI crew speed), not weeks
 */
export const LEARNING_DASHBOARD_CONFIG = {
  title: '🖖 Crew Learning Dashboard (Machine Speed)',
  refreshInterval: 'real-time',
  sections: [
    {
      title: 'Learning Progress',
      metrics: [
        { label: 'Missions Processed', key: 'missions_processed', unit: 'count' },
        { label: 'Patterns Detected', key: 'patterns_detected', unit: 'count' },
        { label: 'Autonomy Level', key: 'autonomy_level', unit: '0-5', target: 5 },
        { label: 'Time to Level 5', key: 'time_to_level_5', unit: 'hours', target: '5-7' },
      ],
    },
    {
      title: 'Cost & Performance',
      metrics: [
        { label: 'Cost/Mission', key: 'cost_per_mission', unit: '$', trend: 'down' },
        { label: 'Accuracy', key: 'accuracy_score', unit: '%', target: '≥92' },
        { label: 'Consensus Quality', key: 'consensus_quality', unit: '%', target: '≥85' },
        { label: 'False Positive Rate', key: 'false_positive_rate', unit: '%', target: '<5' },
      ],
    },
    {
      title: 'Crew Proposals',
      metrics: [
        { label: 'Pending Approvals', key: 'pending_approvals', unit: 'count' },
        { label: 'Auto-Applied Tunings', key: 'auto_tunings', unit: 'count' },
        { label: 'Admiral Decisions', key: 'admiral_decisions', unit: 'count' },
      ],
    },
  ],
};

export default PHASE_6_CONFIG;
