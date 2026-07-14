import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createClient as createRedisClient } from 'redis';
import { toEmbedding, embed, embeddingSource, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION } from './embedding.js';
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
  source: 'cloud' | 'local';
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
  'client',
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
  outcome?: 'pending' | 'success' | 'partial' | 'failed' | null;
  outcome_notes?: string | null;
  execution_completed_at?: string | null;
};

type SupabaseMode = 'auto' | 'local' | 'live';

type SupabaseCandidate = {
  /** Classified by URL: 'cloud' = remote RAG store, 'local' = on-box Supabase. */
  source: 'cloud' | 'local';
  url: string;
  key: string;
};

function getSupabaseMode(): SupabaseMode {
  const mode = (process.env.SUPABASE_MODE ?? 'auto').trim().toLowerCase();
  if (mode === 'local' || mode === 'live') return mode;
  return 'auto';
}

/** Explicit cloud (remote RAG) endpoint. Newer SUPABASE_CLOUD_* wins; LIVE/FALLBACK kept for back-compat. */
function getCloudSupabaseUrl(): string {
  return (
    process.env.SUPABASE_CLOUD_URL ??
    process.env.SUPABASE_LIVE_URL ??
    process.env.SUPABASE_FALLBACK_URL ??
    ''
  ).trim();
}

function getCloudSupabaseKey(): string {
  return (
    process.env.SUPABASE_CLOUD_KEY ??
    process.env.SUPABASE_LIVE_KEY ??
    process.env.SUPABASE_FALLBACK_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''
  ).trim();
}

function isLocalSupabaseUrl(url: string): boolean {
  return /(^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?)/i.test(url);
}

/**
 * Gather every configured Supabase endpoint, de-duplicated by URL and classified
 * cloud vs local. Sources, in declaration order:
 *  - explicit cloud (SUPABASE_CLOUD_URL / LIVE / FALLBACK)
 *  - the legacy primary (SUPABASE_URL) — classified by its own URL
 *  - explicit local (SUPABASE_LOCAL_URL)
 */
function getConfiguredCandidates(): SupabaseCandidate[] {
  const raw: Array<{ url: string; key: string }> = [];

  const cloudUrl = getCloudSupabaseUrl();
  const cloudKey = getCloudSupabaseKey();
  if (cloudUrl && cloudKey) raw.push({ url: cloudUrl, key: cloudKey });

  const primaryUrl = (process.env.SUPABASE_URL ?? '').trim();
  const primaryKey = (process.env.SUPABASE_KEY ?? '').trim();
  if (primaryUrl && primaryKey) raw.push({ url: primaryUrl, key: primaryKey });

  const localUrl = (process.env.SUPABASE_LOCAL_URL ?? '').trim();
  const localKey = (process.env.SUPABASE_LOCAL_KEY ?? process.env.SUPABASE_KEY ?? '').trim();
  if (localUrl && localKey) raw.push({ url: localUrl, key: localKey });

  const seen = new Set<string>();
  const candidates: SupabaseCandidate[] = [];
  for (const entry of raw) {
    const normalized = entry.url.replace(/\/$/, '').toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push({
      source: isLocalSupabaseUrl(entry.url) ? 'local' : 'cloud',
      url: entry.url,
      key: entry.key,
    });
  }
  return candidates;
}

/**
 * Resolve the ordered candidate list for the active mode.
 *  - auto  (default): cloud first, local as automatic fallback when cloud is unreachable.
 *  - live  : cloud only — never silently drop to local (use in production / CI).
 *  - local : local only — for offline development.
 */
function getSupabaseCandidates(): {
  mode: SupabaseMode;
  candidates: SupabaseCandidate[];
} {
  const mode = getSupabaseMode();
  const all = getConfiguredCandidates();
  const cloud = all.filter(c => c.source === 'cloud');
  const local = all.filter(c => c.source === 'local');

  if (mode === 'live') {
    return { mode, candidates: cloud };
  }
  if (mode === 'local') {
    return { mode, candidates: local.length > 0 ? local : all };
  }
  // auto: always attempt cloud first, resort to local only if no cloud is reachable.
  return { mode, candidates: [...cloud, ...local] };
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

/** Public accessor for the optional shared Redis client (null when REDIS_URL is unset/unreachable). */
export async function getRedis(): Promise<any | null> {
  return redis();
}

function throwOnError<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result.data as T;
}

// Re-export for callers that need the utilities directly
export { toEmbedding, embed, embeddingSource, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION };

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
    crewId: (row.crew_id as string | null) ?? null,
    clientId: (row.client_id as string | null) ?? null,
    source: row.source as ObservationMemoryRecord['source'],
    transcriptHash: row.transcript_hash as string,
    transcriptText: row.transcript_text as string,
    transcript: row.transcript as ObservationDebateResult,
    missionReference: row.mission_ref as string | null,
    tags: (row.tags as string[] | null) ?? [],
    embedding: parseVector(row.memory_embedding),
    createdAt: row.created_at as string,
    outcome: (row.outcome as 'pending' | 'success' | 'partial' | 'failed' | null) ?? null,
    outcomeNotes: (row.outcome_notes as string | null) ?? null,
    executionCompletedAt: (row.execution_completed_at as string | null) ?? null,
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
    outcome: row.outcome ?? null,
    outcomeNotes: row.outcome_notes ?? null,
    executionCompletedAt: row.execution_completed_at ?? null,
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

  // Dedupe by transcript_hash within the batch: a single Postgres ON CONFLICT command cannot update
  // the same target row twice (error 21000), and the queue can accumulate repeats of the same memory.
  // Keep the last occurrence per hash; the queue still drains all processed entries below.
  const byHash = new Map<string, ObservationMemoryPayload>();
  for (const p of payloads) byHash.set(p.transcript_hash, p);
  const uniquePayloads = [...byHash.values()];

  // Upsert the batch; on failure (e.g. a poison row — FK violation on client_id, malformed data)
  // fall back to per-row so a single bad memory can't block the whole queue forever. Poison rows are
  // counted + skipped (they'd fail on every retry); good rows still sync and the queue drains.
  const dbc = await db();
  let synced = 0;
  let skipped = 0;
  const batch = await dbc.from('sa_observation_memories').upsert(uniquePayloads, { onConflict: 'transcript_hash' });
  if (!batch.error) {
    synced = uniquePayloads.length;
  } else {
    for (const p of uniquePayloads) {
      const one = await dbc.from('sa_observation_memories').upsert(p, { onConflict: 'transcript_hash' });
      if (one.error) skipped += 1;
      else synced += 1;
    }
  }

  await client.lTrim(REDIS_SYNC_QUEUE_KEY, queueItems.length, -1);
  const remaining = await client.lLen(REDIS_SYNC_QUEUE_KEY);
  _memorySyncStats.totalSynced += synced;
  if (skipped > 0) {
    _memorySyncStats.totalFailures += skipped;
    _memorySyncStats.lastSyncErrorAt = new Date().toISOString();
    _memorySyncStats.lastSyncError = `${skipped} row(s) skipped (constraint violation)`;
  } else {
    _memorySyncStats.lastSyncAt = new Date().toISOString();
    _memorySyncStats.lastSyncErrorAt = null;
    _memorySyncStats.lastSyncError = null;
  }
  return { synced, remaining };
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
    void flushObservationMemoryQueue(batchSize).catch((e) => {
        _memorySyncStats.lastSyncError = e instanceof Error ? e.message : String(e);
        _memorySyncStats.lastSyncErrorAt = new Date().toISOString();
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

/**
 * Cloud-first Supabase client for callers that require a client and treat an
 * unreachable store as fatal (crew personal memory, documentation RAG).
 * Throws if no endpoint (cloud → local) is reachable.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  return db();
}

/**
 * Cloud-first Supabase client for optional paths that prefer to degrade
 * gracefully (e.g. baseline-memory preload). Returns null instead of throwing.
 */
async function getClient(): Promise<SupabaseClient | null> {
  try {
    return await db();
  } catch {
    return null;
  }
}

// ── Ephemeral Redis lane (transient, never synced to Supabase / RAG) ─────────
// Use for quick local memory transactions that do NOT need durable storage and
// must NOT influence the crew's RAG decision-making. Keys auto-expire (TTL).
// Durable, RAG-eligible memory must go through storeObservationMemory / the
// crew memory functions, which persist to the cloud (remote) Supabase.

const EPHEMERAL_PREFIX = 'sa:ephemeral:';
const EPHEMERAL_DEFAULT_TTL_SECONDS = parseInt(process.env.MEMORY_EPHEMERAL_TTL_SECONDS ?? '3600', 10);

/** Store a transient value in Redis with a TTL. Returns false if Redis is unavailable. */
export async function setEphemeral(key: string, value: unknown, ttlSeconds = EPHEMERAL_DEFAULT_TTL_SECONDS): Promise<boolean> {
  const client = await redis();
  if (!client) return false;
  await client.set(`${EPHEMERAL_PREFIX}${key}`, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) });
  return true;
}

/** Read a transient value from Redis. Returns null if missing, expired, or Redis is unavailable. */
export async function getEphemeral<T = unknown>(key: string): Promise<T | null> {
  const client = await redis();
  if (!client) return null;
  const raw = await client.get(`${EPHEMERAL_PREFIX}${key}`);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Delete a transient value from Redis. Returns false if Redis is unavailable. */
export async function deleteEphemeral(key: string): Promise<boolean> {
  const client = await redis();
  if (!client) return false;
  await client.del(`${EPHEMERAL_PREFIX}${key}`);
  return true;
}


export async function upsertStory(
  clientId: string,
  story: Omit<StoryRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string, clientId?: string }
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
    project_id:     story.projectId,
    epic_id:        story.epicId,
    acceptance_criteria: story.acceptanceCriteria,
    created_at:     story.createdAt ?? now,
    updated_at:     now,
    notes:          story.notes,
    client_id:      clientId,
  }, { onConflict: 'id' }));
}

export async function getStory(storyId: string, clientId: string): Promise<StoryRecord | null> {
  const { data } = await (await db()).from('sa_stories').select('*').eq('story_id', storyId).eq('client_id', clientId).maybeSingle();
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
    projectId:     row.project_id as string | null,
    epicId:        row.epic_id as string | null,
    acceptanceCriteria: row.acceptance_criteria as string,
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
  const embedding = await embed(transcriptText);

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

/** Record the outcome of a crew deliberation after execution. Allows crew to learn from successes/failures. */
export async function recordObservationMemoryOutcome(input: {
  memoryId: string;
  outcome: 'success' | 'partial' | 'failed';
  outcomeNotes?: string;
}): Promise<ObservationMemoryRecord | null> {
  const rows = throwOnError(await (await db())
    .from('sa_observation_memories')
    .update({
      outcome: input.outcome,
      outcome_notes: input.outcomeNotes ?? null,
      execution_completed_at: new Date().toISOString(),
    })
    .eq('id', input.memoryId)
    .select('*')
    .limit(1));

  const row = Array.isArray(rows) ? rows[0] : rows;
  return row ? mapObservationMemory((row as Record<string, unknown>)) : null;
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
  const queryEmbedding = await embed(queryText);

  return candidates
    .map(memory => ({
      ...memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, limit);
}

/** Format an observation memory for crew display, highlighting outcome if available. */
export function formatMemoryForCrewDisplay(memory: ObservationMemoryRecord): string {
  const lines: string[] = [];

  // Add outcome banner if available
  if (memory.outcome && memory.outcome !== 'pending') {
    const emoji = memory.outcome === 'success' ? '✅' : memory.outcome === 'partial' ? '⚠️' : '❌';
    const label = memory.outcome === 'success' ? 'SUCCESS' : memory.outcome === 'partial' ? 'PARTIAL' : 'FAILED';
    lines.push(`${emoji} PAST OUTCOME: ${label} (${memory.executionCompletedAt ? new Date(memory.executionCompletedAt).toLocaleDateString() : 'date unknown'})`);
    if (memory.outcomeNotes) {
      lines.push(`   Lesson: ${memory.outcomeNotes}`);
    }
    lines.push('');
  }

  // Add transcript content
  const transcript = memory.transcript;
  if (transcript.consensusSummary) {
    lines.push(`CONSENSUS: ${transcript.consensusSummary}`);
    lines.push('');
  }

  if (transcript.unresolvedRisks?.length) {
    lines.push('RISKS:');
    transcript.unresolvedRisks.forEach(risk => lines.push(`  • ${risk}`));
    lines.push('');
  }

  if (transcript.actionItems?.length) {
    lines.push('ACTIONS:');
    transcript.actionItems.forEach(item => lines.push(`  • ${item}`));
  }

  return lines.join('\n');
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
 * Upsert one documentation chunk into sa_documentation — the corpus searchDocumentation reads, so the
 * crew can access the docs as a "contemplative basis" during decisions. Idempotent on
 * (source_path, chunk_index), so re-ingesting updates in place. Embedding is omitted: the
 * search_documentation_by_text RPC is ILIKE-based (searchable without it); semantic 1536-dim
 * embeddings are a future add (the shared embed() is 64-dim, so a column/embedding change is needed).
 */
export async function storeDocumentationChunk(rec: {
  title: string; category: string; sourcePath: string; filename: string;
  chunkIndex: number; chunkCount: number; content: string; contentHash?: string; tags?: string[];
}): Promise<void> {
  const client = await getSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await client.from('sa_documentation').upsert({
    title: rec.title, category: rec.category, source_path: rec.sourcePath, filename: rec.filename,
    chunk_index: rec.chunkIndex, chunk_count: rec.chunkCount, chunk_content: rec.content,
    content_hash: rec.contentHash ?? null, tags: rec.tags ?? [], is_searchable: true,
    ingested_at: now, updated_at: now,
  }, { onConflict: 'source_path,chunk_index' });
  if (error) throw new Error('storeDocumentationChunk: ' + error.message);
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

// ─────────────────────────────────────────────────────────────────────────────
// Crew Personal Memory Functions — Individual Crew Member Knowledge Storage
// ─────────────────────────────────────────────────────────────────────────────

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
export async function storeCrewPersonalMemory(input: {
  crew_id: string;
  memory_type: 'insight' | 'lesson_learned' | 'decision_note' | 'reminder';
  title: string;
  content: string;
  project_id?: string;
  task_id?: string;
  tags?: string[];
  relates_to_crew?: string[];
}): Promise<number | null> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('store_crew_personal_memory', {
    crew_id: input.crew_id,
    memory_type: input.memory_type,
    title: input.title,
    content: input.content,
    project_id: input.project_id || null,
    task_id: input.task_id || null,
    tags: input.tags || [],
    relates_to_crew: input.relates_to_crew || [],
  });

  if (error) {
    console.error('Error storing crew personal memory:', error);
    return null;
  }

  return data as number;
}

/**
 * Retrieve crew personal memories
 * Get all personal memories for a specific crew member
 */
export async function getCrewPersonalMemories(
  crew_id: string,
  limit: number = 20,
  includePrivate: boolean = false
): Promise<CrewPersonalMemory[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('get_crew_personal_memory', {
    p_crew_id: crew_id,
    memory_limit: limit,
    include_private: includePrivate,
  });

  if (error) {
    console.error(`Error getting crew personal memories for ${crew_id}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Search crew personal memories by text query
 * Useful for finding past insights and lessons learned
 */
export async function searchCrewPersonalMemories(
  crew_id: string,
  query: string,
  limit: number = 10
): Promise<CrewPersonalMemory[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('search_crew_personal_memory', {
    p_crew_id: crew_id,
    search_query: query,
    memory_limit: limit,
  });

  if (error) {
    console.error('Error searching crew personal memories:', error);
    return [];
  }

  return data || [];
}

/**
 * Search crew personal memories by semantic embedding
 * Find memories by meaning, not just keywords
 */
export async function searchCrewPersonalMemoriesByEmbedding(
  crew_id: string,
  embeddingVector: number[],
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<CrewPersonalMemory[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc(
    'search_crew_personal_memory_by_embedding',
    {
      p_crew_id: crew_id,
      embedding_vector: embeddingVector,
      memory_limit: limit,
      similarity_threshold: similarityThreshold,
    }
  );

  if (error) {
    console.error('Error searching crew personal memories by embedding:', error);
    return [];
  }

  return data || [];
}

/**
 * Get crew memories for a specific project
 * Useful for reviewing what a crew member learned on a specific project
 */
export async function getCrewMemoriesByProject(
  crew_id: string,
  project_id: string,
  limit: number = 20
): Promise<CrewPersonalMemory[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('get_crew_memories_by_project', {
    crew_id,
    project_id,
    memory_limit: limit,
  });

  if (error) {
    console.error(
      `Error getting crew memories for ${crew_id} on project ${project_id}:`,
      error
    );
    return [];
  }

  return data || [];
}

/**
 * Get crew memory statistics
 * Understand a crew member's learning across projects and memory types
 */
export async function getCrewMemoryStats(crew_id: string): Promise<
  Array<{
    total_memories: number;
    memory_by_type: string;
    projects_count: number;
    most_recent_memory: string;
  }>
> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('get_crew_memory_stats', {
    crew_id,
  });

  if (!error) {
    return data || [];
  }

  // Fallback path: aggregate directly from the table if the RPC function has an ambiguity error.
  const { data: rawRows, error: rawErr } = await client
    .from('sa_crew_personal_memory')
    .select('memory_type, project_id, created_at')
    .eq('crew_id', crew_id)
    .eq('is_searchable', true);

  if (rawErr) {
    if ((error as { code?: string } | null)?.code !== '42702') {
      console.error(`Error getting crew memory stats for ${crew_id}:`, error);
    }
    console.error(`Fallback table query also failed for ${crew_id}:`, rawErr);
    return [];
  }

  const rows = (rawRows || []) as Array<{ memory_type: string; project_id: string | null; created_at: string }>;
  const byType = new Map<string, { total: number; projects: Set<string>; latest: string }>();

  for (const row of rows) {
    const key = row.memory_type || 'unknown';
    const current = byType.get(key) || { total: 0, projects: new Set<string>(), latest: row.created_at };
    current.total += 1;
    if (row.project_id) current.projects.add(row.project_id);
    if (row.created_at > current.latest) current.latest = row.created_at;
    byType.set(key, current);
  }

  return Array.from(byType.entries()).map(([memoryType, agg]) => ({
    total_memories: agg.total,
    memory_by_type: memoryType,
    projects_count: agg.projects.size,
    most_recent_memory: agg.latest,
  }));
}

/**
 * Store crew execution outcome for real-time status tracking and RAG memory.
 * Called after every crew task execution (autonomous or guided).
 * Fire-and-forget async (doesn't block task execution).
 */
export async function storeCrewExecutionOutcome(input: {
  crewId: string;
  attemptId: string;
  taskDescription: string;
  status: 'success' | 'blocked' | 'retry' | 'failed';
  durationSeconds: number;
  confidenceLevel?: 'high' | 'medium' | 'low' | 'unknown';
  error?: string;
  filesTouched?: string[];
  recoveryAttempts?: number;
  complexityEstimate?: string;
}): Promise<void> {
  try {
    const client = await getSupabaseClient();

    // Store to crew_execution_outcomes table
    const { error } = await client
      .from('crew_execution_outcomes')
      .insert({
        crew_id: input.crewId,
        attempt_id: input.attemptId,
        task_description: input.taskDescription,
        status: input.status,
        duration_seconds: input.durationSeconds,
        confidence_level: input.confidenceLevel || 'unknown',
        error_message: input.error || null,
        files_touched: input.filesTouched ? JSON.stringify(input.filesTouched) : '[]',
        recovery_attempts: input.recoveryAttempts || 0,
        complexity_estimate: input.complexityEstimate || null,
      });

    if (error) {
      console.error('Failed to store crew execution outcome:', error);
      return;
    }

    // Also store to RAG for future recall
    const memoryTag = `crew_execution_${input.crewId}_${input.attemptId}`;
    await storeObservationMemory({
      storyId: input.crewId,
      clientId: null,
      source: 'crew_execution_outcome',
      transcript: {
        type: 'crew_execution_outcome',
        crewId: input.crewId,
        task: input.taskDescription,
        status: input.status,
        durationSeconds: input.durationSeconds,
        confidenceLevel: input.confidenceLevel,
        error: input.error,
        filesTouched: input.filesTouched,
      } as any,
      tags: [memoryTag, `crew_execution_${input.status}`, 'execution_outcome'],
    });
  } catch (err) {
    console.error('Error in storeCrewExecutionOutcome:', err);
    // Don't throw; fire-and-forget logging
  }
}

/**
 * Store autonomous task audit trail for governance + compliance.
 * Records task classification, escalations, and execution outcome.
 * Fire-and-forget async.
 */
export async function storeAutonomousTaskAudit(input: {
  taskId: string;
  crewId: string;
  brief: string;
  classification: 'autonomous' | 'requires_approval';
  reason: string;
  escalationThreshold?: string;
  status: 'executed' | 'escalated' | 'blocked';
  outcome?: string;
  durationSeconds?: number;
  costUsd?: number;
}): Promise<void> {
  try {
    // Store to RAG as audit trail with governance tag
    const auditTag = `autonomous_audit_${input.taskId}`;
    await storeObservationMemory({
      storyId: `governance_${input.crewId}`,
      clientId: null,
      source: 'autonomous_task_audit',
      transcript: {
        type: 'autonomous_task_audit',
        taskId: input.taskId,
        crewId: input.crewId,
        brief: input.brief,
        classification: input.classification,
        reason: input.reason,
        escalationThreshold: input.escalationThreshold,
        status: input.status,
        outcome: input.outcome,
        durationSeconds: input.durationSeconds,
        costUsd: input.costUsd,
      } as any,
      tags: [
        auditTag,
        `autonomous_${input.classification}`,
        `autonomous_${input.status}`,
        'governance_audit',
      ],
    });
  } catch (err) {
    console.error('Error in storeAutonomousTaskAudit:', err);
    // Don't throw; fire-and-forget logging
  }
}

/**
 * Retrieve recent crew execution outcomes for status display.
 * Returns the last N tasks across all crew members with their outcomes.
 */
export async function getRecentCrewExecutionOutcomes(
  limit: number = 10,
  crewId?: string
): Promise<
  Array<{
    crew_id: string;
    attempt_id: string;
    task_description: string;
    status: string;
    duration_seconds: number;
    confidence_level: string;
    timestamp: string;
    error_message?: string;
  }>
> {
  const isMissingOutcomesTable = (err: unknown): boolean => {
    const code = typeof err === 'object' && err !== null && 'code' in err
      ? String((err as any).code)
      : '';
    return code === '42P01';
  };

  try {
    const client = await getSupabaseClient();

    let query = client
      .from('crew_execution_outcomes')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (crewId) {
      query = query.eq('crew_id', crewId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingOutcomesTable(error)) {
        return [];
      }
      console.error('Failed to retrieve crew execution outcomes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getRecentCrewExecutionOutcomes:', err);
    return [];
  }
}

/**
 * Get aggregate stats for crew execution outcomes (e.g., for dashboard).
 */
export async function getCrewExecutionStats(dateFrom?: Date): Promise<{
  today_count: number;
  today_success_rate: number;
  today_cost_usd: number;
  active_tasks_count: number;
}> {
  const isMissingOutcomesTable = (err: unknown): boolean => {
    const code = typeof err === 'object' && err !== null && 'code' in err
      ? String((err as any).code)
      : '';
    return code === '42P01';
  };

  try {
    const client = await getSupabaseClient();

    // Default to last 24 hours if no date provided
    const from = dateFrom || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get outcomes from last 24h
    const { data: outcomes, error: outcomesError } = await client
      .from('crew_execution_outcomes')
      .select('status')
      .gte('timestamp', from.toISOString());

    if (outcomesError) {
      if (isMissingOutcomesTable(outcomesError)) {
        return {
          today_count: 0,
          today_success_rate: 0,
          today_cost_usd: 0,
          active_tasks_count: 0,
        };
      }
      console.error('Failed to get execution stats:', outcomesError);
      return {
        today_count: 0,
        today_success_rate: 0,
        today_cost_usd: 0,
        active_tasks_count: 0,
      };
    }

    const outcomeList = outcomes || [];
    const successCount = outcomeList.filter(o => o.status === 'success').length;
    const successRate = outcomeList.length > 0 ? successCount / outcomeList.length : 0;

    return {
      today_count: outcomeList.length,
      today_success_rate: successRate,
      today_cost_usd: 0, // TODO: Track cost per execution
      active_tasks_count: outcomeList.filter(o => o.status === 'retry').length,
    };
  } catch (err) {
    console.error('Error in getCrewExecutionStats:', err);
    return {
      today_count: 0,
      today_success_rate: 0,
      today_cost_usd: 0,
      active_tasks_count: 0,
    };
  }
}
