"use strict";
/**
 * Documentation corpus retrieval helpers.
 * Query vectorized docs for phase-aware, agent-accessible guidance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveDocKnowledge = retrieveDocKnowledge;
exports.listDocPhases = listDocPhases;
exports.getRoleGuidance = getRoleGuidance;
exports.searchDocs = searchDocs;
const supabase_js_1 = require("@supabase/supabase-js");
const embedding_js_1 = require("./embedding.js");
let _client = null;
let _clientPromise = null;
function getSupabaseMode() {
    const mode = (process.env.SUPABASE_MODE ?? 'auto').trim().toLowerCase();
    if (mode === 'local' || mode === 'live')
        return mode;
    return 'auto';
}
function getCandidates() {
    const primaryUrl = process.env.SUPABASE_URL?.trim() ?? '';
    const primaryKey = process.env.SUPABASE_KEY?.trim() ?? '';
    const fallbackUrl = (process.env.SUPABASE_FALLBACK_URL ?? process.env.SUPABASE_LIVE_URL ?? '').trim();
    const fallbackKey = (process.env.SUPABASE_FALLBACK_KEY ??
        process.env.SUPABASE_LIVE_KEY ??
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        '').trim();
    const primary = primaryUrl && primaryKey ? [{ url: primaryUrl, key: primaryKey }] : [];
    const fallback = fallbackUrl && fallbackKey ? [{ url: fallbackUrl, key: fallbackKey }] : [];
    return getSupabaseMode() === 'live' ? [...fallback, ...primary] : [...primary, ...fallback];
}
async function isReachable(candidate) {
    const endpoint = `${candidate.url.replace(/\/$/, '')}/rest/v1/`;
    try {
        const response = await fetch(endpoint, {
            headers: {
                apikey: candidate.key,
                Authorization: `Bearer ${candidate.key}`,
                Accept: 'application/json',
            },
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
async function db() {
    if (_client)
        return _client;
    if (_clientPromise)
        return _clientPromise;
    _clientPromise = (async () => {
        const candidates = getCandidates();
        if (candidates.length === 0) {
            throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment.');
        }
        for (const candidate of candidates) {
            if (await isReachable(candidate)) {
                _client = (0, supabase_js_1.createClient)(candidate.url, candidate.key);
                return _client;
            }
        }
        _clientPromise = null;
        throw new Error('No reachable Supabase endpoint for documentation retrieval.');
    })();
    return _clientPromise;
}
/**
 * Retrieve doc chunks filtered by phase/tags, optionally ranked by semantic similarity.
 */
async function retrieveDocKnowledge(options) {
    const { phase, tags = [], query, limit = 5 } = options;
    let q = (await db()).from('sa_docs_knowledge_vectors').select('*');
    if (phase) {
        q = q.eq('phase', phase);
    }
    if (tags.length > 0) {
        // GIN index supports "contains" check
        q = q.contains('tags', tags);
    }
    const { data, error } = await q.order('created_at', { ascending: false }).limit(100);
    if (error)
        throw new Error(`Doc retrieval failed: ${JSON.stringify(error)}`);
    let results = (data ?? []).map(row => ({
        id: row.id,
        doc_id: row.doc_id,
        doc_path: row.doc_path,
        phase: row.phase,
        title: row.title,
        heading: row.heading,
        chunk_index: row.chunk_index,
        tags: row.tags ?? [],
        content_text: row.content_text,
    }));
    // If query provided, rank by semantic similarity
    if (query) {
        const queryEmbedding = (0, embedding_js_1.toEmbedding)(query);
        results = results.map(chunk => ({
            ...chunk,
            similarity: (0, embedding_js_1.cosineSimilarity)(queryEmbedding, (0, embedding_js_1.parseVector)(chunk)),
        }));
        results = results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
    }
    return results.slice(0, limit);
}
/**
 * List available doc phases (for UI phase selector).
 */
async function listDocPhases() {
    const { data, error } = await (await db())
        .from('sa_docs_knowledge_vectors')
        .select('phase');
    if (error)
        throw new Error(`Phase listing failed: ${JSON.stringify(error)}`);
    const phases = (data ?? [])
        .map(row => row.phase)
        .filter((p, i, arr) => arr.indexOf(p) === i)
        .sort();
    return phases;
}
/**
 * Get guidance for a specific role (filtered by tags, limited to current phase).
 */
async function getRoleGuidance(role, phase) {
    const roleTagMap = {
        project_manager: ['pm', 'roadmap', 'budget', 'risks', 'timeline'],
        developer: ['dev', 'ui', 'implementation', 'code', 'architecture'],
        lead: ['architecture', 'roadmap', 'timeline', 'integration', 'index'],
    };
    const tags = roleTagMap[role] ?? [];
    return retrieveDocKnowledge({
        phase,
        tags,
        limit: 3,
    });
}
/**
 * Full-text search across doc corpus (in Markdown content).
 */
async function searchDocs(keyword, phase) {
    return retrieveDocKnowledge({
        query: keyword,
        phase,
        limit: 10,
    });
}
//# sourceMappingURL=db-docs.js.map