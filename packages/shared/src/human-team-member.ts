/**
 * Human Team Member Integration System
 * 
 * Supports:
 * 1. Human developers as first-class team members
 * 2. OpenRouter crew as code assistants to humans
 * 3. AI agents instantiated from GitHub profiles of developers
 * 4. "Human in the loop" gates for review/approval
 * 
 * "The difference between a human and a computer is that a human has
 *  empathy. Once you understand another person's position, it becomes
 *  impossible to hate them." — Counselor Deanna Troi
 */

import { UUID } from './pm-types.js';

// ============================================================================
// HUMAN TEAM MEMBER TYPES
// ============================================================================

export type TeamMemberKind = 'human' | 'ai-crew' | 'ai-profile-based';

export type HumanRole = 'engineer' | 'architect' | 'tech-lead' | 'manager' | 'reviewer' | 'stakeholder';

export type CommunicationStyle = 'direct' | 'diplomatic' | 'collaborative' | 'analytical' | 'visionary';

export interface HumanTeamMember {
  id: UUID;
  clientId: UUID;
  kind: 'human';
  
  // Identity
  name: string;
  email: string;
  gitHubHandle?: string;
  slackHandle?: string;
  
  // Role & Skills
  roles: HumanRole[];
  primaryRole: HumanRole;
  skills: string[];
  specializations: string[];
  
  // Communication Profile
  communicationStyle: CommunicationStyle;
  preferredLanguage: 'english' | string;
  timezone: string;
  
  // Availability
  hoursPerWeek: number;
  availability: {
    monday?: string; // e.g., "9:00-17:00"
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
  };
  
  // GitHub Integration
  gitHubProfile?: {
    username: string;
    url: string;
    profileAnalyzedAt?: string; // ISO timestamp when profile was last analyzed
    profileVersion?: number; // Version of analysis (re-analyze when version bumps)
  };
  
  // Preferences
  preferredStoryTypes?: string[]; // e.g., ['backend', 'security', 'testing']
  reviewCriteria?: string[]; // What they prioritize in code review
  
  // Status
  active: boolean;
  joinedAt: string; // RFC3339
  createdAt: string;
  updatedAt: string;
}

/**
 * AI Crew member paired with a human for "human in the loop"
 * The crew assists the human by:
 * - Preparing analysis before human review
 * - Implementing decisions
 * - Handling async work while human is offline
 * - Learning from human feedback
 */
export interface AICrew {
  id: UUID;
  clientId: UUID;
  kind: 'ai-crew';
  
  // Crew Identity
  crewMemberId: 'picard' | 'data' | 'riker' | 'geordi' | 'obrien' | 'worf' | 'yar' | 'troi' | 'crusher' | 'uhura' | 'quark';
  crewName: string;
  
  // Assignment
  pairedHumanId?: UUID; // If paired with a human
  primaryDomain: string; // e.g., 'architecture', 'implementation'
  
  // Autonomy Level (gradually increase)
  autonomyLevel: 0 | 1 | 2 | 3 | 4 | 5;
  autonomyLevelDescription: string; // e.g., "Observation & Proposal"
  
  // Role in Team
  role: 'assistant-to-human' | 'autonomous-contributor' | 'lead-engineer';
  
  // Status
  active: boolean;
  assignedAt: string; // RFC3339
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AI AGENT PROFILES (Synthesized from GitHub)
// ============================================================================

/**
 * Profile of a developer extracted from GitHub history.
 * Can be used to instantiate an AI agent that mimics their style.
 */
export interface GitHubDeveloperProfile {
  id: UUID;
  clientId: UUID;
  kind: 'ai-profile-based';
  
  // Source Data
  gitHubUsername: string;
  gitHubUrl: string;
  sourceHumanId?: UUID; // If this came from analyzing a human team member
  
  // Extracted Identity
  developmentName: string; // Name for this AI agent (can be same as human or derived)
  biography?: string; // Generated from activity
  
  // ── Communication Patterns (Troi Analysis) ──
  communication: {
    tone: 'direct' | 'diplomatic' | 'collaborative' | 'analytical' | 'mentoring';
    toneProbability: number; // 0-1 confidence
    responseTime: 'quick' | 'thoughtful' | 'thorough'; // How long they think before responding
    emphasisAreas: string[]; // What they comment on most: "error-handling", "performance", "testability"
    supportiveness: number; // 0-1, how much they help reviewers
    evidenceSnippets: string[]; // Example comments/PRs showing this pattern
  };
  
  // ── Decision Patterns (Data Analysis) ──
  decisions: {
    riskTolerance: 'conservative' | 'balanced' | 'aggressive'; // Based on PR choices
    riskTolerance_probability: number; // Confidence
    architecturePhilosophy: string[]; // "modular", "SOLID", "event-driven", etc.
    testingPhilosophy: 'minimal' | 'pragmatic' | 'comprehensive';
    codeReviewStrictness: 'lenient' | 'moderate' | 'strict';
    decisionComments: string[]; // Example PRs showing decision patterns
  };
  
  // ── Technical Strengths ──
  technicalStrengths: {
    languages: Array<{ language: string; proficiency: number; exampleRepos: string[] }>;
    domains: Array<{ domain: string; strength: number; yearsExperience: number }>;
    tools: string[];
    weaknesses?: string[];
  };
  
  // ── Engagement Metrics ──
  engagement: {
    totalContributions: number;
    pullRequestsCreated: number;
    pullRequestsReviewed: number;
    issuesCreated: number;
    issuesResolved: number;
    averageReviewTimeHours: number;
    reviewResponsivenessRate: number; // 0-1
    collaborationScore: number; // 0-1, based on co-contributions
  };
  
  // ── Learning Profile ──
  learning: {
    growthAreas: string[]; // Areas they're working on
    mentorshipStyle?: string; // If they mentor others
    adoptsNewTools: 'quickly' | 'gradually' | 'cautiously';
  };
  
  // Metadata
  profileVersion: number; // For re-analysis tracking
  analyzedAt: string; // ISO timestamp
  nextAnalysisAt?: string; // When to re-analyze
  analysis: {
    totalCommits: number;
    totalPRs: number;
    dateRangeMonths: number; // How much history was analyzed
    confidence: number; // 0-1, how confident is this profile
    methodology: string; // Describe how we built this (for transparency)
  };
}

/**
 * An AI Agent based on a GitHub profile.
 * This is what gets instantiated and run.
 */
export interface AIProfileBasedAgent {
  id: UUID;
  clientId: UUID;
  kind: 'ai-profile-based';
  
  // Link to source profile
  profileId: UUID; // GitHubDeveloperProfile.id
  profileVersionUsed: number; // In case profile is updated
  
  // Instance Identity
  agentName: string;
  agentDescription: string;
  
  // Activation
  active: boolean;
  activatedAt: string;
  deactivatedAt?: string;
  
  // System Prompt (synthesized from profile)
  systemPromptSeed: string;
  systemPromptVersion: number;
  
  // RAG Memory (stores GitHub history for reference)
  ragMemoryId?: UUID;
  ragMemoryTags: string[];
  
  // Autonomy
  autonomyLevel: 0 | 1 | 2 | 3 | 4 | 5;
  autonomyLevelDescription: string;
  
  // Human Oversight
  requiresApprovalFor: string[]; // ['breaking-changes', 'architecture-decisions', 'data-modifications']
  escalationContact?: UUID; // Human ID to escalate to
  
  // Performance Tracking
  missionsCompleted: number;
  learningScore: number; // 0-1, how well is the profile matching actual output
  lastMissionAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TEAM ROSTER — Links humans and AI agents to clients and missions
// ============================================================================

export interface ClientTeamRoster {
  id: UUID;
  clientId: UUID;
  
  // Team Composition
  humanMembers: UUID[]; // HumanTeamMember.id
  aiCrew: UUID[]; // AICrew.id
  aiAgents: UUID[]; // AIProfileBasedAgent.id
  
  // Team Structure
  teamLead?: UUID; // Human or AI ID
  techLead?: UUID;
  reviewers: UUID[]; // Who can approve work
  
  // Roles Matrix
  roleAssignments: {
    memberId: UUID; // Human/AI ID
    roles: string[];
  }[];
  
  // Capacity Planning
  totalCapacityHoursPerWeek: number;
  humanCapacityHours: number;
  aiCapacityHours: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HUMAN-IN-THE-LOOP GATES
// ============================================================================

export type ApprovalGateType = 'review' | 'decision' | 'escalation' | 'learning-feedback';

export interface ApprovalGate {
  id: UUID;
  missionId?: UUID;
  storyId?: UUID;
  
  // Gate Details
  gateType: ApprovalGateType;
  description: string;
  
  // Who needs to approve
  requiresApprovalFrom: UUID[]; // Human IDs
  approvalsReceived: Array<{
    humanId: UUID;
    approvedAt: string;
    feedback?: string;
  }>;
  
  // What needs approval
  proposedChange: {
    category: string; // "code-review", "architecture", "data-migration"
    details: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Timing
  createdAt: string;
  approvalDeadline?: string;
  resolvedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

// ============================================================================
// LEARNING FROM HUMAN FEEDBACK
// ============================================================================

/**
 * When a human provides feedback on AI crew work,
 * store it to improve future agent profiles.
 */
export interface HumanFeedbackRecord {
  id: UUID;
  clientId: UUID;
  
  // Context
  aiCrewId?: UUID;
  aiAgentId?: UUID;
  missionId?: UUID;
  
  // Feedback
  humanId: UUID; // Who gave feedback
  feedbackType: 'approval' | 'revision' | 'correction' | 'suggestion' | 'escalation';
  feedbackText: string;
  
  // What changed as a result
  implementedChanges?: string;
  learningOutcome: string; // What the AI learned
  
  // Metadata
  createdAt: string;
  tags: string[];
}
