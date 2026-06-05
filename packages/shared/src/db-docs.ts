/**
 * Documentation corpus retrieval helpers.
 * Query vectorized docs for phase-aware, agent-accessible guidance.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toEmbedding, parseVector, cosineSimilarity } from './embedding.js';

export interface DocKnowledgeChunk {
  id: string;
  doc_id: string;
  doc_path: string;
  phase: string;
  title: string;
  heading: string | null;
  chunk_index: number;
  tags: string[];
  content_text: string;
  similarity?: number;
}

export interface DocRetrievalOptions {
  phase?: string;
  tags?: string[];
  query?: string;
  limit?: number;
}

let _client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment.');
  _client = createClient(url, key);
  return _client;
}

/**
 * Retrieve doc chunks filtered by phase/tags, optionally ranked by semantic similarity.
 */
export async function retrieveDocKnowledge(options: DocRetrievalOptions): Promise<DocKnowledgeChunk[]> {
  const { phase, tags = [], query, limit = 5 } = options;

  let q = db().from('sa_docs_knowledge_vectors').select('*');

  if (phase) {
    q = q.eq('phase', phase);
  }

  if (tags.length > 0) {
    // GIN index supports "contains" check
    q = q.contains('tags', tags);
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(100);

  if (error) throw new Error(`Doc retrieval failed: ${JSON.stringify(error)}`);

  let results = (data ?? []).map(row => ({
    id: row.id as string,
    doc_id: row.doc_id as string,
    doc_path: row.doc_path as string,
    phase: row.phase as string,
    title: row.title as string,
    heading: row.heading as string | null,
    chunk_index: row.chunk_index as number,
    tags: (row.tags as string[]) ?? [],
    content_text: row.content_text as string,
  })) as DocKnowledgeChunk[];

  // If query provided, rank by semantic similarity
  if (query) {
    const queryEmbedding = toEmbedding(query);
    results = results.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, parseVector(chunk)),
    }));
    results = results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
  }

  return results.slice(0, limit);
}

/**
 * List available doc phases (for UI phase selector).
 */
export async function listDocPhases(): Promise<string[]> {
  const { data, error } = await db()
    .from('sa_docs_knowledge_vectors')
    .select('phase');

  if (error) throw new Error(`Phase listing failed: ${JSON.stringify(error)}`);

  const phases = ((data ?? []) as Array<{ phase: string }>)
    .map(row => row.phase)
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .sort();

  return phases;
}

/**
 * Get guidance for a specific role (filtered by tags, limited to current phase).
 */
export async function getRoleGuidance(role: 'project_manager' | 'developer' | 'lead', phase?: string): Promise<DocKnowledgeChunk[]> {
  const roleTagMap: Record<string, string[]> = {
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
export async function searchDocs(keyword: string, phase?: string): Promise<DocKnowledgeChunk[]> {
  return retrieveDocKnowledge({
    query: keyword,
    phase,
    limit: 10,
  });
}
