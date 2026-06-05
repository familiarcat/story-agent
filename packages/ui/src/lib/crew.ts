/**
 * UI Crew Orchestration - 11-member Sovereign Factory crew
 * 
 * Mirrors MCP server crew system for UI display and planning:
 * - Displays all 11 crew members with Star Trek personas
 * - Builds mission plans with crew findings
 * - Generates Observation Lounge debate results
 */

import type {
  AgileStory,
  CrewMissionPlan,
  ObservationDebateResult,
  ObservationMemoryRecord,
} from '@story-agent/shared';

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

  return {
    story,
    executionMode,
    repoFullName,
    targetBranch,
    sharedMemoryContext: sharedMemories ?? [],
    crew: [
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
      },
      {
        id: 'obrien',
        name: "Chief O'Brien",
        role: 'devops',
        specialty: 'DevOps integration and system bridging',
        responsibilities: [
          'Coordinate CI/CD pipeline requirements',
          'Bridge services and integration points',
          'Validate deployment workflows',
        ],
        decisionWeight: 1.0,
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
      },
    ],
    assignments: [
      {
        crewId: 'picard',
        objective: `Command execution strategy for mission ${story.referenceNum}`,
        deliverable: 'Strategic plan and executive direction',
        completionCriteria: ['Mission objectives confirmed', 'Crew execution authorized'],
      },
      {
        crewId: 'data',
        objective: 'Validate architectural approach for changes',
        deliverable: 'Architecture assessment and design guidance',
        completionCriteria: ['DDD patterns validated', 'Entity boundaries defined'],
      },
      {
        crewId: 'riker',
        objective: 'Plan implementation sequence',
        deliverable: 'Phased execution roadmap',
        completionCriteria: ['Frontend/backend coordination clear', 'Integration points defined'],
      },
      {
        crewId: 'geordi',
        objective: 'Assess infrastructure readiness',
        deliverable: 'Infrastructure and deployment plan',
        completionCriteria: ['Containerization strategy defined', 'Scaling assumptions validated'],
      },
      {
        crewId: 'obrien',
        objective: 'Prepare CI/CD integration',
        deliverable: 'Pipeline and deployment checklist',
        completionCriteria: ['CI/CD requirements identified', 'Integration points mapped'],
      },
      {
        crewId: 'worf',
        objective: 'Conduct security assessment',
        deliverable: 'Security audit and risk gates',
        completionCriteria: ['Threats identified', 'Blocking concerns escalated if needed'],
      },
      {
        crewId: 'yar',
        objective: 'Define quality assurance strategy',
        deliverable: 'Test coverage and QA checklist',
        completionCriteria: ['Test policy applied', 'Quality gates confirmed'],
      },
      {
        crewId: 'troi',
        objective: 'Validate stakeholder alignment',
        deliverable: 'Stakeholder impact analysis',
        completionCriteria: ['User intent validated', 'Communication plan defined'],
      },
      {
        crewId: 'crusher',
        objective: 'Assess system health impact',
        deliverable: 'Health diagnostics and observability plan',
        completionCriteria: ['Monitoring strategy defined', 'Documentation requirements identified'],
      },
      {
        crewId: 'uhura',
        objective: 'Plan communication strategy',
        deliverable: 'Stakeholder communication roadmap',
        completionCriteria: ['Reviewers identified', 'Status tracking plan confirmed'],
      },
      {
        crewId: 'quark',
        objective: 'Optimize LLM execution costs',
        deliverable: 'Cost analysis and model recommendations',
        completionCriteria: ['Cost-optimal models selected', 'Financial impact assessed'],
      },
    ],
    findings: [
      {
        crewId: 'picard',
        summary: `Captain Picard accepts mission ${story.referenceNum} for ${executionMode} execution. Strategic alignment confirmed.`,
        confidence: 0.95,
        risks: [],
        recommendations: ['Proceed with crew execution', 'Monitor for escalation conditions'],
      },
      {
        crewId: 'data',
        summary: 'Architecture is sound and follows DDD principles. Entity design is clean.',
        confidence: 0.88,
        risks: ['Verify cross-aggregate boundaries during implementation'],
        recommendations: ['Apply DDD context mapping', 'Validate entity relationships'],
      },
      {
        crewId: 'riker',
        summary: 'Implementation sequence is viable. Frontend and backend coordination points defined.',
        confidence: 0.85,
        risks: ['Integration complexity may require staged rollout'],
        recommendations: ['Use phased deployment approach', 'Define rollback strategy'],
      },
    ],
    recommendedExecutionOrder: ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark'],
  };
}

export function runObservationLoungeDebate(plan: CrewMissionPlan): ObservationDebateResult {
  return {
    rounds: [
      {
        title: "Round 1 - Captain's Mission Brief",
        entries: [
          {
            speakerId: 'picard',
            position: 'support',
            statement: `Mission ${plan.story.referenceNum} is accepted for ${plan.executionMode} execution with crew consensus.`,
            evidence: [plan.story.name, `Repository: ${plan.repoFullName}`],
          },
          {
            speakerId: 'data',
            position: 'amendment',
            statement: 'Architectural design validated. DDD patterns confirmed.',
            evidence: ['Entity relationships defined', 'Aggregate boundaries clear'],
          },
        ],
      },
      {
        title: 'Round 2 - Implementation Challenge & Security Posture',
        entries: [
          {
            speakerId: 'riker',
            position: 'support',
            statement: 'Tactical implementation ready. Phased execution strategy prepared.',
            evidence: ['Frontend/backend coordination clear', 'Integration points mapped'],
          },
          {
            speakerId: 'worf',
            position: 'challenge',
            statement: 'Security posture validated. No blocking concerns detected.',
            evidence: ['Threat assessment complete', 'Risk gates defined'],
          },
          {
            speakerId: 'geordi',
            position: 'amendment',
            statement: 'Infrastructure ready. Containerization and scaling strategy prepared.',
            evidence: ['Deployment readiness confirmed', 'Environment assumptions validated'],
          },
        ],
      },
      {
        title: 'Round 3 - Consensus & Release Authority',
        entries: [
          {
            speakerId: 'troi',
            position: 'support',
            statement: 'Stakeholder intent validated. Cross-team alignment confirmed.',
            evidence: ['User goals aligned', 'Communication plan ready'],
          },
          {
            speakerId: 'picard',
            position: 'support',
            statement: `FINAL DECISION: PROCEED with ${plan.executionMode} execution. Sovereign Factory crew is authorized to execute.`,
            evidence: plan.recommendedExecutionOrder,
          },
        ],
      },
    ],
    unresolvedRisks: ['Integration complexity during staged rollout', 'Monitor for service dependency conflicts'],
    consensusSummary: `Mission ${plan.story.referenceNum} ready for execution. All crew members confirm readiness. Phased deployment strategy recommended.`,
    finalDecision: 'approved',
    actionItems: [
      'Proceed with phased implementation',
      'Monitor integration points',
      'Conduct smoke testing post-deployment',
      'Maintain stakeholder communication',
    ],
  };
}
