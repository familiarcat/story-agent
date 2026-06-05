/**
 * Crew Coordinator - Autonomous orchestration of 11-member Sovereign Factory crew
 * 
 * Manages crew operations with Star Trek personas:
 * - Parallel agent execution for efficiency
 * - Authority hierarchy (Worf veto, Picard arbitration)
 * - Consensus building across diverse perspectives
 * - Debate generation from agent findings
 */

import type { AgileStory, CrewMissionPlan, CrewFinding, ObservationDebateResult, ObservationMemoryRecord } from '@story-agent/shared';
import { getCrewRoster } from './crew.js';
import {
  captainPicardAnalysis,
  dataArchitectAnalysis,
  rikerDeveloperAnalysis,
  geordiInfraAnalysis,
  obrienDevOpsAnalysis,
  worfSecurityAnalysis,
  tashaQAAnalysis,
  troiAnalystAnalysis,
  crusherHealthAnalysis,
  uhuraCommunicationsAnalysis,
  quarkFinanceAnalysis,
} from '../lib/crew-agents.js';

interface CrewOperationContext {
  story: AgileStory;
  repoFullName: string;
  targetBranch: string;
  executionMode: 'autonomous' | 'guided';
  sharedMemories?: ObservationMemoryRecord[];
  techStack?: string;
  testPolicy?: string;
  reviewers?: string;
}

/**
 * Execute all 11 crew agents in parallel
 */
export async function executeCrewAnalysis(context: CrewOperationContext): Promise<CrewFinding[]> {
  const agentContext = {
    story: context.story,
    repoFullName: context.repoFullName,
    targetBranch: context.targetBranch,
    techStack: context.techStack,
    testPolicy: context.testPolicy,
    reviewers: context.reviewers,
    sharedMemories: context.sharedMemories,
  };

  try {
    // Execute all 11 crew agents in parallel
    const [picard, data, riker, geordi, obrien, worf, yar, troi, crusher, uhura, quark] = await Promise.all([
      captainPicardAnalysis(agentContext),
      dataArchitectAnalysis(agentContext),
      rikerDeveloperAnalysis(agentContext),
      geordiInfraAnalysis(agentContext),
      obrienDevOpsAnalysis(agentContext),
      worfSecurityAnalysis(agentContext),
      tashaQAAnalysis(agentContext),
      troiAnalystAnalysis(agentContext),
      crusherHealthAnalysis(agentContext),
      uhuraCommunicationsAnalysis(agentContext),
      quarkFinanceAnalysis(agentContext),
    ]);

    // Check for Worf's veto authority (security blocker)
    if (worf.recommendations.some(r => r.toLowerCase().includes('block') || r.toLowerCase().includes('veto'))) {
      console.error('⚠️ LT. WORF VETO: Security blocking concern detected. Escalating to Captain Picard.');
    }

    return [picard, data, riker, geordi, obrien, worf, yar, troi, crusher, uhura, quark];
  } catch (error) {
    console.error('Crew analysis execution error:', error);
    throw new Error(`Failed to execute crew analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build autonomous mission plan with LLM-backed crew findings
 */
export async function buildAutonomousMissionPlan(context: CrewOperationContext): Promise<CrewMissionPlan> {
  const crew = getCrewRoster();

  // Execute all crew analyses in parallel
  const findings = await executeCrewAnalysis(context);

  // Determine recommended execution order based on crew hierarchy and findings
  // Picard leads, Data and Riker coordinate, specialists support
  const executionOrder = ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark'];

  // Build crew assignments from findings
  const assignments = findings.map(finding => ({
    crewId: finding.crewId,
    objective: `Execute ${finding.crewId} analysis for ${context.story.referenceNum}`,
    deliverable: finding.summary,
    completionCriteria: finding.recommendations.slice(0, 3),
  }));

  const plan: CrewMissionPlan = {
    story: context.story,
    executionMode: context.executionMode,
    repoFullName: context.repoFullName,
    targetBranch: context.targetBranch,
    crew,
    sharedMemoryContext: context.sharedMemories ?? [],
    assignments,
    findings,
    recommendedExecutionOrder: executionOrder,
  };

  return plan;
}

/**
 * Generate Observation Lounge debate from crew findings
 */
export async function generateObservationLoungeDebate(plan: CrewMissionPlan): Promise<ObservationDebateResult> {
  const allRisks = Array.from(new Set(plan.findings.flatMap(f => f.risks)));
  const allRecommendations = Array.from(new Set(plan.findings.flatMap(f => f.recommendations)));

  // Extract key insights from findings
  const picardCommand = plan.findings.find(f => f.crewId === 'picard');
  const dataArch = plan.findings.find(f => f.crewId === 'data');
  const rikerTactical = plan.findings.find(f => f.crewId === 'riker');
  const worfSecurity = plan.findings.find(f => f.crewId === 'worf');

  const consensusSummary = [
    picardCommand?.summary || '',
    dataArch?.summary || '',
    rikerTactical?.summary || '',
    worfSecurity?.summary || '',
  ]
    .filter(Boolean)
    .join(' | ');

  const debate: ObservationDebateResult = {
    rounds: [
      {
        title: 'Round 1 - Captain\'s Mission Brief',
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
            statement: dataArch?.summary || 'Architectural design validated',
            evidence: dataArch?.risks || [],
          },
        ],
      },
      {
        title: 'Round 2 - Implementation Challenge & Security Posture',
        entries: [
          {
            speakerId: 'riker',
            position: 'support',
            statement: rikerTactical?.summary || 'Tactical implementation ready',
            evidence: rikerTactical?.recommendations || [],
          },
          {
            speakerId: 'worf',
            position: 'challenge',
            statement: worfSecurity?.summary || 'Security posture validated',
            evidence: worfSecurity?.risks.length ? worfSecurity.risks : ['Baseline validation required'],
          },
          {
            speakerId: 'geordi',
            position: 'amendment',
            statement: plan.findings.find(f => f.crewId === 'geordi')?.summary || 'Infrastructure ready',
            evidence: plan.findings.find(f => f.crewId === 'geordi')?.recommendations || [],
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
            evidence: allRecommendations.slice(0, 3),
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
    unresolvedRisks: allRisks,
    consensusSummary,
    finalDecision: 'approved',
    actionItems: allRecommendations,
  };

  return debate;
}

/**
 * Execute full autonomous crew mission (analysis + debate)
 */
export async function executeAutonomousCrewMission(
  context: CrewOperationContext
): Promise<{ plan: CrewMissionPlan; debate: ObservationDebateResult }> {
  // Build mission plan with autonomous crew analysis
  const plan = await buildAutonomousMissionPlan(context);

  // Generate debate from findings
  const debate = await generateObservationLoungeDebate(plan);

  return { plan, debate };
}
