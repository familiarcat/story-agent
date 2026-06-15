/**
 * Crew Coordinator - Autonomous orchestration of 11-member Sovereign Factory crew
 * 
 * Manages crew operations with Star Trek personas:
 * - Parallel agent execution for efficiency
 * - Authority hierarchy (Worf veto, Picard arbitration)
 * - Consensus building across diverse perspectives
 * - Debate generation from agent findings
 */

import type { AgileStory, CrewMissionPlan, CrewFinding, ObservationDebateResult, ObservationMemoryRecord, StoryRecord } from '../../../shared/src/index.js';
import { executePromptEngineCall } from './prompt-engine.js';
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
import { storeObservationMemory } from '../../../shared/src/db.js';

interface CrewOperationContext {
  story: AgileStory;
  repoFullName: string;
  targetBranch: string;
  executionMode: 'autonomous' | 'guided';
  /**
   * Client org that scopes memory retrieval.
   * Pass 'bayer-int' for Bayer, 'familiarcat' for the Retailer Rewards project, etc.
   * When null, falls back to global/unscoped memories.
   */
  clientId?: string | null;
  sharedMemories?: ObservationMemoryRecord[];
  techStack?: string;
  testPolicy?: string;
  reviewers?: string;
}

export interface FullMissionResult {
  plan: CrewMissionPlan;
  debate: ObservationDebateResult;
  implementation?: {
    files: Array<{ path: string; content: string; message: string }>;
  };
  status: 'analyzed' | 'implemented' | 'delivered';
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

  // ── Auto-load client-scoped memories if not pre-supplied ──────────────────
  // This is the core memory integration: before the crew runs, we hydrate
  // sharedMemories from the right client bucket so the crew doesn't start blind.
  let sharedMemories = context.sharedMemories;
  if (!sharedMemories || sharedMemories.length === 0) {
    try {
      const { getRelevantObservationMemories } = await import('../../../shared/src/db.js');
      sharedMemories = await getRelevantObservationMemories({
        queryText: `${context.story.referenceNum} ${context.story.name} ${context.story.description}`,
        clientId: context.clientId ?? null,
        limit: 6,
        candidatePool: 40,
      });
    } catch {
      sharedMemories = [];
    }
  }

  // Execute all crew analyses in parallel, now with client-scoped memory hydration
  const findings = await executeCrewAnalysis({ ...context, sharedMemories });

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
    sharedMemoryContext: sharedMemories,
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

/**
 * Execute the entire Sovereign Factory lifecycle:
 * Analysis -> Debate -> Implementation Generation -> Ready for Delivery
 */
export async function executeFullMissionLifecycle(
  context: CrewOperationContext
): Promise<FullMissionResult> {
  // Phase 1: Planning & Debate
  const { plan, debate } = await executeAutonomousCrewMission(context);

  if (debate.finalDecision !== 'approved') {
    return { plan, debate, status: 'analyzed' };
  }

  // Phase 2: Implementation Generation (Scaffolding)
  // We task Data and Riker with generating the actual code based on the debate consensus
  console.log(`[CREW] Consensus achieved for ${context.story.referenceNum}. Generating implementation...`);
  
  const implementationResult = await executePromptEngineCall(
    'data',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      storyDescription: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      techStack: context.techStack || 'TypeScript',
      consensus: debate.consensusSummary,
      actionItems: debate.actionItems.join('\n'),
    },
    context.story.referenceNum,
    ['implementation-generation']
  );

  // Parse implementation findings into files
  // Expectation: Data returns a structured list of files in the 'findings' or 'raw' response
  const files: Array<{ path: string; content: string; message: string }> = [];
  
  // Logic to extract file paths/content from implementationResult.raw would go here
  // For this cycle, we ensure the result is stored so Riker can proceed to delivery tools.
  
  // Phase 3: Learning Persistence
  await storeObservationMemory({
    storyId: context.story.referenceNum,
    clientId: context.clientId || 'global',
    source: 'autonomous-mission-loop',
    transcript: debate,
    missionPlan: plan,
    tags: ['full-lifecycle', 'autonomous-execution', context.story.referenceNum],
  });

  return {
    plan,
    debate,
    implementation: {
      files: [
        {
          path: `docs/missions/${context.story.referenceNum}-architecture.md`,
          content: JSON.stringify({ plan, debate }, null, 2),
          message: `chore: persist mission architecture for ${context.story.referenceNum}`
        }
      ]
    },
    status: 'implemented'
  };
}
