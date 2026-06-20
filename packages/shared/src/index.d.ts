export type StoryStatus = 'pending' | 'discovery' | 'implementing' | 'pr_open' | 'pr_revision' | 'pr_approved' | 'merged' | 'blocked';
export type PRStatus = 'open' | 'changes_requested' | 'approved' | 'merged' | 'closed';
export interface AhaStory {
    id: string;
    referenceNum: string;
    name: string;
    description: string;
    acceptanceCriteria: string;
    epicId?: string;
    url: string;
    workflowStatus: string;
}
export type AgileStory = AhaStory;
export interface AhaProject {
    id: string;
    name: string;
    referencePrefix: string | null;
    url: string;
}
export type AgileProject = AhaProject;
export type AgileSprint = AhaSprint;
export type AgileSprintStory = AhaSprintStory;
export interface Repository {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    url: string;
}
export type ClientComplianceMode = 'standard' | 'regulated' | 'air_gapped' | 'customer_managed';
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
    clientId?: string | null;
    projectId?: string | null;
    projectName?: string | null;
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
export * from './client-scope.js';
export * from './client-security-policy.js';
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
export type AgileProviderName = 'aha' | 'jira' | 'linear' | 'github-projects' | 'azure-devops';
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
export type CrewRole = 'captain' | 'architect' | 'developer' | 'infrastructure' | 'devops' | 'security' | 'qa' | 'analyst' | 'health' | 'communications' | 'finance';
export type CrewAuthority = 'executive' | 'architectural' | 'tactical' | 'infrastructure' | 'operational' | 'security_veto' | 'quality' | 'stakeholder' | 'observability' | 'communications' | 'financial';
export interface CrewAgentProfile {
    id: string;
    name: string;
    role: CrewRole;
    specialty: string;
    responsibilities: string[];
    decisionWeight: number;
    model?: string;
    authority?: CrewAuthority;
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
    /** Crew member this memory belongs to (baseline/personal memories); null for shared lounge memories */
    crewId?: string | null;
    /** Client org that owns this memory — used for memory isolation between clients */
    clientId: string | null;
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
export type MemorySource = 'system' | 'user' | 'tool' | 'assistant';
export interface MemoryFact {
    key: string;
    value: string;
    source: MemorySource;
    confidence: number;
    evidence?: string;
}
export interface MemoryConstraint {
    key: string;
    rule: string;
    naturalLanguage: string;
    source: MemorySource;
    confidence: number;
    enforcement: 'hard' | 'soft';
    evidence?: string;
}
export interface MemoryDecision {
    id: string;
    statement: string;
    status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
    owner: 'user' | 'assistant';
    source: MemorySource;
    confidence: number;
    evidence?: string;
}
export interface MemoryQuestion {
    key: string;
    question: string;
    blocking: boolean;
    resolved: boolean;
    source: MemorySource;
    confidence: number;
    evidence?: string;
}
export interface StructuredMemoryState {
    facts: Record<string, MemoryFact>;
    constraints: Record<string, MemoryConstraint>;
    decisions: MemoryDecision[];
    openQuestions: Record<string, MemoryQuestion>;
}
export interface StreamFrameBase<TType extends string, TData> {
    v: number;
    type: TType;
    data: TData;
    ts: string;
}
export type StoryAgentFrame = StreamFrameBase<'request_ack', {
    content: string;
}> | StreamFrameBase<'plan_summary', {
    content: string;
}> | StreamFrameBase<'final_result', {
    content: string;
    tools_called?: string[];
}> | StreamFrameBase<'crew_finding', {
    crewId: string;
    summary: string;
    confidence: number;
}> | StreamFrameBase<'interrupt', {
    value: unknown;
}> | StreamFrameBase<'error', {
    message: string;
    source: string;
    type: string;
}>;
export interface StreamInvokePayload {
    prompt: string;
    resume_value?: unknown;
    last_timestamp?: string | null;
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
export type { StructuredMemoryPatch, } from './structured-memory.js';
export { SOURCE_AUTHORITY, initialStructuredMemoryState, mergeStructuredMemoryPatch, buildStructuredMemoryPatchFromDebate, summarizeStructuredMemory, } from './structured-memory.js';
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
/**
 * Real-time execution state for a story.
 * Updated incrementally as crew members complete findings.
 * Broadcast to UI clients via WebSocket.
 */
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
/**
 * Project-level view of all stories and their crew execution states.
 */
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
/**
 * WebSocket message types for real-time communication.
 */
export type WebSocketMessageType = 'subscribe' | 'unsubscribe' | 'state:initial' | 'state:updated' | 'crew:finding' | 'crew:veto' | 'error' | 'ping' | 'pong';
export interface WebSocketMessage<T = unknown> {
    type: WebSocketMessageType;
    storyRef?: string;
    projectId?: string;
    payload?: T;
    timestamp?: string;
    error?: string;
}
export type { DocKnowledgeChunk, DocRetrievalOptions, } from './db-docs.js';
export { retrieveDocKnowledge, listDocPhases, getRoleGuidance, searchDocs, } from './db-docs.js';
export { toEmbedding, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION } from './embedding.js';
export type { CrewId, SkillManifest, CanonicalPersona, ToolRecord, MissionDebrief, } from './crew-db.js';
export { getCrewSkillManifest, getAllCrewSkillManifests, getCrewSkillManifestHistory, getCrewPersona, getAllCrewPersonas, getToolRegistry, getApprovedTools, getWorfVetoedTools, getMissionDebriefs, getRecentMissionDebriefs, getCrewRosterWithStats, getStarshipStatus, } from './crew-db.js';
export type { CrewPersonalMemory } from './db.js';
export { storeCrewPersonalMemory, getCrewPersonalMemories, searchCrewPersonalMemories, searchCrewPersonalMemoriesByEmbedding, getCrewMemoriesByProject, getCrewMemoryStats, } from './db.js';
export { DOMAIN_REGISTRY, getDomainExperts, getPrimaryExpert, hasExpertise, getRelatedDomains, getCrewForTask, generateDomainOwnershipReport } from './lib/domain-registry.js';
export { CREW_EXPERTISE, getCrewExpertise, generateCrewExpertiseSummary } from './lib/crew-expertise.js';
export { routeTaskToCrew, getPrimaryCrewForTask, generateCrewBriefing, validateCrewCapability, findCoverageGaps, recommendCrewForGaps, generateDetailedCollaborationReport, inferTaskDomains } from './lib/crew-task-routing.js';
export { CREW_BASELINE_MEMORIES } from './lib/crew-baseline-memories.js';
//# sourceMappingURL=index.d.ts.map