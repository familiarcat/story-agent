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
let _clientPromise: Promise<SupabaseClient> | null = null;
let _redisClient: any = null;
let _redisInitAttempted = false;
let _memorySyncTimer: NodeJS.Timeout | null = null;
let _activeSupabaseConfig: {
  source: 'primary' | 'fallback';
  url: string;
  mode: 'auto' | 'local' | 'live';
} | null = null;
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
const REDACTED_VALUE = '[REDACTED_BY_WORFGATE]';

const DEFAULT_CONTROLLED_MARKERS = [
  'bayer',
  'confidential',
  'internal use only',
  'regulated',
  'customer data',
  'patient',
  'phi',
  'pii',
  'secret',
  'proprietary',
];

type ObservationMemoryPayload = {
  id: string;
  story_id: string;
  client_id: string | null;
  source: ObservationMemoryRecord['source'];
  transcript_hash: string;
  transcript_text: string;
  transcript: ObservationDebateResult;
  mission_ref: string | null;
  tags: string[];
  memory_embedding: string;
  created_at: string;
};

type SupabaseMode = 'auto' | 'local' | 'live';

type SupabaseCandidate = {
  source: 'primary' | 'fallback';
  url: string;
  key: string;
};

function getSupabaseMode(): SupabaseMode {
  const mode = (process.env.SUPABASE_MODE ?? 'auto').trim().toLowerCase();
  if (mode === 'local' || mode === 'live') return mode;
  return 'auto';
}

function getFallbackSupabaseUrl(): string {
  return (process.env.SUPABASE_FALLBACK_URL ?? process.env.SUPABASE_LIVE_URL ?? '').trim();
}

function getFallbackSupabaseKey(): string {
  return (
    process.env.SUPABASE_FALLBACK_KEY ??
    process.env.SUPABASE_LIVE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''
  ).trim();
}

function isLocalSupabaseUrl(url: string): boolean {
  return /(^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?)/i.test(url);
}

function getSupabaseCandidates(): {
  mode: SupabaseMode;
  candidates: SupabaseCandidate[];
} {
  const mode = getSupabaseMode();
  const primaryUrl = process.env.SUPABASE_URL?.trim() ?? '';
  const primaryKey = process.env.SUPABASE_KEY?.trim() ?? '';
  const fallbackUrl = getFallbackSupabaseUrl();
  const fallbackKey = getFallbackSupabaseKey();

  const primary = primaryUrl && primaryKey
    ? [{ source: 'primary' as const, url: primaryUrl, key: primaryKey }]
    : [];
  const fallback = fallbackUrl && fallbackKey
    ? [{ source: 'fallback' as const, url: fallbackUrl, key: fallbackKey }]
    : [];

  if (mode === 'live') {
    return { mode, candidates: [...fallback, ...primary] };
  }

  return { mode, candidates: [...primary, ...fallback] };
}

async function probeSupabaseCandidate(candidate: SupabaseCandidate): Promise<{
  reachable: boolean;
  statusCode: number | null;
  classification: 'ok' | 'auth_failed' | 'policy_blocked' | 'endpoint_unreachable' | 'tls_trust_failed' | 'unexpected_response';
  detail: string;
}> {
  const endpoint = `${candidate.url.replace(/\/$/, '')}/rest/v1/`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: candidate.key,
        Authorization: `Bearer ${candidate.key}`,
        Accept: 'application/json',
      },
    });
    const responseText = await response.text();

    if (response.ok) {
      return {
        reachable: true,
        statusCode: response.status,
        classification: 'ok',
        detail: responseText.slice(0, 500) || 'Supabase REST endpoint reachable.',
      };
    }

    const lower = responseText.toLowerCase();
    return {
      reachable: false,
      statusCode: response.status,
      classification: response.status === 401
        ? 'auth_failed'
        : lower.includes('deny') || lower.includes('skyhigh')
          ? 'policy_blocked'
          : 'unexpected_response',
      detail: responseText.slice(0, 500) || `HTTP ${response.status}`,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const lower = detail.toLowerCase();
    return {
      reachable: false,
      statusCode: null,
      classification: lower.includes('certificate signed by unknown authority') || lower.includes('self-signed certificate')
        ? 'tls_trust_failed'
        : lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('fetch failed') || lower.includes('timed out')
          ? 'endpoint_unreachable'
          : 'unexpected_response',
      detail,
    };
  }
}

async function db(): Promise<SupabaseClient> {
  if (_client) return _client;
  if (_clientPromise) return _clientPromise;

  _clientPromise = (async () => {
    const { mode, candidates } = getSupabaseCandidates();
    if (candidates.length === 0) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment.');
    }

    const diagnostics: string[] = [];
    for (const candidate of candidates) {
      const probe = await probeSupabaseCandidate(candidate);
      diagnostics.push(`${candidate.source}:${candidate.url} => ${probe.classification}${probe.statusCode ? `(${probe.statusCode})` : ''}`);

      if (probe.reachable) {
        _activeSupabaseConfig = {
          source: candidate.source,
          url: candidate.url,
          mode,
        };
        _client = createSupabaseClient(candidate.url, candidate.key);
        return _client;
      }

      if (mode === 'local' && !isLocalSupabaseUrl(candidate.url)) {
        break;
      }
    }

    _clientPromise = null;
    throw new Error(`No reachable Supabase endpoint. ${diagnostics.join(' | ')}`);
  })();

  return _clientPromise;
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

function worfGateEnabled(): boolean {
  return (process.env.WORFGATE_ENFORCE ?? 'true').toLowerCase() === 'true';
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function getControlledMarkers(): string[] {
  const custom = parseCsv(process.env.WORFGATE_CONTROLLED_MARKERS);
  return custom.length > 0 ? custom : DEFAULT_CONTROLLED_MARKERS;
}

function redactStringWithMarkers(input: string, markers: string[]): { value: string; redacted: boolean } {
  let output = input;
  let redacted = false;
  for (const marker of markers) {
    if (!marker) continue;
    const pattern = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (pattern.test(output)) {
      redacted = true;
      output = output.replace(pattern, REDACTED_VALUE);
    }
  }
  return { value: output, redacted };
}

function redactValueDeep(value: unknown, markers: string[]): { value: unknown; redacted: boolean } {
  if (typeof value === 'string') {
    return redactStringWithMarkers(value, markers);
  }
  if (Array.isArray(value)) {
    let redacted = false;
    const mapped = value.map(entry => {
      const next = redactValueDeep(entry, markers);
      redacted = redacted || next.redacted;
      return next.value;
    });
    return { value: mapped, redacted };
  }
  if (value && typeof value === 'object') {
    let redacted = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = redactValueDeep(v, markers);
      redacted = redacted || next.redacted;
      out[k] = next.value;
    }
    return { value: out, redacted };
  }
  return { value, redacted: false };
}

function applyWorfGateMemoryRedaction(input: {
  transcript: ObservationDebateResult;
  tags?: string[];
}): { transcript: ObservationDebateResult; tags: string[]; redacted: boolean } {
  const tags = [...(input.tags ?? [])];
  if (!worfGateEnabled()) {
    return { transcript: input.transcript, tags, redacted: false };
  }

  const markers = getControlledMarkers();
  const redacted = redactValueDeep(input.transcript, markers);
  const wasRedacted = redacted.redacted;

  if (wasRedacted) {
    if (!tags.includes('worfgate_redacted')) {
      tags.push('worfgate_redacted');
    }
    process.stderr.write('[WORFGATE] REDACT memory transcript prior to persistence\n');
  }

  return {
    transcript: redacted.value as ObservationDebateResult,
    tags,
    redacted: wasRedacted,
  };
}

function mapObservationMemory(row: Record<string, unknown>): ObservationMemoryRecord {
  return {
    id: row.id as string,
    storyId: row.story_id as string,
    clientId: (row.client_id as string | null) ?? null,
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
    clientId: row.client_id ?? null,
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
    await (await db()).from('sa_observation_memories').upsert(payloads, {
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

export async function getSupabaseConnectivityDiagnostics(): Promise<{
  mode: SupabaseMode;
  activeUrl: string | null;
  activeSource: 'primary' | 'fallback' | null;
  url: string | null;
  configured: boolean;
  reachable: boolean;
  statusCode: number | null;
  classification: 'ok' | 'auth_failed' | 'policy_blocked' | 'endpoint_unreachable' | 'tls_trust_failed' | 'not_configured' | 'unexpected_response';
  detail: string;
  candidates: Array<{
    source: 'primary' | 'fallback';
    url: string;
    reachable: boolean;
    statusCode: number | null;
    classification: 'ok' | 'auth_failed' | 'policy_blocked' | 'endpoint_unreachable' | 'tls_trust_failed' | 'unexpected_response';
    detail: string;
  }>;
}> {
  const { mode, candidates } = getSupabaseCandidates();

  if (candidates.length === 0) {
    return {
      mode,
      activeUrl: _activeSupabaseConfig?.url ?? null,
      activeSource: _activeSupabaseConfig?.source ?? null,
      url: null,
      configured: false,
      reachable: false,
      statusCode: null,
      classification: 'not_configured',
      detail: 'SUPABASE_URL and SUPABASE_KEY must both be configured.',
      candidates: [],
    };
  }

  const candidateResults = await Promise.all(
    candidates.map(async candidate => ({
      source: candidate.source,
      url: candidate.url,
      ...(await probeSupabaseCandidate(candidate)),
    }))
  );
  const selected = candidateResults.find(result => result.reachable) ?? candidateResults[0];

  return {
    mode,
    activeUrl: _activeSupabaseConfig?.url ?? (selected?.reachable ? selected.url : null),
    activeSource: _activeSupabaseConfig?.source ?? (selected?.reachable ? selected.source : null),
    url: selected?.url ?? null,
    configured: true,
    reachable: selected?.reachable ?? false,
    statusCode: selected?.statusCode ?? null,
    classification: selected?.classification ?? 'unexpected_response',
    detail: selected?.detail ?? 'No Supabase candidate could be evaluated.',
    candidates: candidateResults,
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

/**
 * Get the initialized Supabase client.
 * Handles candidate probing, fallback, and connection caching.
 * Use this in packages that need direct table access (e.g. crew-skill-system, crew-tool-registry).
 */
export async function getDbClient(): Promise<SupabaseClient> {
  return db();
}


export async function upsertStory(
  story: Omit<StoryRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
): Promise<void> {
  const now = new Date().toISOString();
  throwOnError(await (await db()).from('sa_stories').upsert({
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
  const { data } = await (await db()).from('sa_stories').select('*').eq('story_id', storyId).single();
  return data ? mapStory(data) : null;
}

export async function listStories(): Promise<StoryRecord[]> {
  const rows = throwOnError(await (await db()).from('sa_stories').select('*').order('updated_at', { ascending: false }));
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
  throwOnError(await (await db()).from('sa_pr_comments').upsert(
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
    await (await db()).from('sa_pr_comments').select('*').eq('story_id', storyId).order('created_at', { ascending: true })
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
  throwOnError(await (await db()).from('sa_revision_cycles').insert({
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
    await (await db()).from('sa_revision_cycles').select('*').eq('story_id', storyId).order('cycle_number', { ascending: true })
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
  throwOnError(await (await db()).from('sa_projects').upsert({
    id:              project.id,
    name:            project.name,
    repo_full_name:  project.repoFullName,
    aha_project_id:  project.ahaProjectId,
    created_at:      project.createdAt ?? new Date().toISOString(),
  }, { onConflict: 'repo_full_name' }));
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const rows = throwOnError(await (await db()).from('sa_projects').select('*').order('name', { ascending: true }));
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
  /** Client org that owns this memory — isolates memories between clients */
  clientId?: string | null;
  source: ObservationMemoryRecord['source'];
  transcript: ObservationDebateResult;
  missionPlan?: CrewMissionPlan;
  missionReference?: string;
  tags?: string[];
}): Promise<ObservationMemoryRecord> {
  const worfGate = applyWorfGateMemoryRedaction({
    transcript: input.transcript,
    tags: input.tags,
  });

  const transcriptText = JSON.stringify(worfGate.transcript);
  // Include clientId in hash to prevent cross-client hash collisions
  const transcriptHash = hashText(`${input.clientId ?? 'global'}:${input.storyId}:${transcriptText}`);
  const embedding = toEmbedding(transcriptText);

  const payload: ObservationMemoryPayload = {
    id: randomUUID(),
    story_id: input.storyId,
    client_id: input.clientId ?? null,
    source: input.source,
    transcript_hash: transcriptHash,
    transcript_text: transcriptText,
    transcript: worfGate.transcript,
    mission_ref: input.missionReference ?? input.missionPlan?.story.referenceNum ?? null,
    tags: worfGate.tags,
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

  const rows = throwOnError(await (await db()).from('sa_observation_memories').upsert(payload, {
    onConflict: 'transcript_hash',
  }).select('*').limit(1));

  const row = Array.isArray(rows) ? rows[0] : rows;
  return mapObservationMemory((row as Record<string, unknown>) ?? payload);
}

export async function getRecentObservationMemories(
  limit = 8,
  storyId?: string,
  clientId?: string | null,
): Promise<ObservationMemoryRecord[]> {
  const cached = await getCachedObservationMemories(limit, storyId);
  // Filter cached results by clientId if provided
  const filteredCache = clientId
    ? cached.filter(m => m.clientId === clientId)
    : cached;
  if (filteredCache.length >= limit) {
    return filteredCache.slice(0, limit);
  }

  let query = (await db()).from('sa_observation_memories').select('*').order('created_at', { ascending: false }).limit(limit);
  if (storyId) {
    query = query.eq('story_id', storyId);
  }
  // Client isolation: if clientId provided, only return that client's memories.
  // null clientId = legacy/global memories accessible to all clients.
  if (clientId) {
    query = query.or(`client_id.eq.${clientId},client_id.is.null`);
  }
  const rows = throwOnError(await query);

  const merged = [...filteredCache, ...(rows ?? []).map(row => mapObservationMemory(row as Record<string, unknown>))];
  const deduped = Array.from(new Map(merged.map(memory => [memory.transcriptHash, memory])).values());
  return deduped.slice(0, limit);
}

/**
 * Fetch baseline memory for a specific crew member
 * Used during missions for crew to reference their own principles and learnings
 */
export async function getCrewBaselineMemory(crewId: string): Promise<ObservationMemoryRecord | null> {
  const client = await getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('sa_observation_memories')
      .select('*')
      .eq('crew_id', crewId)
      .eq('story_id', `crew-baseline-${crewId}`)
      .is('client_id', null) // Baseline memories are global (null client_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error(`Error fetching crew baseline memory for ${crewId}:`, error);
      return null;
    }

    return mapObservationMemory(data);
  } catch (error) {
    console.error(`Exception fetching crew baseline memory for ${crewId}:`, error);
    return null;
  }
}

/**
 * Fetch baseline memories for all crew members
 * Useful for pre-loading crew context at mission start
 */
export async function getAllCrewBaselineMemories(): Promise<Map<string, ObservationMemoryRecord>> {
  const client = await getClient();
  if (!client) return new Map();

  try {
    const { data, error } = await client
      .from('sa_observation_memories')
      .select('*')
      .like('story_id', 'crew-baseline-%')
      .is('client_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all crew baseline memories:', error);
      return new Map();
    }

    const memories = new Map<string, ObservationMemoryRecord>();
    for (const record of data || []) {
      const mapped = mapObservationMemory(record);
      if (mapped.crewId) {
        memories.set(mapped.crewId, mapped);
      }
    }
    return memories;
  } catch (error) {
    console.error('Exception fetching all crew baseline memories:', error);
    return new Map();
  }
}

export async function getRelevantObservationMemories(input: {
  queryText: string;
  storyId?: string;
  /** Client isolation: only return memories for this client (+ global memories) */
  clientId?: string | null;
  limit?: number;
  candidatePool?: number;
}): Promise<ObservationMemoryRecord[]> {
  const { queryText, storyId, clientId, limit = 5, candidatePool = 40 } = input;
  const candidates = await getRecentObservationMemories(candidatePool, storyId, clientId);
  const queryEmbedding = toEmbedding(queryText);

  return candidates
    .map(memory => ({
      ...memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Documentation RAG Functions — Crew Access to Searchable Documentation
// ─────────────────────────────────────────────────────────────────────────────

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
export async function searchDocumentation(
  query: string,
  category?: string,
  limit: number = 10
): Promise<DocumentationRecord[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('search_documentation_by_text', {
    search_query: query,
    category_filter: category || null,
    max_results: limit,
  });

  if (error) {
    console.error('Error searching documentation:', error);
    return [];
  }

  return data || [];
}

/**
 * Get documentation by category
 * Returns all documents in a specific category for browsing
 */
export async function getDocumentationByCategory(
  category: string
): Promise<DocumentationRecord[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('get_documentation_by_category', {
    category_name: category,
  });

  if (error) {
    console.error(`Error getting documentation for category ${category}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Get all available documentation categories
 * Useful for building documentation navigation
 */
export async function getDocumentationCategories(): Promise<DocumentationCategory[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('get_documentation_categories');

  if (error) {
    console.error('Error getting documentation categories:', error);
    return [];
  }

  return data || [];
}

/**
 * Search documentation by semantic embedding
 * Useful for finding related documentation based on task description
 */
export async function searchDocumentationByEmbedding(
  embeddingVector: number[],
  category?: string,
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<DocumentationRecord[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('search_documentation_by_embedding', {
    embedding_vector: embeddingVector,
    category_filter: category || null,
    max_results: limit,
    similarity_threshold: similarityThreshold,
  });

  if (error) {
    console.error('Error searching documentation by embedding:', error);
    return [];
  }

  return data || [];
}

/**
 * Refresh documentation materialized view
 * Call after ingesting new documentation to update indexes
 */
export async function refreshDocumentationIndex(): Promise<boolean> {
  const client = await getSupabaseClient();

  const { error } = await client.rpc('refresh_materialized_view', {
    view_name: 'mv_documentation_index',
  });

  if (error) {
    console.error('Error refreshing documentation index:', error);
    return false;
  }

  return true;
}
