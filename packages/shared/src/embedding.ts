/**
 * Pure embedding and vector math utilities.
 * Shared by db.ts and db-docs.ts — exported for testing and reuse.
 */

import { createHash } from 'crypto';

export const EMBEDDING_DIMENSION = 64;

/**
 * Deterministic 64-dim embedding from a string using SHA-256 byte normalization.
 * Same input always produces the same vector (no API calls required).
 */
export function toEmbedding(text: string, dimension = EMBEDDING_DIMENSION): number[] {
  const vector: number[] = [];
  for (let i = 0; i < dimension; i++) {
    const digest = createHash('sha256').update(`${i}:${text}`).digest();
    // Normalize byte [0,255] to [-1,1]
    vector.push((digest[0] / 127.5) - 1);
  }
  return vector;
}

/** Resolve the embeddings provider: dedicated key → OpenAI key → reuse the OpenRouter crew key. */
function embeddingProvider(): { key: string; url: string; model: string } | null {
  if (process.env.EMBEDDING_DISABLE === 'true') return null; // force the free hash (cost control)
  if (process.env.EMBEDDING_API_KEY) {
    return {
      key: process.env.EMBEDDING_API_KEY,
      url: process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      key: process.env.OPENAI_API_KEY,
      url: process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    };
  }
  // No dedicated embeddings key — reuse the OpenRouter crew key (it serves /embeddings). Zero new secret.
  if (process.env.CREW_LLM_APPROVED_KEY) {
    return {
      key: process.env.CREW_LLM_APPROVED_KEY,
      url: process.env.EMBEDDING_API_URL || process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1',
      model: process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small',
    };
  }
  return null;
}

/** Whether a real embeddings API is reachable (else the deterministic hash fallback is used). */
export function embeddingSource(): 'api' | 'hash' {
  return embeddingProvider() ? 'api' : 'hash';
}

/**
 * Real, cost-optimized embedding with graceful fallback. Uses a dedicated embeddings key
 * (EMBEDDING_API_KEY/OPENAI_API_KEY) if present, else REUSES the OpenRouter crew key
 * (CREW_LLM_APPROVED_KEY) which serves embeddings — so real RAG works with NO new secret. Requests
 * `dimension` dims (Matryoshka) and defensively slices, so the vector stays 64-wide (NO DB change).
 * Any failure (or no provider) falls back to the deterministic SHA hash — a write/recall never breaks.
 */
export async function embed(text: string, dimension = EMBEDDING_DIMENSION): Promise<number[]> {
  const p = embeddingProvider();
  if (!p) return toEmbedding(text, dimension);
  const url = p.url.replace(/\/$/, '');
  try {
    // TIMEOUT FIX (2026-08-14): this function's own contract says "a write/recall never breaks" —
    // true for a fetch that REJECTS (network error, non-2xx), false for one that just never
    // resolves. Found via a real production hang: /chat succeeded once, then hung on every
    // subsequent call, always right after "[WORFGATE] REDACT memory transcript prior to
    // persistence" logged and nothing after it — isolated by adding request-scoped diagnostic
    // logging and tracing the exact next line of code, which was this fetch with no bound on it at
    // all. AbortController turns "hangs forever" into "rejects after 8s", which the existing catch
    // below already handles correctly — the fallback logic was always right, it just needed
    // something to actually trigger it.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let resp: Response;
    try {
      resp = await fetch(`${url}/embeddings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: p.model, input: text.slice(0, 8000), dimensions: dimension }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!resp.ok) throw new Error(`embeddings ${resp.status}`);
    const d: any = await resp.json();
    const v = d?.data?.[0]?.embedding;
    if (Array.isArray(v) && v.length) return v.length > dimension ? v.slice(0, dimension) : v;
    throw new Error('empty embedding');
  } catch {
    return toEmbedding(text, dimension); // graceful — never fail a write on embeddings (now genuinely true for hangs too)
  }
}

/**
 * Serialize a number[] to Postgres vector literal: [x,y,z,...]
 */
export function toPgVector(vector: number[]): string {
  return `[${vector.map(v => Number(v.toFixed(6))).join(',')}]`;
}

/**
 * Parse a Postgres vector literal or plain number[] back to number[].
 */
export function parseVector(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(v => Number(v)).filter(v => Number.isFinite(v));
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
  return trimmed
    .slice(1, -1)
    .split(',')
    .map(part => Number(part.trim()))
    .filter(v => Number.isFinite(v));
}

/**
 * Cosine similarity between two vectors. Returns 0 for zero-magnitude inputs.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
