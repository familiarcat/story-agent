/**
 * Sovereign Factory Crew Member LLM Agents - 11 Star Trek personas
 * 
 * Each crew member uses the Prompt Engine for:
 * - Unified prompt template management
 * - Proper system prompt engineering
 * - Prompt archival and auditing
 * - Cost tracking and optimization
 */

import type { AgileStory, CrewFinding, ObservationMemoryRecord } from '@story-agent/shared';
import { executePromptEngineCall, type PromptEngineResult } from './prompt-engine.js';

export interface CrewAgentContext {
  story: AgileStory;
  repoFullName: string;
  targetBranch: string;
  techStack?: string;
  testPolicy?: string;
  reviewers?: string;
  sharedMemories?: ObservationMemoryRecord[];
}

/**
 * Convert PromptEngineResult to CrewFinding
 */
function resultToFinding(crewId: string, result: PromptEngineResult): CrewFinding {
  return {
    crewId,
    summary: result.findings[0] || 'Analysis complete',
    confidence: result.confidence,
    risks: result.findings.filter(f => f.toLowerCase().includes('risk') || f.toLowerCase().includes('concern')),
    recommendations: result.recommendations,
  };
}

// ── CAPTAIN PICARD - Strategic Command ────────────────────────────────────

export async function captainPicardAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'picard',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      storyDescription: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['executive-analysis']
  );

  return {
    ...resultToFinding('picard', result),
    summary: `Captain's Command: ${result.findings[0] || 'Mission accepted for execution'}`,
  };
}

// ── COMMANDER DATA - DDD Architecture ────────────────────────────────────

export async function dataArchitectAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'data',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      storyDescription: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['architecture-design']
  );

  return {
    ...resultToFinding('data', result),
    summary: `Data's Architectural Design: ${result.findings[0] || 'Design validated'}`,
  };
}

// ── COMMANDER RIKER - Tactical Implementation ────────────────────────────

export async function rikerDeveloperAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'riker',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      storyDescription: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
      testPolicy: context.testPolicy,
    },
    context.story.referenceNum,
    ['tactical-implementation']
  );

  return {
    ...resultToFinding('riker', result),
    summary: `Riker's Tactical Plan: ${result.findings[0] || 'Implementation strategy ready'}`,
  };
}

// ── GEORDI LA FORGE - Infrastructure ─────────────────────────────────────

export async function geordiInfraAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'geordi',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['infrastructure-assessment']
  );

  return {
    ...resultToFinding('geordi', result),
    summary: `Geordi's Infrastructure Plan: ${result.findings[0] || 'Infrastructure validated'}`,
  };
}

// ── CHIEF O'BRIEN - DevOps ───────────────────────────────────────────────

export async function obrienDevOpsAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'obrien',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['devops-integration']
  );

  return {
    ...resultToFinding('obrien', result),
    summary: `O'Brien's DevOps Plan: ${result.findings[0] || 'CI/CD flow ready'}`,
  };
}

// ── LT. WORF - Security (VETO AUTHORITY) ─────────────────────────────────

export async function worfSecurityAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'worf',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      description: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['security-audit', 'veto-authority']
  );

  // Worf has veto authority - highlight if security veto is triggered
  const finding = resultToFinding('worf', result);

  if (result.hasSecurityVeto) {
    finding.summary = `⚠️ SECURITY VETO TRIGGERED: ${result.findings[0] || 'Security blocking concern detected'}`;
    console.error(
      `[CREW_COORDINATOR] ⚠️ LT. WORF SECURITY VETO on story ${context.story.referenceNum} - Escalating to Captain Picard`
    );
  } else {
    finding.summary = `Worf's Security Assessment: ${result.findings[0] || 'Security validated'}`;
  }

  return finding;
}

// ── TASHA YAR - QA Auditor ───────────────────────────────────────────────

export async function tashaQAAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'yar',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      acceptanceCriteria: context.story.acceptanceCriteria,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      testPolicy: context.testPolicy,
    },
    context.story.referenceNum,
    ['qa-audit']
  );

  return {
    ...resultToFinding('yar', result),
    summary: `Yar's QA Assessment: ${result.findings[0] || 'Quality validated'}`,
  };
}

// ── COUNSELOR TROI - Stakeholder Analyst ─────────────────────────────────

export async function troiAnalystAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'troi',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      description: context.story.description,
      acceptanceCriteria: context.story.acceptanceCriteria,
      reviewers: context.reviewers,
    },
    context.story.referenceNum,
    ['stakeholder-analysis']
  );

  return {
    ...resultToFinding('troi', result),
    summary: `Troi's Stakeholder Analysis: ${result.findings[0] || 'Intent validated'}`,
  };
}

// ── DR. BEVERLY CRUSHER - System Health ──────────────────────────────────

export async function crusherHealthAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'crusher',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['health-assessment']
  );

  return {
    ...resultToFinding('crusher', result),
    summary: `Crusher's Health Assessment: ${result.findings[0] || 'System health validated'}`,
  };
}

// ── LT. UHURA - Communications ──────────────────────────────────────────

export async function uhuraCommunicationsAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'uhura',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      reviewers: context.reviewers,
    },
    context.story.referenceNum,
    ['communications-strategy']
  );

  return {
    ...resultToFinding('uhura', result),
    summary: `Uhura's Communications Plan: ${result.findings[0] || 'Communications strategy ready'}`,
  };
}

// ── QUARK - Financial Analyst ───────────────────────────────────────────

export async function quarkFinanceAnalysis(context: CrewAgentContext): Promise<CrewFinding> {
  const result = await executePromptEngineCall(
    'quark',
    {
      storyNum: context.story.referenceNum,
      storyName: context.story.name,
      repoFullName: context.repoFullName,
      targetBranch: context.targetBranch,
      techStack: context.techStack,
    },
    context.story.referenceNum,
    ['financial-analysis']
  );

  return {
    ...resultToFinding('quark', result),
    summary: `Quark's Cost Analysis: ${result.findings[0] || 'Cost optimization recommended'}`,
  };
}
