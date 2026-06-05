import type {
  AgileStory,
  CrewAgentProfile,
  CrewAssignment,
  CrewFinding,
  CrewMissionPlan,
  ObservationMemoryRecord,
  ObservationDebateEntry,
  ObservationDebateResult,
} from '@story-agent/shared';

// Sovereign Factory Crew - from ai-enterprise-os project
// 11-member crew with Star Trek personas and specific roles
const CREW: CrewAgentProfile[] = [
  {
    id: 'picard',
    name: 'Captain Picard',
    role: 'captain',
    specialty: 'Strategic mission decomposition and executive authority',
    responsibilities: [
      'Command crew execution and strategic direction',
      'Make final mission decisions and arbitrate disputes',
      'Ensure alignment with enterprise objectives',
    ],
    decisionWeight: 1.5,
    model: 'claude-3-opus',
    authority: 'executive',
  },
  {
    id: 'data',
    name: 'Commander Data',
    role: 'architect',
    specialty: 'DDD architecture validation and system design',
    responsibilities: [
      'Validate domain-driven design patterns',
      'Ensure clean architecture principles',
      'Design entity relationships and boundaries',
    ],
    decisionWeight: 1.3,
    model: 'claude-3.5-sonnet',
    authority: 'architectural',
  },
  {
    id: 'riker',
    name: 'Commander Riker',
    role: 'developer',
    specialty: 'Full-stack implementation and tactical execution',
    responsibilities: [
      'Plan phased implementation strategy',
      'Coordinate frontend and backend changes',
      'Define testing and integration points',
    ],
    decisionWeight: 1.2,
    model: 'claude-3.5-sonnet',
    authority: 'tactical',
  },
  {
    id: 'geordi',
    name: 'Geordi La Forge',
    role: 'infrastructure',
    specialty: 'Infrastructure stability and containerization',
    responsibilities: [
      'Assess deployment and infrastructure readiness',
      'Design containerization and scaling strategy',
      'Validate environment assumptions',
    ],
    decisionWeight: 1.1,
    model: 'claude-3.5-sonnet',
    authority: 'infrastructure',
  },
  {
    id: 'obrien',
    name: 'Chief O\'Brien',
    role: 'devops',
    specialty: 'DevOps integration and system bridging',
    responsibilities: [
      'Coordinate CI/CD pipeline requirements',
      'Bridge services and integration points',
      'Validate deployment workflows',
    ],
    decisionWeight: 1.0,
    model: 'gpt-4o-mini',
    authority: 'operational',
  },
  {
    id: 'worf',
    name: 'Lt. Worf',
    role: 'security',
    specialty: 'Security auditing with veto authority',
    responsibilities: [
      'Conduct security threat assessment',
      'Define validation gates and blocking concerns',
      'Escalate security blockers to captain',
    ],
    decisionWeight: 1.4,
    model: 'gpt-4o-mini',
    authority: 'security_veto',
  },
  {
    id: 'yar',
    name: 'Tasha Yar',
    role: 'qa',
    specialty: 'QA auditing and smoke testing',
    responsibilities: [
      'Define test coverage requirements',
      'Assess readiness for smoke testing',
      'Validate quality gates before rollout',
    ],
    decisionWeight: 1.0,
    model: 'gemini-flash',
    authority: 'quality',
  },
  {
    id: 'troi',
    name: 'Counselor Troi',
    role: 'analyst',
    specialty: 'Intent validation and stakeholder analysis',
    responsibilities: [
      'Validate user intent and story goals',
      'Assess stakeholder impact and empathy',
      'Identify communication needs',
    ],
    decisionWeight: 0.9,
    model: 'claude-3-haiku',
    authority: 'stakeholder',
  },
  {
    id: 'crusher',
    name: 'Dr. Beverly Crusher',
    role: 'health',
    specialty: 'System health diagnostics and documentation',
    responsibilities: [
      'Assess system health and viability',
      'Define monitoring and observability needs',
      'Document architecture and runbooks',
    ],
    decisionWeight: 1.0,
    model: 'claude-3.5-sonnet',
    authority: 'observability',
  },
  {
    id: 'uhura',
    name: 'Lt. Uhura',
    role: 'communications',
    specialty: 'Communications analysis and status broadcasting',
    responsibilities: [
      'Analyze communication requirements',
      'Plan stakeholder communication',
      'Define status and progress tracking',
    ],
    decisionWeight: 0.8,
    model: 'gemini-1.5-pro',
    authority: 'communications',
  },
  {
    id: 'quark',
    name: 'Quark',
    role: 'finance',
    specialty: 'Cost optimization and model arbitrage',
    responsibilities: [
      'Optimize model selection for cost',
      'Assess financial impact of changes',
      'Recommend cost-efficient alternatives',
    ],
    decisionWeight: 0.9,
    model: 'gpt-4o-mini',
    authority: 'financial',
  },
];

function detectRisks(story: AgileStory): string[] {
  const text = `${story.name} ${story.description} ${story.acceptanceCriteria}`.toLowerCase();
  const risks: string[] = [];

  if (text.includes('auth') || text.includes('permission') || text.includes('token')) {
    risks.push('Authentication/authorization surface may be affected.');
  }
  if (text.includes('migration') || text.includes('schema') || text.includes('database')) {
    risks.push('Data migration and backward compatibility risk.');
  }
  if (text.includes('api') || text.includes('endpoint')) {
    risks.push('API contract/regression risk for downstream clients.');
  }
  if (text.includes('ui') || text.includes('component') || text.includes('page')) {
    risks.push('UI behavior and accessibility regression risk.');
  }

  if (risks.length === 0) {
    risks.push('Unknown complexity; run discovery before implementation.');
  }
  return risks;
}

export function getCrewRoster(): CrewAgentProfile[] {
  return CREW;
}

export function buildCrewMissionPlan(input: {
  story: AgileStory;
  repoFullName: string;
  targetBranch: string;
  executionMode: 'autonomous' | 'guided';
  sharedMemories?: ObservationMemoryRecord[];
  techStack?: string;
  testPolicy?: string;
  reviewers?: string;
}): CrewMissionPlan {
  const { story, repoFullName, targetBranch, executionMode, sharedMemories, techStack, testPolicy, reviewers } = input;
  const risks = detectRisks(story);
  const memoryInsights = (sharedMemories ?? []).map(
    m => `Prior memory (${m.createdAt}): ${m.transcript.consensusSummary}`
  );

  const assignments: CrewAssignment[] = [
    {
      crewId: 'science',
      objective: 'Convert story narrative into a concrete technical mission map.',
      deliverable: 'Discovery brief with assumptions, unknowns, and affected surfaces.',
      completionCriteria: [
        'At least 3 assumptions identified',
        'Acceptance criteria mapped to implementation signals',
        'Unknowns marked for clarification',
      ],
    },
    {
      crewId: 'engineering',
      objective: 'Produce implementation sequence for code changes.',
      deliverable: 'File-level plan and execution order for branch work.',
      completionCriteria: [
        'Change plan references target repository',
        'Risky edits include rollback notes',
        'Test touchpoints listed',
      ],
    },
    {
      crewId: 'security',
      objective: 'Define quality and safety guardrails before merge.',
      deliverable: 'Validation checklist covering security and regressions.',
      completionCriteria: [
        'Security impact assessed',
        'Regression tests scoped',
        'Blocking concerns captured',
      ],
    },
    {
      crewId: 'operations',
      objective: 'Prepare delivery and release controls.',
      deliverable: 'PR and release readiness checklist.',
      completionCriteria: [
        'Branch and PR strategy confirmed',
        'Environment assumptions verified',
        'Post-merge checks defined',
      ],
    },
    {
      crewId: 'captain',
      objective: 'Make final mission call for execution readiness.',
      deliverable: 'Go/no-go decision with prioritized action order.',
      completionCriteria: [
        'Crew findings reviewed',
        'Consensus and dissent documented',
        'Execution mode acknowledged',
      ],
    },
  ];

  const findings: CrewFinding[] = [
    {
      crewId: 'science',
      summary: `Story ${story.referenceNum} requires scoped discovery on domain and acceptance criteria.`,
      confidence: 0.82,
      risks,
      recommendations: [
        'Start with targeted codebase discovery for impacted modules',
        'Confirm ambiguous acceptance criteria before heavy implementation',
        ...(memoryInsights.length > 0 ? [`Reference prior Observation Lounge memories: ${memoryInsights.join(' | ')}`] : []),
      ],
    },
    {
      crewId: 'engineering',
      summary: `Repository ${repoFullName} on ${targetBranch} is ready for phased implementation sequencing.`,
      confidence: 0.79,
      risks,
      recommendations: [
        `Use story branch named ${story.referenceNum.toUpperCase()}`,
        `Apply test policy: ${testPolicy ?? 'run targeted tests for changed files'}`,
      ],
    },
    {
      crewId: 'security',
      summary: 'Validation gates required before opening or updating PR.',
      confidence: 0.85,
      risks,
      recommendations: [
        'Block merge on unresolved high-risk findings',
        'Include focused regression checks for touched interfaces',
      ],
    },
    {
      crewId: 'operations',
      summary: 'Delivery flow can proceed with controlled PR sequencing.',
      confidence: 0.77,
      risks: ['CI assumptions may differ across repositories.'],
      recommendations: [
        `Confirm reviewers: ${reviewers ?? 'team default reviewers'}`,
        `Record tech stack hints: ${techStack ?? 'not provided'}`,
      ],
    },
  ];

  return {
    story,
    executionMode,
    repoFullName,
    targetBranch,
    crew: CREW,
    sharedMemoryContext: sharedMemories ?? [],
    assignments,
    findings,
    recommendedExecutionOrder: ['science', 'engineering', 'security', 'operations', 'captain'],
  };
}

function debateEntry(
  speakerId: string,
  position: ObservationDebateEntry['position'],
  statement: string,
  evidence: string[]
): ObservationDebateEntry {
  return { speakerId, position, statement, evidence };
}

export function runObservationLoungeDebate(plan: CrewMissionPlan): ObservationDebateResult {
  const risks = Array.from(new Set(plan.findings.flatMap(f => f.risks)));

  const rounds: ObservationDebateResult['rounds'] = [
    {
      title: 'Round 1 - Mission framing',
      entries: [
        debateEntry(
          'captain',
          'support',
          `Mission ${plan.story.referenceNum} is accepted for ${plan.executionMode} execution pending risk controls.`,
          [plan.story.name, `Repo: ${plan.repoFullName}`]
        ),
        debateEntry(
          'science',
          'amendment',
          'Discovery must resolve unknowns before implementation starts.',
          ['Acceptance criteria and story description review required']
        ),
      ],
    },
    {
      title: 'Round 2 - Execution challenge',
      entries: [
        debateEntry(
          'engineering',
          'support',
          'Implementation can proceed in phased commits with branch isolation.',
          [`Branch: ${plan.story.referenceNum.toUpperCase()}`, `Target: ${plan.targetBranch}`]
        ),
        debateEntry(
          'security',
          'challenge',
          'Execution is blocked unless validation gates are satisfied for identified risk areas.',
          risks.length > 0 ? risks : ['No explicit risks surfaced; baseline checks still required']
        ),
        debateEntry(
          'operations',
          'amendment',
          'PR readiness and rollback checks must be defined before merge.',
          ['Confirm reviewers', 'Confirm CI workflow for changed modules']
        ),
      ],
    },
    {
      title: 'Round 3 - Consensus and release posture',
      entries: [
        debateEntry(
          'counselor',
          'support',
          'Consensus achieved: proceed with autonomous execution under explicit safeguards.',
          ['All crew findings include actionable controls']
        ),
        debateEntry(
          'captain',
          'support',
          'Final call: approved with mandatory risk review before PR merge.',
          ['Observation Lounge consensus complete']
        ),
      ],
    },
  ];

  return {
    rounds,
    consensusSummary:
      'Crew consensus supports execution with phased discovery-first delivery, mandatory validation gates, and final captain approval before merge.',
    unresolvedRisks: risks,
    finalDecision: risks.length > 3 ? 'revise' : 'approved',
    actionItems: [
      'Run discovery and capture assumptions in mission notes',
      'Implement in controlled branch commits aligned to acceptance criteria',
      'Execute targeted tests and risk-specific validations',
      'Open PR and attach Observation Lounge consensus summary',
    ],
  };
}
