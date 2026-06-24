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

/** Whether a real embeddings API is configured (else the deterministic hash fallback is used). */
export function embeddingSource(): 'api' | 'hash' {
  return process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY ? 'api' : 'hash';
}

/**
 * Real, cost-optimized embedding with graceful fallback. When EMBEDDING_API_KEY (or OPENAI_API_KEY)
 * is set, calls an OpenAI-compatible /embeddings endpoint with the cheapest mainstream model
 * (text-embedding-3-small, ~$0.02/1M tokens), requesting `dimension` dims (Matryoshka) so the
 * vector stays the same width as the hash fallback — NO DB change needed. Any failure (or no key)
 * falls back to the deterministic SHA hash, so a write/recall never breaks on embeddings.
 */
export async function embed(text: string, dimension = EMBEDDING_DIMENSION): Promise<number[]> {
  const key = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return toEmbedding(text, dimension);
  const url = (process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  try {
    const resp = await fetch(`${url}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text.slice(0, 8000), dimensions: dimension }),
    });
    if (!resp.ok) throw new Error(`embeddings ${resp.status}`);
    const d: any = await resp.json();
    const v = d?.data?.[0]?.embedding;
    if (Array.isArray(v) && v.length) return v as number[];
    throw new Error('empty embedding');
  } catch {
    return toEmbedding(text, dimension); // graceful — never fail a write on embeddings
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
