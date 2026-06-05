import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createClient as createRedisClient } from 'redis';
import { toEmbedding, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION } from './embedding.js';
import type {
  StoryRecord,
  PRComment,
  RevisionCycle,
  ProjectRecord,
  ObservationMemoryRecord,
  ObservationDebateResult,
  CrewMissionPlan,
} from './index.js';

let _client: SupabaseClient | null = null;
let _redisClient: any = null;
let _redisInitAttempted = false;
let _memorySyncTimer: NodeJS.Timeout | null = null;
let _memorySyncStats = {
  lastSyncAt: null as string | null,
  lastSyncErrorAt: null as string | null,
  lastSyncError: null as string | null,
  totalSynced: 0,
  totalFailures: 0,
};

const REDIS_RECENT_LIST_MAX = parseInt(process.env.MEMORY_REDIS_RECENT_MAX ?? '200', 10);
const REDIS_SYNC_BATCH_SIZE = parseInt(process.env.MEMORY_SYNC_BATCH_SIZE ?? '50', 10);
const REDIS_SYNC_INTERVAL_MS = parseInt(process.env.MEMORY_SYNC_INTERVAL_MS ?? '5000', 10);
const REDIS_RECENT_ALL_KEY = 'sa:memory:recent:all';
const REDIS_SYNC_QUEUE_KEY = 'sa:memory:sync_queue';

type ObservationMemoryPayload = {
  id: string;
  story_id: string;
  source: ObservationMemoryRecord['source'];
  transcript_hash: string;
  transcript_text: string;
  transcript: ObservationDebateResult;
  mission_ref: string | null;
  tags: string[];
  memory_embedding: string;
  created_at: string;
};

function db(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment.');
  _client = createSupabaseClient(url, key);
  return _client;
}

async function redis(): Promise<any> {
  if (_redisClient?.isOpen) return _redisClient;
  if (_redisInitAttempted) return null;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  _redisInitAttempted = true;
  try {
    const client = createRedisClient({ url: redisUrl });
    client.on('error', () => {
      // Keep Redis optional; fall back to Supabase-only mode on runtime issues.
    });
    await client.connect();
    _redisClient = client;
    return _redisClient;
  } catch {
    _redisClient = null;
    return null;
  }
}

function throwOnError<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result.data as T;
}

// Re-export for callers that need the utilities directly
export { toEmbedding, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION };

function hashText(text: string): string {
  return toEmbedding(text, 1).toString(); // SHA-256-based, kept for legacy compat
}

function mapObservationMemory(row: Record<string, unknown>): ObservationMemoryRecord {
  return {
    id: row.id as string,
    storyId: row.story_id as string,
    source: row.source as ObservationMemoryRecord['source'],
    transcriptHash: row.transcript_hash as string,
    transcriptText: row.transcript_text as string,
    transcript: row.transcript as ObservationDebateResult,
    missionReference: row.mission_ref as string | null,
    tags: (row.tags as string[] | null) ?? [],
    embedding: parseVector(row.memory_embedding),
    createdAt: row.created_at as string,
  };
}

function mapObservationMemoryPayload(row: ObservationMemoryPayload): ObservationMemoryRecord {
  return {
    id: row.id,
    storyId: row.story_id,
    source: row.source,
    transcriptHash: row.transcript_hash,
    transcriptText: row.transcript_text,
    transcript: row.transcript,
    missionReference: row.mission_ref,
    tags: row.tags,
    embedding: parseVector(row.memory_embedding),
    createdAt: row.created_at,
  };
}

function getStoryRecentKey(storyId: string): string {
  return `sa:memory:recent:story:${storyId}`;
}

async function cacheAndQueueObservationMemory(payload: ObservationMemoryPayload): Promise<boolean> {
  const client = await redis();
  if (!client) return false;

  const serialized = JSON.stringify(payload);
  const storyKey = getStoryRecentKey(payload.story_id);

  await client
    .multi()
    .lPush(REDIS_RECENT_ALL_KEY, serialized)
    .lTrim(REDIS_RECENT_ALL_KEY, 0, REDIS_RECENT_LIST_MAX - 1)
    .lPush(storyKey, serialized)
    .lTrim(storyKey, 0, REDIS_RECENT_LIST_MAX - 1)
    .lPush(REDIS_SYNC_QUEUE_KEY, serialized)
    .exec();

  return true;
}

async function getCachedObservationMemories(limit: number, storyId?: string): Promise<ObservationMemoryRecord[]> {
  const client = await redis();
  if (!client) return [];

  const key = storyId ? getStoryRecentKey(storyId) : REDIS_RECENT_ALL_KEY;
  const rows = await client.lRange(key, 0, Math.max(0, limit - 1));

  const parsed = rows
    .map((row: string) => {
      try {
        return mapObservationMemoryPayload(JSON.parse(row) as ObservationMemoryPayload);
      } catch {
        return null;
      }
    })
    .filter((row: ObservationMemoryRecord | null): row is ObservationMemoryRecord => row !== null);

  return parsed;
}

export async function flushObservationMemoryQueue(batchSize = REDIS_SYNC_BATCH_SIZE): Promise<{
  synced: number;
  remaining: number;
}> {
  const client = await redis();
  if (!client) {
    _memorySyncStats.totalFailures += 1;
    _memorySyncStats.lastSyncErrorAt = new Date().toISOString();
    _memorySyncStats.lastSyncError = 'Redis not available';
    return { synced: 0, remaining: 0 };
  }

  const queueItems = await client.lRange(REDIS_SYNC_QUEUE_KEY, 0, Math.max(0, batchSize - 1));
  if (queueItems.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  const payloads = queueItems
    .map((item: string) => {
      try {
        return JSON.parse(item) as ObservationMemoryPayload;
      } catch {
        return null;
      }
    })
    .filter((payload: ObservationMemoryPayload | null): payload is ObservationMemoryPayload => payload !== null);

  if (payloads.length === 0) {
    await client.lTrim(REDIS_SYNC_QUEUE_KEY, queueItems.length, -1);
    const remaining = await client.lLen(REDIS_SYNC_QUEUE_KEY);
    return { synced: 0, remaining };
  }

  throwOnError(
    await db().from('sa_observation_memories').upsert(payloads, {
      onConflict: 'transcript_hash',
    })
  );

  await client.lTrim(REDIS_SYNC_QUEUE_KEY, queueItems.length, -1);
  const remaining = await client.lLen(REDIS_SYNC_QUEUE_KEY);
  _memorySyncStats.lastSyncAt = new Date().toISOString();
  _memorySyncStats.lastSyncErrorAt = null;
  _memorySyncStats.lastSyncError = null;
  _memorySyncStats.totalSynced += payloads.length;
  return { synced: payloads.length, remaining };
}

export async function getObservationMemorySyncDiagnostics(): Promise<{
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
}> {
  const client = await redis();
  const queueDepth = client ? await client.lLen(REDIS_SYNC_QUEUE_KEY) : 0;
  const recentCacheAllCount = client ? await client.lLen(REDIS_RECENT_ALL_KEY) : 0;

  return {
    redisConfigured: Boolean(process.env.REDIS_URL),
    redisConnected: Boolean(client?.isOpen),
    workerRunning: _memorySyncTimer !== null,
    queueDepth,
    recentCacheAllCount,
    lastSyncAt: _memorySyncStats.lastSyncAt,
    lastSyncErrorAt: _memorySyncStats.lastSyncErrorAt,
    lastSyncError: _memorySyncStats.lastSyncError,
    totalSynced: _memorySyncStats.totalSynced,
    totalFailures: _memorySyncStats.totalFailures,
    syncIntervalMs: REDIS_SYNC_INTERVAL_MS,
    syncBatchSize: REDIS_SYNC_BATCH_SIZE,
  };
}

export function startObservationMemorySyncWorker(options?: {
  intervalMs?: number;
  batchSize?: number;
}): void {
  if (_memorySyncTimer) return;

  const intervalMs = options?.intervalMs ?? REDIS_SYNC_INTERVAL_MS;
  const batchSize = options?.batchSize ?? REDIS_SYNC_BATCH_SIZE;

  _memorySyncTimer = setInterval(() => {
    void flushObservationMemoryQueue(batchSize).catch(() => {
      // Queue remains intact on errors; retries happen on next interval.
    });
  }, intervalMs);
}

export function stopObservationMemorySyncWorker(): void {
  if (_memorySyncTimer) {
    clearInterval(_memorySyncTimer);
    _memorySyncTimer = null;
  }
}

// ── Stories ──────────────────────────────────────────────────────────────────

export async function upsertStory(
  story: Omit<StoryRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
): Promise<void> {
  const now = new Date().toISOString();
  throwOnError(await db().from('sa_stories').upsert({
    id:             story.id,
    story_id:       story.storyId,
    story_title:    story.storyTitle,
    story_url:      story.storyUrl,
    repo_full_name: story.repoFullName,
    branch:         story.branch,
    base_branch:    story.baseBranch,
    status:         story.status,
    pr_number:      story.prNumber,
    pr_url:         story.prUrl,
    pr_status:      story.prStatus,
    phase:          story.phase,
    created_at:     story.createdAt ?? now,
    updated_at:     now,
    notes:          story.notes,
  }, { onConflict: 'story_id' }));
}

export async function getStory(storyId: string): Promise<StoryRecord | null> {
  const { data } = await db().from('sa_stories').select('*').eq('story_id', storyId).single();
  return data ? mapStory(data) : null;
}

export async function listStories(): Promise<StoryRecord[]> {
  const rows = throwOnError(await db().from('sa_stories').select('*').order('updated_at', { ascending: false }));
  return (rows ?? []).map(mapStory);
}

function mapStory(row: Record<string, unknown>): StoryRecord {
  return {
    id:           row.id as string,
    storyId:      row.story_id as string,
    storyTitle:   row.story_title as string,
    storyUrl:     row.story_url as string,
    repoFullName: row.repo_full_name as string,
    branch:       row.branch as string,
    baseBranch:   row.base_branch as string,
    status:       row.status as StoryRecord['status'],
    prNumber:     row.pr_number as number | null,
    prUrl:        row.pr_url as string | null,
    prStatus:     row.pr_status as StoryRecord['prStatus'],
    phase:        row.phase as 1 | 2,
    createdAt:    row.created_at as string,
    updatedAt:    row.updated_at as string,
    notes:        row.notes as string | null,
  };
}

// ── PR Comments ──────────────────────────────────────────────────────────────

export async function upsertPRComments(comments: PRComment[]): Promise<void> {
  if (comments.length === 0) return;
  throwOnError(await db().from('sa_pr_comments').upsert(
    comments.map(c => ({
      id:         c.id,
      story_id:   c.storyId,
      pr_number:  c.prNumber,
      author:     c.author,
      body:       c.body,
      path:       c.path,
      line:       c.line,
      state:      c.state,
      created_at: c.createdAt,
      url:        c.url,
    })),
    { onConflict: 'id' }
  ));
}

export async function getCommentsForStory(storyId: string): Promise<PRComment[]> {
  const rows = throwOnError(
    await db().from('sa_pr_comments').select('*').eq('story_id', storyId).order('created_at', { ascending: true })
  );
  return (rows ?? []).map(r => ({
    id:        r.id as string,
    storyId:   r.story_id as string,
    prNumber:  r.pr_number as number,
    author:    r.author as string,
    body:      r.body as string,
    path:      r.path as string | null,
    line:      r.line as number | null,
    state:     r.state as PRComment['state'],
    createdAt: r.created_at as string,
    url:       r.url as string,
  }));
}

// ── Revision Cycles ──────────────────────────────────────────────────────────

export async function createRevisionCycle(cycle: Omit<RevisionCycle, 'createdAt'>): Promise<void> {
  throwOnError(await db().from('sa_revision_cycles').insert({
    id:                   cycle.id,
    story_id:             cycle.storyId,
    cycle_number:         cycle.cycleNumber,
    comments_addressed:   cycle.commentsAddressed,
    files_changed:        cycle.filesChanged,
    test_evidence:        cycle.testEvidence,
    commit_sha:           cycle.commitSha,
    completed_at:         cycle.completedAt,
    created_at:           new Date().toISOString(),
  }));
}

export async function getRevisionCycles(storyId: string): Promise<RevisionCycle[]> {
  const rows = throwOnError(
    await db().from('sa_revision_cycles').select('*').eq('story_id', storyId).order('cycle_number', { ascending: true })
  );
  return (rows ?? []).map(r => ({
    id:                 r.id as string,
    storyId:            r.story_id as string,
    cycleNumber:        r.cycle_number as number,
    commentsAddressed:  r.comments_addressed as string[],
    filesChanged:       r.files_changed as string[],
    testEvidence:       r.test_evidence as string,
    commitSha:          r.commit_sha as string | null,
    completedAt:        r.completed_at as string | null,
    createdAt:          r.created_at as string,
  }));
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function upsertProject(project: ProjectRecord): Promise<void> {
  throwOnError(await db().from('sa_projects').upsert({
    id:              project.id,
    name:            project.name,
    repo_full_name:  project.repoFullName,
    aha_project_id:  project.ahaProjectId,
    created_at:      project.createdAt ?? new Date().toISOString(),
  }, { onConflict: 'repo_full_name' }));
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const rows = throwOnError(await db().from('sa_projects').select('*').order('name', { ascending: true }));
  return (rows ?? []).map(r => ({
    id:            r.id as string,
    name:          r.name as string,
    repoFullName:  r.repo_full_name as string,
    ahaProjectId:  r.aha_project_id as string | null,
    createdAt:     r.created_at as string,
  }));
}

// ── Observation Lounge Memory (Vector Store) ────────────────────────────────

export async function storeObservationMemory(input: {
  storyId: string;
  source: ObservationMemoryRecord['source'];
  transcript: ObservationDebateResult;
  missionPlan?: CrewMissionPlan;
  missionReference?: string;
  tags?: string[];
}): Promise<ObservationMemoryRecord> {
  const transcriptText = JSON.stringify(input.transcript);
  const transcriptHash = hashText(`${input.storyId}:${transcriptText}`);
  const embedding = toEmbedding(transcriptText);

  const payload: ObservationMemoryPayload = {
    id: randomUUID(),
    story_id: input.storyId,
    source: input.source,
    transcript_hash: transcriptHash,
    transcript_text: transcriptText,
    transcript: input.transcript,
    mission_ref: input.missionReference ?? input.missionPlan?.story.referenceNum ?? null,
    tags: input.tags ?? [],
    memory_embedding: toPgVector(embedding),
    created_at: new Date().toISOString(),
  };

  // Redis-first: fast local/session memory plus queued durable sync.
  try {
    startObservationMemorySyncWorker();
    const queued = await cacheAndQueueObservationMemory(payload);
    if (queued) {
      void flushObservationMemoryQueue();
      return mapObservationMemoryPayload(payload);
    }
  } catch {
    // Fall through to direct Supabase persistence.
  }

  const rows = throwOnError(await db().from('sa_observation_memories').upsert(payload, {
    onConflict: 'transcript_hash',
  }).select('*').limit(1));

  const row = Array.isArray(rows) ? rows[0] : rows;
  return mapObservationMemory((row as Record<string, unknown>) ?? payload);
}

export async function getRecentObservationMemories(limit = 8, storyId?: string): Promise<ObservationMemoryRecord[]> {
  const cached = await getCachedObservationMemories(limit, storyId);
  if (cached.length >= limit) {
    return cached.slice(0, limit);
  }

  let query = db().from('sa_observation_memories').select('*').order('created_at', { ascending: false }).limit(limit);
  if (storyId) {
    query = query.eq('story_id', storyId);
  }
  const rows = throwOnError(await query);

  const merged = [...cached, ...(rows ?? []).map(row => mapObservationMemory(row as Record<string, unknown>))];
  const deduped = Array.from(new Map(merged.map(memory => [memory.transcriptHash, memory])).values());
  return deduped.slice(0, limit);
}

export async function getRelevantObservationMemories(input: {
  queryText: string;
  storyId?: string;
  limit?: number;
  candidatePool?: number;
}): Promise<ObservationMemoryRecord[]> {
  const { queryText, storyId, limit = 5, candidatePool = 40 } = input;
  const candidates = await getRecentObservationMemories(candidatePool, storyId);
  const queryEmbedding = toEmbedding(queryText);

  return candidates
    .map(memory => ({
      ...memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, limit);
}
