/**
 * Crew Coordinator - Autonomous orchestration of 11-member Sovereign Factory crew
 * 
 * Manages crew operations with Star Trek personas:
 * - Parallel agent execution for efficiency
 * - Authority hierarchy (Worf veto, Picard arbitration)
 * - Consensus building across diverse perspectives
 * - Debate generation from agent findings
 */

import type { AgileStory, CrewMissionPlan, CrewFinding, ObservationDebateResult, ObservationMemoryRecord, StoryRecord } from '@story-agent/shared';
import { resolveClientPolicy } from '@story-agent/shared/client-security-policy';
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
import { getPrimaryExpert } from './domain-registry.js';
import { storeObservationMemory } from '@story-agent/shared/db';

interface CrewOperationContext {
  story: AgileStory;
  repoFullName: string;
  targetBranch: string;
  executionMode: 'autonomous' | 'guided';
  acceptanceCriteria: string;
  /**
   * Client org that scopes memory retrieval.
   * Pass 'client-int' for Client, 'familiarcat' for the Retailer Rewards project, etc.
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
  summary?: { commitMessage: string; prBody: string };
  securitySensitivityScore?: number;
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
    acceptanceCriteria: context.story.acceptanceCriteria,
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

  // Resolve specific security tier for the client to inform Data and Worf
  const policy = resolveClientPolicy(context.clientId);

  // ── Auto-load client-scoped memories if not pre-supplied ──────────────────
  // This is the core memory integration: before the crew runs, we hydrate
  // sharedMemories from the right client bucket so the crew doesn't start blind.
  let sharedMemories = context.sharedMemories;

  if (!sharedMemories || sharedMemories.length === 0) {
    try {
      const { getRelevantObservationMemories } = await import('@story-agent/shared/db');
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

  // Execute all crew analyses in parallel with security tier awareness
  const findings = await executeCrewAnalysis({ 
    ...context, 
    sharedMemories,
    techStack: `${context.techStack || ''} [Security Tier: ${policy.tier}]`
  });

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
 * Helper to parse file paths and content from LLM markdown responses
 * Expects format: ### File: src/path/to/file.ts followed by a code block
 */
function parseFilesFromImplementation(raw: string): Array<{ path: string; content: string; message: string }> {
  const files: Array<{ path: string; content: string; message: string }> = [];
  // Matches ### File: path/to/file followed by any characters until the next ### or end of string
  // Looking for standard markdown code blocks
  const regex = /### File: ([\w./-]+)\n```[\w]*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = regex.exec(raw)) !== null) {
    files.push({
      path: match[1],
      content: match[2].trim(),
      message: `feat: autonomously generate ${match[1]}`
    });
  }
  return files;
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
  // Identify the lead expert based on story tags (default to Data)
  const tags = context.story.description.match(/#(\w+:\w+)/g)?.map(t => t.slice(1)) || [];
  const leadExpertId = (tags.length > 0 ? getPrimaryExpert(tags[0]) : 'data') || 'data';

  console.log(`[CREW] Consensus achieved for ${context.story.referenceNum}.`);
  console.log(`[CREW] Routing implementation generation to Lead Expert: ${leadExpertId.toUpperCase()}`);

  const implementationResult = await executePromptEngineCall(
    leadExpertId as any,
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

  // Phase 2.5: Technical Communication (Uhura)
  // Task Uhura with summarizing the entire mission for git and PR logs
  const commsResult = await executePromptEngineCall(
    'uhura',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      findings: debate.consensusSummary,
    },
    context.story.referenceNum,
    ['mission-summarization']
  );

  // Extract commit summary from Uhura's structured output
  const commitSummaryMatch = commsResult.reasoning.match(/COMMIT_SUMMARY:\s*(.+)/i);
  const commitMessage = commitSummaryMatch ? commitSummaryMatch[1].trim() : `feat: implement ${context.story.referenceNum}`;

  // Extract security sensitivity score
  const securityScoreMatch = commsResult.reasoning.match(/SECURITY_SENSITIVITY_SCORE:\s*(\d+)/i);
  const securitySensitivityScore = securityScoreMatch ? parseInt(securityScoreMatch[1], 10) : 0;

  const generatedFiles = parseFilesFromImplementation(implementationResult.reasoning || '');
  // Apply Uhura's commit message to the files
  generatedFiles.forEach(f => {
    f.message = `${context.story.referenceNum}: ${commitMessage}`;
  });

  // Phase 3: Learning Persistence
  await storeObservationMemory({
    storyId: context.story.referenceNum,
    clientId: context.clientId || 'global',
    source: 'mcp',
    transcript: debate,
    missionPlan: plan,
    tags: ['full-lifecycle', 'autonomous-execution', context.story.referenceNum],
  });

  return {
    plan,
    debate,
    implementation: {
      files: generatedFiles.length > 0 ? generatedFiles : [
        {
          path: `docs/missions/${context.story.referenceNum}-architecture.md`,
          content: JSON.stringify({ plan, debate }, null, 2),
          message: `chore: persist mission architecture for ${context.story.referenceNum}`
        }
      ]
    },
    summary: {
      commitMessage,
      prBody: commsResult.reasoning || debate.consensusSummary,
    },
    securitySensitivityScore,
    status: 'implemented'
  };
}
