/**
 * Crew Database Access Layer — Bridge Between MCP Server and UI
 *
 * This module exposes crew data functions that the UI layer can call
 * without importing the MCP server. All functions use shared getDbClient()
 * to access Supabase directly.
 *
 * Provides:
 * - Crew skill manifest retrieval with versioning
 * - Crew persona canonical data
 * - Tool registry queries with Worf veto tracking
 * - Mission debrief history
 * - Redis-backed fast paths
 *
 * "Each member of the crew brings their own perspective..." — Captain Picard
 */
export type CrewId = 'picard' | 'data' | 'riker' | 'geordi' | 'obrien' | 'worf' | 'yar' | 'troi' | 'crusher' | 'uhura' | 'quark';
export interface SkillManifest {
    id?: string;
    crewId: CrewId;
    version: string;
    canonicalPersonaHash: string;
    baseSystemPrompt: string;
    domainSystemPrompt: string;
    missionContextTemplate: string;
    toolUsageExamples: Array<{
        toolName: string;
        scenario: string;
        invocationExample: string;
        outcomeNotes: string;
    }>;
    selfImprovementNotes: string[];
    improvementSource: 'mission_debrief' | 'human_review' | 'peer_feedback' | 'initial_seed';
    lastImprovedAt?: string;
    createdAt?: string;
}
export interface CanonicalPersona {
    id: CrewId;
    fullName: string;
    rank: string;
    shipRole: string;
    engineeringRole: string;
    tagline: string;
    consoleName: string;
    memoryAlphaUrl: string;
    personalityTraits: string[];
    specializations: string[];
    definingMoments: string[];
    uiThemeColor: string;
    canonicalQuotes: string[];
    growthAreas: string[];
    keyRelationships: Partial<Record<CrewId, string>>;
}
export interface ToolRecord {
    name: string;
    category: string;
    capabilities: string[];
    endpoint?: string;
    sourceReference?: string;
    qualityScore: number;
    costProfile: 'free' | 'paid' | 'self-hosted';
    securityClearance: 'approved' | 'review' | 'blocked';
    status: 'proposed' | 'under_evaluation' | 'approved' | 'rejected' | 'deprecated';
    worfVeto: boolean;
    worfVetoReason?: string;
    crewVotes?: Record<CrewId, 'approve' | 'reject' | 'abstain'>;
    crewEvaluationNotes?: Record<CrewId, string>;
    uiMetadata?: {
        icon?: string;
        color?: 'gold' | 'blue' | 'red' | 'purple';
        component?: string;
    };
    lastEvaluatedAt?: string;
    createdAt?: string;
}
export interface MissionDebrief {
    missionId: string;
    crewId: CrewId;
    findings: Array<{
        finding: string;
        proposedImprovement: string;
        confidence: number;
    }>;
    approvedImprovements: string[];
    worfReviewed: boolean;
    dataValidated: boolean;
    appliedAt?: string;
    createdAt?: string;
}
export interface EpicRecord {
    id: string;
    clientId: string;
    projectId: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
}
/**
 * Get a single crew member's skill manifest by crew ID
 */
export declare function getCrewSkillManifest(crewId: CrewId, options?: {
    includeEnrichedPrompt?: boolean;
    missionContext?: string;
}): Promise<SkillManifest | null>;
/**
 * Get all crew skill manifests (current versions only)
 */
export declare function getAllCrewSkillManifests(): Promise<SkillManifest[]>;
/**
 * Get skill manifest history for a crew member (all versions)
 */
export declare function getCrewSkillManifestHistory(crewId: CrewId, limit?: number): Promise<SkillManifest[]>;
/**
 * Get canonical persona for a crew member
 */
export declare function getCrewPersona(crewId: CrewId): Promise<CanonicalPersona | null>;
/**
 * Get all crew personas
 */
export declare function getAllCrewPersonas(): Promise<CanonicalPersona[]>;
/**
 * Get complete tool registry with filters
 */
export declare function getToolRegistry(filters?: {
    status?: string;
    category?: string;
    securityClearance?: string;
}): Promise<ToolRecord[]>;
/**
 * Get approved tools only
 */
export declare function getApprovedTools(): Promise<ToolRecord[]>;
/**
 * Get tools blocked by Worf
 */
export declare function getWorfVetoedTools(): Promise<ToolRecord[]>;
/**
 * Get mission debriefs for a specific mission
 */
export declare function getMissionDebriefs(missionId: string): Promise<MissionDebrief[]>;
/**
 * Get all recent mission debriefs
 */
export declare function getRecentMissionDebriefs(limit?: number): Promise<MissionDebrief[]>;
/**
 * Get complete crew roster with skill versions and improvement counts
 */
export declare function getCrewRosterWithStats(): Promise<Array<{
    crewId: CrewId;
    fullName: string;
    rank: string;
    role: string;
    skillVersion: string;
    improvementCount: number;
    lastImprovedAt: string | null;
}>>;
/**
 * Get starship system status — comprehensive health report
 */
export declare function getStarshipStatus(): Promise<{
    crew: {
        total: number;
        roster: Awaited<ReturnType<typeof getCrewRosterWithStats>>;
    };
    skills: {
        totalManifests: number;
        averageVersion: string;
        totalImprovements: number;
    };
    tools: {
        total: number;
        approved: number;
        worfVetoed: number;
        pending: number;
    };
    missions: {
        recentDebriefs: number;
        totalDebriefs: number;
    };
}>;
/**
 * Get all epics for a specific project
 */
export declare function getEpicsForProject(projectId: string): Promise<EpicRecord[]>;
/**
 * Get stories grouped by epic to support hierarchical UI visualization
 */
export declare function getStoriesGroupedByEpic(projectId: string): Promise<any[]>;
//# sourceMappingURL=crew-db.d.ts.map