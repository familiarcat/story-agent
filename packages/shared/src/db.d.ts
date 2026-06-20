import { type SupabaseClient } from '@supabase/supabase-js';
import { toEmbedding, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION } from './embedding.js';
import type { StoryRecord, PRComment, RevisionCycle, ProjectRecord, ObservationMemoryRecord, ObservationDebateResult, CrewMissionPlan } from './index.js';
type SupabaseMode = 'auto' | 'local' | 'live';
export { toEmbedding, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION };
export declare function flushObservationMemoryQueue(batchSize?: number): Promise<{
    synced: number;
    remaining: number;
}>;
export declare function getObservationMemorySyncDiagnostics(): Promise<{
    redisConfigured: boolean;
    redisConnected: boolean;
    workerRunning: boolean;
    queueDepth: number;
    recentCacheAllCount: number;
    lastSyncAt: string | null;
    lastSyncErrorAt: string | null;
    lastSyncError: string | null;
    totalSynced: number;
    totalFailures: number;
    syncIntervalMs: number;
    syncBatchSize: number;
}>;
export declare function getSupabaseConnectivityDiagnostics(): Promise<{
    mode: SupabaseMode;
    activeUrl: string | null;
    activeSource: 'cloud' | 'local' | null;
    url: string | null;
    configured: boolean;
    reachable: boolean;
    statusCode: number | null;
    classification: 'ok' | 'auth_failed' | 'policy_blocked' | 'endpoint_unreachable' | 'tls_trust_failed' | 'not_configured' | 'unexpected_response';
    detail: string;
    candidates: Array<{
        source: 'cloud' | 'local';
        url: string;
        reachable: boolean;
        statusCode: number | null;
        classification: 'ok' | 'auth_failed' | 'policy_blocked' | 'endpoint_unreachable' | 'tls_trust_failed' | 'unexpected_response';
        detail: string;
    }>;
}>;
export declare function startObservationMemorySyncWorker(options?: {
    intervalMs?: number;
    batchSize?: number;
}): void;
export declare function stopObservationMemorySyncWorker(): void;
/**
 * Get the initialized Supabase client.
 * Handles candidate probing, fallback, and connection caching.
 * Use this in packages that need direct table access (e.g. crew-skill-system, crew-tool-registry).
 */
export declare function getDbClient(): Promise<SupabaseClient>;
/**
 * Cloud-first Supabase client for callers that require a client and treat an
 * unreachable store as fatal (crew personal memory, documentation RAG).
 * Throws if no endpoint (cloud → local) is reachable.
 */
export declare function getSupabaseClient(): Promise<SupabaseClient>;
/** Store a transient value in Redis with a TTL. Returns false if Redis is unavailable. */
export declare function setEphemeral(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
/** Read a transient value from Redis. Returns null if missing, expired, or Redis is unavailable. */
export declare function getEphemeral<T = unknown>(key: string): Promise<T | null>;
/** Delete a transient value from Redis. Returns false if Redis is unavailable. */
export declare function deleteEphemeral(key: string): Promise<boolean>;
export declare function upsertStory(clientId: string, story: Omit<StoryRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
    clientId?: string;
}): Promise<void>;
export declare function getStory(storyId: string, clientId: string): Promise<StoryRecord | null>;
export declare function listStories(): Promise<StoryRecord[]>;
export declare function upsertPRComments(comments: PRComment[]): Promise<void>;
export declare function getCommentsForStory(storyId: string): Promise<PRComment[]>;
export declare function createRevisionCycle(cycle: Omit<RevisionCycle, 'createdAt'>): Promise<void>;
export declare function getRevisionCycles(storyId: string): Promise<RevisionCycle[]>;
export declare function upsertProject(project: ProjectRecord): Promise<void>;
export declare function listProjects(): Promise<ProjectRecord[]>;
export declare function storeObservationMemory(input: {
    storyId: string;
    /** Client org that owns this memory — isolates memories between clients */
    clientId?: string | null;
    source: ObservationMemoryRecord['source'];
    transcript: ObservationDebateResult;
    missionPlan?: CrewMissionPlan;
    missionReference?: string;
    tags?: string[];
}): Promise<ObservationMemoryRecord>;
export declare function getRecentObservationMemories(limit?: number, storyId?: string, clientId?: string | null): Promise<ObservationMemoryRecord[]>;
/**
 * Fetch baseline memory for a specific crew member
 * Used during missions for crew to reference their own principles and learnings
 */
export declare function getCrewBaselineMemory(crewId: string): Promise<ObservationMemoryRecord | null>;
/**
 * Fetch baseline memories for all crew members
 * Useful for pre-loading crew context at mission start
 */
export declare function getAllCrewBaselineMemories(): Promise<Map<string, ObservationMemoryRecord>>;
export declare function getRelevantObservationMemories(input: {
    queryText: string;
    storyId?: string;
    /** Client isolation: only return memories for this client (+ global memories) */
    clientId?: string | null;
    limit?: number;
    candidatePool?: number;
}): Promise<ObservationMemoryRecord[]>;
export interface DocumentationRecord {
    id: number;
    title: string;
    category: string;
    source_path: string;
    filename: string;
    chunk_index: number;
    chunk_count: number;
    chunk_content: string;
    tags: string[];
    similarity?: number;
    ingested_at: string;
}
export interface DocumentationCategory {
    category: string;
    count: number;
    last_updated: string;
}
/**
 * Search documentation by text query
 * Useful for finding guides and references related to crew tasks
 */
export declare function searchDocumentation(query: string, category?: string, limit?: number): Promise<DocumentationRecord[]>;
/**
 * Get documentation by category
 * Returns all documents in a specific category for browsing
 */
export declare function getDocumentationByCategory(category: string): Promise<DocumentationRecord[]>;
/**
 * Get all available documentation categories
 * Useful for building documentation navigation
 */
export declare function getDocumentationCategories(): Promise<DocumentationCategory[]>;
/**
 * Search documentation by semantic embedding
 * Useful for finding related documentation based on task description
 */
export declare function searchDocumentationByEmbedding(embeddingVector: number[], category?: string, limit?: number, similarityThreshold?: number): Promise<DocumentationRecord[]>;
/**
 * Refresh documentation materialized view
 * Call after ingesting new documentation to update indexes
 */
export declare function refreshDocumentationIndex(): Promise<boolean>;
export interface CrewPersonalMemory {
    id: number;
    crew_id: string;
    memory_type: 'insight' | 'lesson_learned' | 'decision_note' | 'reminder';
    title: string;
    content: string;
    project_id?: string;
    task_id?: string;
    tags: string[];
    created_at: string;
    is_private: boolean;
}
/**
 * Store a personal memory for a crew member
 * Used for capturing insights, lessons learned, and decision notes
 */
export declare function storeCrewPersonalMemory(input: {
    crew_id: string;
    memory_type: 'insight' | 'lesson_learned' | 'decision_note' | 'reminder';
    title: string;
    content: string;
    project_id?: string;
    task_id?: string;
    tags?: string[];
    relates_to_crew?: string[];
}): Promise<number | null>;
/**
 * Retrieve crew personal memories
 * Get all personal memories for a specific crew member
 */
export declare function getCrewPersonalMemories(crew_id: string, limit?: number, includePrivate?: boolean): Promise<CrewPersonalMemory[]>;
/**
 * Search crew personal memories by text query
 * Useful for finding past insights and lessons learned
 */
export declare function searchCrewPersonalMemories(crew_id: string, query: string, limit?: number): Promise<CrewPersonalMemory[]>;
/**
 * Search crew personal memories by semantic embedding
 * Find memories by meaning, not just keywords
 */
export declare function searchCrewPersonalMemoriesByEmbedding(crew_id: string, embeddingVector: number[], limit?: number, similarityThreshold?: number): Promise<CrewPersonalMemory[]>;
/**
 * Get crew memories for a specific project
 * Useful for reviewing what a crew member learned on a specific project
 */
export declare function getCrewMemoriesByProject(crew_id: string, project_id: string, limit?: number): Promise<CrewPersonalMemory[]>;
/**
 * Get crew memory statistics
 * Understand a crew member's learning across projects and memory types
 */
export declare function getCrewMemoryStats(crew_id: string): Promise<Array<{
    total_memories: number;
    memory_by_type: string;
    projects_count: number;
    most_recent_memory: string;
}>>;
//# sourceMappingURL=db.d.ts.map