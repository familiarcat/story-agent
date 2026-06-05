// Shared types across MCP server and Next.js UI

export type StoryStatus =
  | 'pending'
  | 'discovery'
  | 'implementing'
  | 'pr_open'
  | 'pr_revision'
  | 'pr_approved'
  | 'merged'
  | 'blocked';

export type PRStatus =
  | 'open'
  | 'changes_requested'
  | 'approved'
  | 'merged'
  | 'closed';

export interface AhaStory {
  id: string;
  referenceNum: string;  // e.g. STORY-123
  name: string;
  description: string;
  acceptanceCriteria: string;
  url: string;
  workflowStatus: string;
}

// Provider-agnostic aliases — prefer these in new code
export type AgileStory = AhaStory;

export interface AhaProject {
  id: string;
  name: string;
  referencePrefix: string | null;
  url: string;
}

export type AgileProject = AhaProject;

// Sprint / iteration — provider-agnostic
export type AgileSprint = AhaSprint;
export type AgileSprintStory = AhaSprintStory;

export interface Repository {
  owner: string;
  name: string;
  fullName: string;         // owner/name
  defaultBranch: string;    // dev or main (resolved at runtime)
  url: string;
}

export interface StoryRecord {
  id: string;
  storyId: string;          // Aha reference num e.g. STORY-123
  storyTitle: string;
  storyUrl: string;
  repoFullName: string;
  branch: string;
  baseBranch: string;       // dev or main
  status: StoryStatus;
  prNumber: number | null;
  prUrl: string | null;
  prStatus: PRStatus | null;
  phase: 1 | 2;             // 1 = implementation, 2 = revision
  createdAt: string;
  updatedAt: string;
  notes: string | null;
}

export interface PRComment {
  id: string;
  storyId: string;
  prNumber: number;
  author: string;
  body: string;
  path: string | null;      // file path if inline comment
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

export interface ProjectRecord {
  id: string;
  name: string;
  repoFullName: string;
  ahaProjectId: string | null;
  createdAt: string;
}

// ── Sprint / Agile types ──────────────────────────────────────────────────────

export interface AhaSprint {
  id: string;
  name: string;             // e.g. "Sprint 23"
  startDate: string | null; // ISO date
  endDate: string | null;
  url: string;
  totalStoryPoints: number;
  doneStoryPoints: number;
  remainingStoryPoints: number;
  featureCount: number;
}

export interface AhaSprintStory {
  referenceNum: string;
  name: string;
  storyPoints: number | null;
  workflowStatus: string;
  url: string;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface SprintRecord {
  id: string;
  sprintName: string;
  ahaSprintId: string | null;
  ahaProjectId: string | null;
  startDate: string | null;
  endDate: string | null;
  lengthDays: number | null;
  totalPoints: number;
  completedPoints: number;
  status: SprintStatus;
  rituals: SprintRituals;
  createdAt: string;
  updatedAt: string;
}

export interface SprintRituals {
  planningDate: string | null;
  reviewDate: string | null;
  retroDate: string | null;
  standupCadence: 'daily' | 'custom' | null;
  notes: string | null;
}

// Extends StoryRecord with sprint/agile fields (used in wizard output)
export interface StoryMission {
  story: AgileStory;
  sprint: AgileSprint | null;
  storyPoints: number | null;
  executionMode: 'autonomous' | 'guided';
  repo: string;
  baseBranch: string;
  techStack: string;
  reviewers: string;
  testPolicy: string;
  nonGoals: string;
  riskAreas: string;
}

// ── Multi-platform Agile Provider contract ────────────────────────────────────

export type AgileProviderName =
  | 'aha'
  | 'jira'
  | 'linear'
  | 'github-projects'
  | 'azure-devops';

export interface AgileProviderConfig {
  /** Which provider to use */
  provider: AgileProviderName;
  /** Base domain or org (provider-specific) */
  domain?: string;
  /** API key or token */
  apiKey?: string;
  /** Additional provider-specific options */
  options?: Record<string, string>;
}

/**
 * The canonical interface every agile provider must implement.
 * MCP tools and UI routes call this instead of Aha-specific functions.
 */
export interface AgileProvider {
  readonly name: AgileProviderName;

  /** Fetch a single story/issue by its reference (e.g. STORY-123, PROJ-456, LADV-2627) */
  getStory(referenceNum: string): Promise<AgileStory>;

  /** List projects/boards/spaces visible to the configured credentials */
  listProjects(page?: number): Promise<AgileProject[]>;

  /** List stories in a project */
  listStoriesForProject(projectId: string, page?: number): Promise<AgileStory[]>;

  /** List sprints/iterations for a project */
  listSprints(projectId: string): Promise<AgileSprint[]>;

  /** Get a single sprint/iteration */
  getSprint(sprintId: string): Promise<AgileSprint>;

  /** Get stories assigned to a sprint */
  getSprintStories(sprintId: string): Promise<AgileSprintStory[]>;

  /** Update story workflow status */
  updateStoryStatus(storyId: string, statusName: string): Promise<void>;

  /** Add a comment/link on a story (e.g. link to GitHub PR) */
  addStoryComment(storyId: string, body: string): Promise<void>;
}

// ── Crew Agent Orchestration ────────────────────────────────────────────────

export type CrewRole =
  | 'captain'
  | 'architect'
  | 'developer'
  | 'infrastructure'
  | 'devops'
  | 'security'
  | 'qa'
  | 'analyst'
  | 'health'
  | 'communications'
  | 'finance';

export type CrewAuthority =
  | 'executive'
  | 'architectural'
  | 'tactical'
  | 'infrastructure'
  | 'operational'
  | 'security_veto'
  | 'quality'
  | 'stakeholder'
  | 'observability'
  | 'communications'
  | 'financial';

export interface CrewAgentProfile {
  id: string;
  name: string;
  role: CrewRole;
  specialty: string;
  responsibilities: string[];
  decisionWeight: number;
  model?: string;           // LLM model to use (claude-3-opus, gpt-4o-mini, etc)
  authority?: CrewAuthority; // Type of authority this crew member has
}

export interface CrewAssignment {
  crewId: string;
  objective: string;
  deliverable: string;
  completionCriteria: string[];
}

export interface CrewFinding {
  crewId: string;
  summary: string;
  confidence: number;
  risks: string[];
  recommendations: string[];
}

export interface ObservationDebateEntry {
  speakerId: string;
  position: 'support' | 'challenge' | 'amendment';
  statement: string;
  evidence: string[];
}

export interface ObservationDebateResult {
  rounds: Array<{
    title: string;
    entries: ObservationDebateEntry[];
  }>;
  consensusSummary: string;
  unresolvedRisks: string[];
  finalDecision: 'approved' | 'revise' | 'blocked';
  actionItems: string[];
}

export interface ObservationMemoryRecord {
  id: string;
  storyId: string;
  source: 'mcp' | 'ui';
  transcriptHash: string;
  transcriptText: string;
  transcript: ObservationDebateResult;
  missionReference: string | null;
  tags: string[];
  embedding: number[];
  similarity?: number;
  createdAt: string;
}

export interface CrewMissionPlan {
  story: AgileStory;
  executionMode: 'autonomous' | 'guided';
  repoFullName: string;
  targetBranch: string;
  crew: CrewAgentProfile[];
  sharedMemoryContext: ObservationMemoryRecord[];
  assignments: CrewAssignment[];
  findings: CrewFinding[];
  recommendedExecutionOrder: string[];
}
