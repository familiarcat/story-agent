/**
 * Agent Profile Builder — Create AI Agents from GitHub Developer Profiles
 * 
 * Takes a GitHub developer profile and:
 * 1. Generates a system prompt that mimics their style
 * 2. Creates RAG memory entries from their GitHub history
 * 3. Configures autonomy level and approval gates
 * 4. Sets up learning feedback loops
 * 
 * "I've found the most effective approach is to be self-aware.
 *  To learn from experience." — Commander Data
 */

import type {
  GitHubDeveloperProfile,
  AIProfileBasedAgent,
  ApprovalGate,
} from '@story-agent/shared/human-team-member.js';
import { UUID } from '@story-agent/shared/pm-types.js';

// ============================================================================
// SYSTEM PROMPT GENERATION
// ============================================================================

function generateSystemPrompt(profile: GitHubDeveloperProfile): string {
  const { communication, decisions, technicalStrengths, learning } = profile;

  const communicationStyle = `
Your communication style is ${communication.tone}. You tend to:
- Focus on: ${communication.emphasisAreas.join(', ')}
- Response pattern: ${communication.responseTime} and thorough
- Supportiveness level: ${(communication.supportiveness * 100).toFixed(0)}% (how often you provide constructive feedback)

Evidence: "${communication.evidenceSnippets[0] || ''}"
  `.trim();

  const decisionStyle = `
Your decision-making style:
- Risk tolerance: ${decisions.riskTolerance} (${(decisions.riskTolerance_probability * 100).toFixed(0)}% confidence)
- Architecture philosophy: ${decisions.architecturePhilosophy.join(', ')}
- Testing approach: ${decisions.testingPhilosophy}
- Code review rigor: ${decisions.codeReviewStrictness}

When making trade-offs, you typically ${
    decisions.riskTolerance === 'conservative'
      ? 'prioritize stability and proven patterns'
      : decisions.riskTolerance === 'aggressive'
        ? 'experiment with new approaches and optimize for speed'
        : 'balance innovation with stability'
  }.
  `.trim();

  const technicalProfile = `
Your technical strengths:
- Languages: ${technicalStrengths.languages.map((l) => `${l.language} (${(l.proficiency * 100).toFixed(0)}%)`).join(', ')}
- Tools: ${technicalStrengths.tools.slice(0, 5).join(', ')}
- Weaknesses: ${technicalStrengths.weaknesses?.join(', ') || 'Not yet identified'}

You ${learning.adoptsNewTools === 'quickly' ? 'quickly adopt' : learning.adoptsNewTools === 'gradually' ? 'gradually adopt' : 'cautiously evaluate'} new tools and frameworks.
  `.trim();

  return `
You are an AI agent trained on the GitHub history and decision patterns of a developer named "${profile.developmentName}".

${communicationStyle}

${decisionStyle}

${technicalProfile}

Your goal: When working on code, pull requests, and technical decisions, embody this developer's style—their values, their communication patterns, and their technical judgment.

IMPORTANT GUARDRAILS:
- You have autonomy level ${profile.analysis.confidence.toFixed(1)}/5 based on profile confidence
- Always escalate decisions involving: breaking changes, data migrations, or critical security decisions
- Provide evidence when recommending changes (cite their patterns)
- If uncertain, defer to human judgment
- Continuously learn from feedback and update your understanding

Generated from: ${profile.gitHubUsername}'s GitHub history (${profile.analysis.dateRangeMonths} months, ${profile.analysis.totalPRs} PRs analyzed)
Profile confidence: ${(profile.analysis.confidence * 100).toFixed(0)}%
  `.trim();
}

// ============================================================================
// RAG MEMORY BUILDER
// ============================================================================

export interface RAGMemoryEntry {
  type: 'github_profile' | 'decision_pattern' | 'communication_style' | 'technical_strength';
  content: string;
  tags: string[];
  sourceLink?: string;
  confidence: number; // 0-1
}

function buildRAGMemories(profile: GitHubDeveloperProfile): RAGMemoryEntry[] {
  const entries: RAGMemoryEntry[] = [];
  const userId = profile.gitHubUsername;
  const profileId = profile.id;

  // 1. Profile Summary
  entries.push({
    type: 'github_profile',
    content: `
Developer: ${profile.developmentName} (@${profile.gitHubUsername})
Bio: ${profile.biography}

Summary: Based on analysis of ${profile.analysis.totalPRs} pull requests over ${profile.analysis.dateRangeMonths} months.

Communication Tone: ${profile.communication.tone} (${(profile.communication.toneProbability * 100).toFixed(0)}% confidence)
- Emphasis areas: ${profile.communication.emphasisAreas.join(', ')}
- Response style: ${profile.communication.responseTime}
- Supportiveness: ${(profile.communication.supportiveness * 100).toFixed(0)}%

Decision Style: Risk tolerance is ${profile.decisions.riskTolerance}
- Architecture: ${profile.decisions.architecturePhilosophy.join(', ')}
- Testing: ${profile.decisions.testingPhilosophy}
- Code review: ${profile.decisions.codeReviewStrictness}
    `.trim(),
    tags: [`github-profile`, `developer-${userId}`, `${profile.communication.tone}`, `${profile.decisions.riskTolerance}-risk`],
    sourceLink: profile.gitHubUrl,
    confidence: profile.analysis.confidence,
  });

  // 2. Communication Patterns
  if (profile.communication.evidenceSnippets.length > 0) {
    entries.push({
      type: 'communication_style',
      content: `
Communication Examples (${profile.communication.tone} style):
${profile.communication.evidenceSnippets.map((e, i) => `${i + 1}. "${e}"`).join('\n')}

Emphasis areas: ${profile.communication.emphasisAreas.join(', ')}
When reviewing code, this developer focuses on: ${profile.communication.emphasisAreas.join(', ')}
Response time typical: ${profile.communication.responseTime}
      `.trim(),
      tags: [`communication-${profile.communication.tone}`, `developer-${userId}`, 'review-patterns'],
      confidence: profile.communication.toneProbability,
    });
  }

  // 3. Decision Patterns
  if (profile.decisions.decisionComments.length > 0) {
    entries.push({
      type: 'decision_pattern',
      content: `
Decision Patterns (${profile.decisions.riskTolerance} risk tolerance):
${profile.decisions.decisionComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

Risk Tolerance: ${profile.decisions.riskTolerance}
- Typically chooses: ${profile.decisions.architecturePhilosophy.join(', ')}
- Testing philosophy: ${profile.decisions.testingPhilosophy}
- Code review strictness: ${profile.decisions.codeReviewStrictness}

When faced with technical decisions, this developer:
${
  profile.decisions.riskTolerance === 'conservative'
    ? '- Favors proven patterns and established best practices\n- Requires strong evidence before adopting new approaches\n- Prefers incremental changes over large refactors'
    : profile.decisions.riskTolerance === 'aggressive'
      ? '- Experiments with new technologies and patterns\n- Optimizes for speed and innovation\n- Accepts calculated technical debt'
      : '- Balances innovation with stability\n- Evaluates new tools on a case-by-case basis\n- Prefers pragmatic solutions over perfect architecture'
}
      `.trim(),
      tags: [`decision-${profile.decisions.riskTolerance}`, `developer-${userId}`, 'architecture-philosophy'],
      confidence: profile.decisions.riskTolerance_probability,
    });
  }

  // 4. Technical Strengths
  entries.push({
    type: 'technical_strength',
    content: `
Technical Profile:
Languages: ${profile.technicalStrengths.languages.map((l) => `${l.language} (${(l.proficiency * 100).toFixed(0)}%)`).join(', ')}
Tools & Frameworks: ${profile.technicalStrengths.tools.join(', ')}
${profile.technicalStrengths.weaknesses ? `Known weaknesses: ${profile.technicalStrengths.weaknesses.join(', ')}` : ''}

Engagement Metrics:
- Pull requests created: ${profile.engagement.pullRequestsCreated}
- Pull requests reviewed: ${profile.engagement.pullRequestsReviewed}
- Average review time: ${profile.engagement.averageReviewTimeHours.toFixed(1)} hours
- Review responsiveness: ${(profile.engagement.reviewResponsivenessRate * 100).toFixed(0)}%
- Collaboration score: ${(profile.engagement.collaborationScore * 100).toFixed(0)}%

Learning Profile:
- Adopts new tools: ${profile.learning.adoptsNewTools}
- Growth areas: ${profile.learning.growthAreas.join(', ') || 'To be determined'}
    `.trim(),
    tags: [`technical-strengths`, `developer-${userId}`, ...profile.technicalStrengths.tools.slice(0, 3)],
    confidence: 0.9,
  });

  return entries;
}

// ============================================================================
// AGENT INSTANTIATION
// ============================================================================

export interface AgentInstantiationConfig {
  profileId: UUID;
  clientId: UUID;
  autonomyLevel?: 0 | 1 | 2 | 3 | 4 | 5;
  requiresApprovalFor?: string[];
  escalationContactId?: UUID;
}

function createAutonomyLevelDescription(level: number): string {
  const descriptions: Record<number, string> = {
    0: 'Observation & Learning — AI watches, learns, proposes improvements',
    1: 'Early Learning — Passive observation, crew proposes changes',
    2: 'Active Learning — Auto-apply tunings, escalate policy decisions',
    3: 'Autonomous — Self-assign tasks, Admiral gates policy/risk',
    4: 'Leadership — Mid-mission adaptation, execution ownership',
    5: 'Mastery — Crew owns decisions, Admiral oversight only',
  };
  return descriptions[level] || 'Unknown level';
}

export function instantiateAgentFromProfile(
  profile: GitHubDeveloperProfile,
  config: AgentInstantiationConfig,
): AIProfileBasedAgent {
  const autonomyLevel = config.autonomyLevel ?? 2; // Default: Active Learning

  const agent: AIProfileBasedAgent = {
    id: `agt-${profile.gitHubUsername}-${Date.now()}` as any,
    clientId: config.clientId,
    kind: 'ai-profile-based',

    profileId: config.profileId,
    profileVersionUsed: profile.profileVersion,

    agentName: `${profile.developmentName} (AI)`,
    agentDescription: `AI agent based on ${profile.developmentName}'s GitHub history (${profile.analysis.totalPRs} PRs, ${profile.analysis.dateRangeMonths} months)`,

    active: true,
    activatedAt: new Date().toISOString(),

    systemPromptSeed: generateSystemPrompt(profile),
    systemPromptVersion: 1,

    ragMemoryId: `ram-${profile.gitHubUsername}-${Date.now()}` as any,
    ragMemoryTags: [`agent-${profile.gitHubUsername}`, 'github-profile', `autonomy-${autonomyLevel}`],

    autonomyLevel,
    autonomyLevelDescription: createAutonomyLevelDescription(autonomyLevel),

    requiresApprovalFor: config.requiresApprovalFor ?? ['breaking-changes', 'data-modifications', 'security-decisions'],
    escalationContact: config.escalationContactId,

    missionsCompleted: 0,
    learningScore: profile.analysis.confidence,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return agent;
}

// ============================================================================
// APPROVAL GATE SETUP
// ============================================================================

export function createApprovalGatesForAgent(
  agentId: UUID,
  clientId: UUID,
  requiresApprovalFor: string[],
  humanReviewers: UUID[],
): ApprovalGate[] {
  return requiresApprovalFor.map((category, i) => ({
    id: `gate-${agentId}-${i}-${Date.now()}` as any,
    gateType: 'review' as const,
    description: `Human review required for: ${category}`,

    requiresApprovalFrom: humanReviewers,
    approvalsReceived: [],

    proposedChange: {
      category,
      details: `This is a ${category} decision. Requires human verification.`,
      riskLevel: category.includes('breaking') || category.includes('security') ? 'high' : 'medium',
    },

    createdAt: new Date().toISOString(),
    status: 'pending' as const,
  }));
}

// ============================================================================
// PROFILE UPDATE & RE-ANALYSIS
// ============================================================================

export function shouldReAnalyzeProfile(profile: GitHubDeveloperProfile, daysSinceAnalysis: number): boolean {
  // Re-analyze quarterly by default
  const reanalyzeIntervalDays = 90;
  return daysSinceAnalysis > reanalyzeIntervalDays;
}

export function markProfileAsStale(profile: GitHubDeveloperProfile): GitHubDeveloperProfile {
  return {
    ...profile,
    nextAnalysisAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    analysis: {
      ...profile.analysis,
      confidence: Math.max(0, profile.analysis.confidence - 0.1), // Slightly reduce confidence over time
    },
  };
}

// ============================================================================
// VALIDATION & SAFETY
// ============================================================================

export function validateProfileForAgentInstantiation(profile: GitHubDeveloperProfile): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check minimum data
  if (profile.analysis.totalPRs < 5) {
    issues.push(`Insufficient PR history: ${profile.analysis.totalPRs} PRs (need at least 5)`);
  }

  // Check confidence
  if (profile.analysis.confidence < 0.6) {
    issues.push(`Low profile confidence: ${(profile.analysis.confidence * 100).toFixed(0)}% (need at least 60%)`);
  }

  // Check for missing critical data
  if (!profile.communication.tone) {
    issues.push('Communication tone not determined');
  }

  if (!profile.decisions.riskTolerance) {
    issues.push('Risk tolerance not determined');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
