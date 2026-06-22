"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_DIMENSION = exports.cosineSimilarity = exports.parseVector = exports.toPgVector = exports.toEmbedding = void 0;
exports.flushObservationMemoryQueue = flushObservationMemoryQueue;
exports.getObservationMemorySyncDiagnostics = getObservationMemorySyncDiagnostics;
exports.getSupabaseConnectivityDiagnostics = getSupabaseConnectivityDiagnostics;
exports.startObservationMemorySyncWorker = startObservationMemorySyncWorker;
exports.stopObservationMemorySyncWorker = stopObservationMemorySyncWorker;
exports.getDbClient = getDbClient;
exports.getSupabaseClient = getSupabaseClient;
exports.setEphemeral = setEphemeral;
exports.getEphemeral = getEphemeral;
exports.deleteEphemeral = deleteEphemeral;
exports.upsertStory = upsertStory;
exports.getStory = getStory;
exports.listStories = listStories;
exports.upsertPRComments = upsertPRComments;
exports.getCommentsForStory = getCommentsForStory;
exports.createRevisionCycle = createRevisionCycle;
exports.getRevisionCycles = getRevisionCycles;
exports.upsertProject = upsertProject;
exports.listProjects = listProjects;
exports.storeObservationMemory = storeObservationMemory;
exports.getRecentObservationMemories = getRecentObservationMemories;
exports.getCrewBaselineMemory = getCrewBaselineMemory;
exports.getAllCrewBaselineMemories = getAllCrewBaselineMemories;
exports.getRelevantObservationMemories = getRelevantObservationMemories;
exports.searchDocumentation = searchDocumentation;
exports.getDocumentationByCategory = getDocumentationByCategory;
exports.getDocumentationCategories = getDocumentationCategories;
exports.searchDocumentationByEmbedding = searchDocumentationByEmbedding;
exports.refreshDocumentationIndex = refreshDocumentationIndex;
exports.storeCrewPersonalMemory = storeCrewPersonalMemory;
exports.getCrewPersonalMemories = getCrewPersonalMemories;
exports.searchCrewPersonalMemories = searchCrewPersonalMemories;
exports.searchCrewPersonalMemoriesByEmbedding = searchCrewPersonalMemoriesByEmbedding;
exports.getCrewMemoriesByProject = getCrewMemoriesByProject;
exports.getCrewMemoryStats = getCrewMemoryStats;
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = require("crypto");
const redis_1 = require("redis");
const embedding_js_1 = require("./embedding.js");
Object.defineProperty(exports, "toEmbedding", { enumerable: true, get: function () { return embedding_js_1.toEmbedding; } });
Object.defineProperty(exports, "toPgVector", { enumerable: true, get: function () { return embedding_js_1.toPgVector; } });
Object.defineProperty(exports, "parseVector", { enumerable: true, get: function () { return embedding_js_1.parseVector; } });
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return embedding_js_1.cosineSimilarity; } });
Object.defineProperty(exports, "EMBEDDING_DIMENSION", { enumerable: true, get: function () { return embedding_js_1.EMBEDDING_DIMENSION; } });
let _client = null;
let _clientPromise = null;
let _redisClient = null;
let _redisInitAttempted = false;
let _memorySyncTimer = null;
let _activeSupabaseConfig = null;
let _memorySyncStats = {
    lastSyncAt: null,
    lastSyncErrorAt: null,
    lastSyncError: null,
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
function getSupabaseMode() {
    const mode = (process.env.SUPABASE_MODE ?? 'auto').trim().toLowerCase();
    if (mode === 'local' || mode === 'live')
        return mode;
    return 'auto';
}
/** Explicit cloud (remote RAG) endpoint. Newer SUPABASE_CLOUD_* wins; LIVE/FALLBACK kept for back-compat. */
function getCloudSupabaseUrl() {
    return (process.env.SUPABASE_CLOUD_URL ??
        process.env.SUPABASE_LIVE_URL ??
        process.env.SUPABASE_FALLBACK_URL ??
        '').trim();
}
function getCloudSupabaseKey() {
    return (process.env.SUPABASE_CLOUD_KEY ??
        process.env.SUPABASE_LIVE_KEY ??
        process.env.SUPABASE_FALLBACK_KEY ??
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        '').trim();
}
function isLocalSupabaseUrl(url) {
    return /(^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?)/i.test(url);
}
/**
 * Gather every configured Supabase endpoint, de-duplicated by URL and classified
 * cloud vs local. Sources, in declaration order:
 *  - explicit cloud (SUPABASE_CLOUD_URL / LIVE / FALLBACK)
 *  - the legacy primary (SUPABASE_URL) — classified by its own URL
 *  - explicit local (SUPABASE_LOCAL_URL)
 */
function getConfiguredCandidates() {
    const raw = [];
    const cloudUrl = getCloudSupabaseUrl();
    const cloudKey = getCloudSupabaseKey();
    if (cloudUrl && cloudKey)
        raw.push({ url: cloudUrl, key: cloudKey });
    const primaryUrl = (process.env.SUPABASE_URL ?? '').trim();
    const primaryKey = (process.env.SUPABASE_KEY ?? '').trim();
    if (primaryUrl && primaryKey)
        raw.push({ url: primaryUrl, key: primaryKey });
    const localUrl = (process.env.SUPABASE_LOCAL_URL ?? '').trim();
    const localKey = (process.env.SUPABASE_LOCAL_KEY ?? process.env.SUPABASE_KEY ?? '').trim();
    if (localUrl && localKey)
        raw.push({ url: localUrl, key: localKey });
    const seen = new Set();
    const candidates = [];
    for (const entry of raw) {
        const normalized = entry.url.replace(/\/$/, '').toLowerCase();
        if (seen.has(normalized))
            continue;
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
function getSupabaseCandidates() {
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
async function probeSupabaseCandidate(candidate) {
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
    }
    catch (error) {
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
async function db() {
    if (_client)
        return _client;
    if (_clientPromise)
        return _clientPromise;
    _clientPromise = (async () => {
        const { mode, candidates } = getSupabaseCandidates();
        if (candidates.length === 0) {
            throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment.');
        }
        const diagnostics = [];
        for (const candidate of candidates) {
            const probe = await probeSupabaseCandidate(candidate);
            diagnostics.push(`${candidate.source}:${candidate.url} => ${probe.classification}${probe.statusCode ? `(${probe.statusCode})` : ''}`);
            if (probe.reachable) {
                _activeSupabaseConfig = {
                    source: candidate.source,
                    url: candidate.url,
                    mode,
                };
                _client = (0, supabase_js_1.createClient)(candidate.url, candidate.key);
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
async function redis() {
    if (_redisClient?.isOpen)
        return _redisClient;
    if (_redisInitAttempted)
        return null;
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl)
        return null;
    _redisInitAttempted = true;
    try {
        const client = (0, redis_1.createClient)({ url: redisUrl });
        client.on('error', () => {
            // Keep Redis optional; fall back to Supabase-only mode on runtime issues.
        });
        await client.connect();
        _redisClient = client;
        return _redisClient;
    }
    catch {
        _redisClient = null;
        return null;
    }
}
function throwOnError(result) {
    if (result.error)
        throw new Error(JSON.stringify(result.error));
    return result.data;
}
function hashText(text) {
    return (0, embedding_js_1.toEmbedding)(text, 1).toString(); // SHA-256-based, kept for legacy compat
}
function worfGateEnabled() {
    return (process.env.WORFGATE_ENFORCE ?? 'true').toLowerCase() === 'true';
}
function parseCsv(value) {
    if (!value)
        return [];
    return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}
function getControlledMarkers() {
    const custom = parseCsv(process.env.WORFGATE_CONTROLLED_MARKERS);
    return custom.length > 0 ? custom : DEFAULT_CONTROLLED_MARKERS;
}
function redactStringWithMarkers(input, markers) {
    let output = input;
    let redacted = false;
    for (const marker of markers) {
        if (!marker)
            continue;
        const pattern = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (pattern.test(output)) {
            redacted = true;
            output = output.replace(pattern, REDACTED_VALUE);
        }
    }
    return { value: output, redacted };
}
function redactValueDeep(value, markers) {
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
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            const next = redactValueDeep(v, markers);
            redacted = redacted || next.redacted;
            out[k] = next.value;
        }
        return { value: out, redacted };
    }
    return { value, redacted: false };
}
function applyWorfGateMemoryRedaction(input) {
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
        transcript: redacted.value,
        tags,
        redacted: wasRedacted,
    };
}
function mapObservationMemory(row) {
    return {
        id: row.id,
        storyId: row.story_id,
        crewId: row.crew_id ?? null,
        clientId: row.client_id ?? null,
        source: row.source,
        transcriptHash: row.transcript_hash,
        transcriptText: row.transcript_text,
        transcript: row.transcript,
        missionReference: row.mission_ref,
        tags: row.tags ?? [],
        embedding: (0, embedding_js_1.parseVector)(row.memory_embedding),
        createdAt: row.created_at,
    };
}
function mapObservationMemoryPayload(row) {
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
        embedding: (0, embedding_js_1.parseVector)(row.memory_embedding),
        createdAt: row.created_at,
    };
}
function getStoryRecentKey(storyId) {
    return `sa:memory:recent:story:${storyId}`;
}
async function cacheAndQueueObservationMemory(payload) {
    const client = await redis();
    if (!client)
        return false;
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
async function getCachedObservationMemories(limit, storyId) {
    const client = await redis();
    if (!client)
        return [];
    const key = storyId ? getStoryRecentKey(storyId) : REDIS_RECENT_ALL_KEY;
    const rows = await client.lRange(key, 0, Math.max(0, limit - 1));
    const parsed = rows
        .map((row) => {
        try {
            return mapObservationMemoryPayload(JSON.parse(row));
        }
        catch {
            return null;
        }
    })
        .filter((row) => row !== null);
    return parsed;
}
async function flushObservationMemoryQueue(batchSize = REDIS_SYNC_BATCH_SIZE) {
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
        .map((item) => {
        try {
            return JSON.parse(item);
        }
        catch {
            return null;
        }
    })
        .filter((payload) => payload !== null);
    if (payloads.length === 0) {
        await client.lTrim(REDIS_SYNC_QUEUE_KEY, queueItems.length, -1);
        const remaining = await client.lLen(REDIS_SYNC_QUEUE_KEY);
        return { synced: 0, remaining };
    }
    throwOnError(await (await db()).from('sa_observation_memories').upsert(payloads, {
        onConflict: 'transcript_hash',
    }));
    await client.lTrim(REDIS_SYNC_QUEUE_KEY, queueItems.length, -1);
    const remaining = await client.lLen(REDIS_SYNC_QUEUE_KEY);
    _memorySyncStats.lastSyncAt = new Date().toISOString();
    _memorySyncStats.lastSyncErrorAt = null;
    _memorySyncStats.lastSyncError = null;
    _memorySyncStats.totalSynced += payloads.length;
    return { synced: payloads.length, remaining };
}
async function getObservationMemorySyncDiagnostics() {
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
async function getSupabaseConnectivityDiagnostics() {
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
    const candidateResults = await Promise.all(candidates.map(async (candidate) => ({
        source: candidate.source,
        url: candidate.url,
        ...(await probeSupabaseCandidate(candidate)),
    })));
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
function startObservationMemorySyncWorker(options) {
    if (_memorySyncTimer)
        return;
    const intervalMs = options?.intervalMs ?? REDIS_SYNC_INTERVAL_MS;
    const batchSize = options?.batchSize ?? REDIS_SYNC_BATCH_SIZE;
    _memorySyncTimer = setInterval(() => {
        void flushObservationMemoryQueue(batchSize).catch(() => {
            // Queue remains intact on errors; retries happen on next interval.
        });
    }, intervalMs);
}
function stopObservationMemorySyncWorker() {
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
async function getDbClient() {
    return db();
}
/**
 * Cloud-first Supabase client for callers that require a client and treat an
 * unreachable store as fatal (crew personal memory, documentation RAG).
 * Throws if no endpoint (cloud → local) is reachable.
 */
async function getSupabaseClient() {
    return db();
}
/**
 * Cloud-first Supabase client for optional paths that prefer to degrade
 * gracefully (e.g. baseline-memory preload). Returns null instead of throwing.
 */
async function getClient() {
    try {
        return await db();
    }
    catch {
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
async function setEphemeral(key, value, ttlSeconds = EPHEMERAL_DEFAULT_TTL_SECONDS) {
    const client = await redis();
    if (!client)
        return false;
    await client.set(`${EPHEMERAL_PREFIX}${key}`, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) });
    return true;
}
/** Read a transient value from Redis. Returns null if missing, expired, or Redis is unavailable. */
async function getEphemeral(key) {
    const client = await redis();
    if (!client)
        return null;
    const raw = await client.get(`${EPHEMERAL_PREFIX}${key}`);
    if (raw == null)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/** Delete a transient value from Redis. Returns false if Redis is unavailable. */
async function deleteEphemeral(key) {
    const client = await redis();
    if (!client)
        return false;
    await client.del(`${EPHEMERAL_PREFIX}${key}`);
    return true;
}
async function upsertStory(clientId, story) {
    const now = new Date().toISOString();
    throwOnError(await (await db()).from('stories').upsert({
        id: story.id,
        story_id: story.storyId,
        story_title: story.storyTitle,
        story_url: story.storyUrl,
        repo_full_name: story.repoFullName,
        branch: story.branch,
        base_branch: story.baseBranch,
        status: story.status,
        pr_number: story.prNumber,
        pr_url: story.prUrl,
        pr_status: story.prStatus,
        phase: story.phase,
        project_id: story.projectId,
        epic_id: story.epicId,
        acceptance_criteria: story.acceptanceCriteria,
        created_at: story.createdAt ?? now,
        updated_at: now,
        notes: story.notes,
        client_id: clientId,
    }, { onConflict: 'id' }));
}
async function getStory(storyId, clientId) {
    const { data } = await (await db()).from('stories').select('*').eq('story_id', storyId).eq('client_id', clientId).maybeSingle();
    return data ? mapStory(data) : null;
}
async function listStories() {
    const rows = throwOnError(await (await db()).from('stories').select('*').order('updated_at', { ascending: false }));
    return (rows ?? []).map(mapStory);
}
function mapStory(row) {
    return {
        id: row.id,
        storyId: row.story_id,
        storyTitle: row.story_title,
        storyUrl: row.story_url,
        repoFullName: row.repo_full_name,
        branch: row.branch,
        baseBranch: row.base_branch,
        status: row.status,
        prNumber: row.pr_number,
        prUrl: row.pr_url,
        prStatus: row.pr_status,
        phase: row.phase,
        projectId: row.project_id,
        epicId: row.epic_id,
        acceptanceCriteria: row.acceptance_criteria,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        notes: row.notes,
    };
}
// ── PR Comments ──────────────────────────────────────────────────────────────
async function upsertPRComments(comments) {
    if (comments.length === 0)
        return;
    throwOnError(await (await db()).from('sa_pr_comments').upsert(comments.map(c => ({
        id: c.id,
        story_id: c.storyId,
        pr_number: c.prNumber,
        author: c.author,
        body: c.body,
        path: c.path,
        line: c.line,
        state: c.state,
        created_at: c.createdAt,
        url: c.url,
    })), { onConflict: 'id' }));
}
async function getCommentsForStory(storyId) {
    const rows = throwOnError(await (await db()).from('sa_pr_comments').select('*').eq('story_id', storyId).order('created_at', { ascending: true }));
    return (rows ?? []).map(r => ({
        id: r.id,
        storyId: r.story_id,
        prNumber: r.pr_number,
        author: r.author,
        body: r.body,
        path: r.path,
        line: r.line,
        state: r.state,
        createdAt: r.created_at,
        url: r.url,
    }));
}
// ── Revision Cycles ──────────────────────────────────────────────────────────
async function createRevisionCycle(cycle) {
    throwOnError(await (await db()).from('sa_revision_cycles').insert({
        id: cycle.id,
        story_id: cycle.storyId,
        cycle_number: cycle.cycleNumber,
        comments_addressed: cycle.commentsAddressed,
        files_changed: cycle.filesChanged,
        test_evidence: cycle.testEvidence,
        commit_sha: cycle.commitSha,
        completed_at: cycle.completedAt,
        created_at: new Date().toISOString(),
    }));
}
async function getRevisionCycles(storyId) {
    const rows = throwOnError(await (await db()).from('sa_revision_cycles').select('*').eq('story_id', storyId).order('cycle_number', { ascending: true }));
    return (rows ?? []).map(r => ({
        id: r.id,
        storyId: r.story_id,
        cycleNumber: r.cycle_number,
        commentsAddressed: r.comments_addressed,
        filesChanged: r.files_changed,
        testEvidence: r.test_evidence,
        commitSha: r.commit_sha,
        completedAt: r.completed_at,
        createdAt: r.created_at,
    }));
}
// ── Projects ──────────────────────────────────────────────────────────────────
async function upsertProject(project) {
    throwOnError(await (await db()).from('sa_projects').upsert({
        id: project.id,
        name: project.name,
        repo_full_name: project.repoFullName,
        aha_project_id: project.ahaProjectId,
        created_at: project.createdAt ?? new Date().toISOString(),
    }, { onConflict: 'repo_full_name' }));
}
async function listProjects() {
    const rows = throwOnError(await (await db()).from('sa_projects').select('*').order('name', { ascending: true }));
    return (rows ?? []).map(r => ({
        id: r.id,
        name: r.name,
        repoFullName: r.repo_full_name,
        ahaProjectId: r.aha_project_id,
        createdAt: r.created_at,
    }));
}
// ── Observation Lounge Memory (Vector Store) ────────────────────────────────
async function storeObservationMemory(input) {
    const worfGate = applyWorfGateMemoryRedaction({
        transcript: input.transcript,
        tags: input.tags,
    });
    const transcriptText = JSON.stringify(worfGate.transcript);
    // Include clientId in hash to prevent cross-client hash collisions
    const transcriptHash = hashText(`${input.clientId ?? 'global'}:${input.storyId}:${transcriptText}`);
    const embedding = (0, embedding_js_1.toEmbedding)(transcriptText);
    const payload = {
        id: (0, crypto_1.randomUUID)(),
        story_id: input.storyId,
        client_id: input.clientId ?? null,
        source: input.source,
        transcript_hash: transcriptHash,
        transcript_text: transcriptText,
        transcript: worfGate.transcript,
        mission_ref: input.missionReference ?? input.missionPlan?.story.referenceNum ?? null,
        tags: worfGate.tags,
        memory_embedding: (0, embedding_js_1.toPgVector)(embedding),
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
    }
    catch {
        // Fall through to direct Supabase persistence.
    }
    const rows = throwOnError(await (await db()).from('sa_observation_memories').upsert(payload, {
        onConflict: 'transcript_hash',
    }).select('*').limit(1));
    const row = Array.isArray(rows) ? rows[0] : rows;
    return mapObservationMemory(row ?? payload);
}
async function getRecentObservationMemories(limit = 8, storyId, clientId) {
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
    const merged = [...filteredCache, ...(rows ?? []).map(row => mapObservationMemory(row))];
    const deduped = Array.from(new Map(merged.map(memory => [memory.transcriptHash, memory])).values());
    return deduped.slice(0, limit);
}
/**
 * Fetch baseline memory for a specific crew member
 * Used during missions for crew to reference their own principles and learnings
 */
async function getCrewBaselineMemory(crewId) {
    const client = await getClient();
    if (!client)
        return null;
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
    }
    catch (error) {
        console.error(`Exception fetching crew baseline memory for ${crewId}:`, error);
        return null;
    }
}
/**
 * Fetch baseline memories for all crew members
 * Useful for pre-loading crew context at mission start
 */
async function getAllCrewBaselineMemories() {
    const client = await getClient();
    if (!client)
        return new Map();
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
        const memories = new Map();
        for (const record of data || []) {
            const mapped = mapObservationMemory(record);
            if (mapped.crewId) {
                memories.set(mapped.crewId, mapped);
            }
        }
        return memories;
    }
    catch (error) {
        console.error('Exception fetching all crew baseline memories:', error);
        return new Map();
    }
}
async function getRelevantObservationMemories(input) {
    const { queryText, storyId, clientId, limit = 5, candidatePool = 40 } = input;
    const candidates = await getRecentObservationMemories(candidatePool, storyId, clientId);
    const queryEmbedding = (0, embedding_js_1.toEmbedding)(queryText);
    return candidates
        .map(memory => ({
        ...memory,
        similarity: (0, embedding_js_1.cosineSimilarity)(queryEmbedding, memory.embedding),
    }))
        .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
        .slice(0, limit);
}
/**
 * Search documentation by text query
 * Useful for finding guides and references related to crew tasks
 */
async function searchDocumentation(query, category, limit = 10) {
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
async function getDocumentationByCategory(category) {
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
async function getDocumentationCategories() {
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
async function searchDocumentationByEmbedding(embeddingVector, category, limit = 10, similarityThreshold = 0.7) {
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
async function refreshDocumentationIndex() {
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
/**
 * Store a personal memory for a crew member
 * Used for capturing insights, lessons learned, and decision notes
 */
async function storeCrewPersonalMemory(input) {
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
    return data;
}
/**
 * Retrieve crew personal memories
 * Get all personal memories for a specific crew member
 */
async function getCrewPersonalMemories(crew_id, limit = 20, includePrivate = false) {
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
async function searchCrewPersonalMemories(crew_id, query, limit = 10) {
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
async function searchCrewPersonalMemoriesByEmbedding(crew_id, embeddingVector, limit = 10, similarityThreshold = 0.7) {
    const client = await getSupabaseClient();
    const { data, error } = await client.rpc('search_crew_personal_memory_by_embedding', {
        p_crew_id: crew_id,
        embedding_vector: embeddingVector,
        memory_limit: limit,
        similarity_threshold: similarityThreshold,
    });
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
async function getCrewMemoriesByProject(crew_id, project_id, limit = 20) {
    const client = await getSupabaseClient();
    const { data, error } = await client.rpc('get_crew_memories_by_project', {
        crew_id,
        project_id,
        memory_limit: limit,
    });
    if (error) {
        console.error(`Error getting crew memories for ${crew_id} on project ${project_id}:`, error);
        return [];
    }
    return data || [];
}
/**
 * Get crew memory statistics
 * Understand a crew member's learning across projects and memory types
 */
async function getCrewMemoryStats(crew_id) {
    const client = await getSupabaseClient();
    const { data, error } = await client.rpc('get_crew_memory_stats', {
        crew_id,
    });
    if (error) {
        console.error(`Error getting crew memory stats for ${crew_id}:`, error);
        return [];
    }
    return data || [];
}
//# sourceMappingURL=db.js.map