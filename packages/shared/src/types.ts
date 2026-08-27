/**
 * Centralized type definitions for Story Agent
 */

// Story and PR status types
export type StoryStatus = 'pending' | 'discovery' | 'implementing' | 'pr_open' | 'pr_revision' | 'pr_approved' | 'merged' | 'blocked';
export type PRStatus = 'open' | 'changes_requested' | 'approved' | 'merged' | 'closed';
export type SprintStatus = 'planned' | 'active' | 'completed';
export type ClientComplianceMode = 'standard' | 'regulated' | 'air_gapped' | 'customer_managed';

// Aha domain types
export interface AhaStory {
  id: string;
  referenceNum: string;
  name: string;
  description: string;
  acceptanceCriteria: string;
  epicId?: string;
  url: string;
  workflowStatus: string;
  storyPoints?: number | null;
}

export type AgileStory = AhaStory;

export interface AhaProject {
  id: string;
  name: string;
  referencePrefix: string | null;
  url: string;
}

export type AgileProject = AhaProject;

export interface AhaSprint {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  url: string;
  totalStoryPoints: number;
  doneStoryPoints: number;
  remainingStoryPoints: number;
  featureCount: number;
}

export type AgileSprint = AhaSprint;

export interface AhaSprintStory {
  referenceNum: string;
  name: string;
  storyPoints: number | null;
  workflowStatus: string;
  url: string;
}

export type AhaEpic = {
  id: string;
  name: string;
  description?: string;
  url?: string;
  referenceNum?: string;
  workflowStatus?: string;
};

export type AgileSprintStory = AhaSprintStory;

// Security and client types
export interface ClientSecurityProfile {
  complianceMode: ClientComplianceMode;
  approvedLlmProviders: string[];
  approvedDataStores: string[];
  outboundPolicyNotes: string[];
  restrictedDomains?: string[];
}

export interface ClientRecord {
  id: string;
  name: string;
  slug: string;
  securityProfile: ClientSecurityProfile;
  primaryContact?: string | null;
  notes?: string | null;
  createdAt: string;
}

// Project and planning types
export interface ProjectGoal {
  id: string;
  label: string;
  target?: string | null;
  status?: 'on_track' | 'at_risk' | 'off_track' | 'complete';
}

export interface ProjectMetric {
  id: string;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  source?: string | null;
}

export interface ProjectRecord {
  id: string;
  name: string;
  repoFullName: string;
  ahaProjectId: string | null;
  clientId?: string | null;
  clientName?: string | null;
  description?: string | null;
  goals?: ProjectGoal[];
  metrics?: ProjectMetric[];
  securityProfile?: ClientSecurityProfile | null;
  sprintIds?: string[];
  createdAt: string;
}

// Story tracking types
export interface StoryRecord {
  id: string;
  storyId: string;
  storyTitle: string;
  storyUrl: string;
  repoFullName: string;
  branch: string;
  baseBranch: string;
  status: StoryStatus;
  prNumber: number | null;
  prUrl: string | null;
  prStatus: PRStatus | null;
  phase: 1 | 2;
  createdAt: string;
  updatedAt: string;
  acceptanceCriteria: string;
  notes: string | null;
  clientId?: string | null;
  clientName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  epicId?: string | null;
  sprintId?: string | null;
  sprintName?: string | null;
}

export interface SprintRecord {
  id: string;
  sprintName: string;
  ahaSprintId: string | null;
  ahaProjectId: string | null;
  clientId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  startDate: string | null;
  endDate: string | null;
}

// PR and revision tracking
export interface PRComment {
  id: string;
  storyId: string;
  prNumber: number;
  author: string;
  body: string;
  path: string | null;
  line: number | null;
  state: 'PENDING' | 'SUBMITTED' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  url: string;
}

export interface RevisionCycle {
  id: string;
  storyId: string;
  cycleNumber: number;
  commentsAddressed: string[];
  filesChanged: string[];
  testEvidence: string;
  commitSha: string | null;
  completedAt: string | null;
  createdAt: string;
}

// Observation and memory types
export interface ObservationMemoryRecord {
  id: string;
  sessionId?: string;
  turn?: number;
  topic?: string;
  memory?: string;
  createdAt: string;
  storyId?: string | null;
  crewId?: string | null;
  clientId?: string | null;
  source?: string;
  transcriptHash?: string | null;
  transcriptText?: string | null;
  transcript?: ObservationDebateResult | null;
  missionReference?: string | null;
  tags?: string[];
  embedding?: number[] | null;
  similarity?: number;
  outcome?: 'pending' | 'success' | 'partial' | 'failed' | null;
  outcomeNotes?: string | null;
  executionCompletedAt?: string | null;
}

/**
 * Structured Memory Types
 * Support for the observation lounge and crew memory management system
 */

export type MemorySource = 'system' | 'user' | 'tool' | 'assistant' | string;

export interface MemoryConstraint {
  key: string;
  value?: string;
  rule?: string;
  naturalLanguage?: string;
  confidence?: number;
  source?: MemorySource;
  enforcement?: 'hard' | 'soft';
  evidence?: string;
}

export interface MemoryDecision {
  id?: string;
  decided?: string;
  statement?: string;
  rationale?: string;
  owner?: 'user' | 'assistant';
  confidence?: number;
  source?: MemorySource;
  status?: 'active' | 'accepted' | 'proposed' | 'superseded' | 'expired';
  evidence?: string;
}

export interface MemoryFact {
  key: string;
  value: string;
  source?: MemorySource;
  confidence?: number;
  evidence?: string;
}

export interface MemoryQuestion {
  key?: string;
  question: string;
  answer?: string;
  confidence?: number;
  resolved?: boolean;
  blocking?: boolean;
  source?: MemorySource;
  evidence?: string;
}

export interface StructuredMemoryState {
  facts: Record<string, MemoryFact>;
  constraints: Record<string, MemoryConstraint>;
  decisions: MemoryDecision[];
  openQuestions: Record<string, MemoryQuestion>;
}

export interface StructuredMemoryPatch {
  facts?: MemoryFact[];
  constraints?: MemoryConstraint[];
  decisions?: MemoryDecision[];
  openQuestions?: MemoryQuestion[];
}

export interface ObservationDebateResult {
  consensusSummary?: string;
  provenance?: string;
  finalDecision?: string;
  unresolvedRisks?: string[];
  actionItems?: string[];
  decision?: string;
  reasoning?: string;
  crewId?: string;
  [key: string]: unknown;
}

export interface CrewFinding {
  crewId: string;
  summary: string;
  confidence: number;
  risks: string[];
  recommendations: string[];
}

export type CrewMemberStatus = 'pending' | 'executing' | 'complete' | 'vetoed' | 'error';
export type ExecutionPhase = 'not_started' | 'phase_1_execution' | 'phase_2_revision' | 'complete';

export interface CrewMemberExecution {
  crewId: string;
  crewName: string;
  specialty: string;
  status: CrewMemberStatus;
  findings?: string;
  recommendations?: string[];
  confidence?: number;
  isVeto?: boolean;
  costUsd?: number;
  executedAt?: string;
  durationMs?: number;
}

export interface CrewExecutionState {
  id: string;
  storyRef: string;
  phase: ExecutionPhase;
  status: 'pending' | 'in_progress' | 'blocked' | 'complete';
  crewExecutions: CrewMemberExecution[];
  activeCrewMembers: string[];
  activeSinceMs: number;
  nextStep: string;
  blockers?: string[];
  totalCostUsd: number;
  totalExecutionTimeMs: number;
  createdAt: string;
  updatedAt: string;
  broadcastCount: number;
}

export type CrewRole = 
  | 'captain' | 'first_officer' | 'chief_engineer' | 'doctor' | 'counselor' 
  | 'tactical' | 'science' | 'engineering' | 'communications' | 'operations' 
  | 'architect' | 'developer' | 'infrastructure' | 'devops' | 'security' 
  | 'qa' | 'analyst' | 'health' | 'finance' | 'misc';

export interface CrewAgentProfile {
  id: string;
  name: string;
  role: CrewRole;
  specialty: string;
  bio?: string;
  model?: string;
  responsibilities?: string[];
  decisionWeight?: number;
  authority?: string;
}

export interface ObservationDebateEntry {
  speakerId: string;
  position: 'support' | 'challenge' | 'amendment';
  statement: string;
  evidence: string[];
}

export interface ProjectExecutionState {
  projectId: string;
  projectName: string;
  stories: Array<{
    ref: string;
    title: string;
    status: CrewExecutionState;
  }>;
  crewAssignments: Partial<Record<CrewRole, string[]>>;
  totalCostUsd: number;
  activeStoriesCount: number;
  completedStoriesCount: number;
}

export interface CrewMissionPlan {
  missionId?: string;
  phase?: number;
  tasks?: string[];
  timeline?: string;
  story?: string | AhaStory | { referenceNum?: string };
  executionMode?: 'autonomous' | 'guided';
  repoFullName?: string;
  targetBranch?: string;
  crew?: CrewAgentProfile[];
  sharedMemoryContext?: ObservationMemoryRecord[];
  assignments?: any[];
  findings?: CrewFinding[];
  recommendedExecutionOrder?: string[];
}

// GitHub-related types
export interface Repository {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  private?: boolean;
}

// WebSocket messaging
export interface WebSocketMessage {
  type: string;
  payload?: unknown;
  storyRef?: string;
  error?: string;
  timestamp?: string;
}

// Agile Provider types
export type AgileProviderName = 'aha' | 'jira' | 'monday' | 'azure-devops' | 'linear' | 'github-projects';

export interface AgileProvider {
  name: AgileProviderName;
  domain?: string;
  apiUrl?: string;
  credentials?: Record<string, string | undefined>;
}
