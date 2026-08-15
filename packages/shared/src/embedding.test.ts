import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toEmbedding,
  toPgVector,
  parseVector,
  cosineSimilarity,
  embed,
  EMBEDDING_DIMENSION,
} from './embedding.js';

describe('toEmbedding', () => {
  it('produces a vector of the default dimension (64)', () => {
    const v = toEmbedding('hello');
    expect(v).toHaveLength(EMBEDDING_DIMENSION);
  });

  it('produces a vector of a custom dimension', () => {
    const v = toEmbedding('hello', 16);
    expect(v).toHaveLength(16);
  });

  it('is deterministic — same input always produces same output', () => {
    const a = toEmbedding('story-123');
    const b = toEmbedding('story-123');
    expect(a).toEqual(b);
  });

  it('produces different vectors for different inputs', () => {
    const a = toEmbedding('architecture');
    const b = toEmbedding('security');
    expect(a).not.toEqual(b);
  });

  it('all values are in the range [-1, 1]', () => {
    const v = toEmbedding('test content');
    for (const val of v) {
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('produces valid numbers (no NaN or Infinity)', () => {
    const v = toEmbedding('');
    for (const val of v) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });
});

describe('toPgVector', () => {
  it('serializes a number array to postgres vector literal', () => {
    const result = toPgVector([1, -0.5, 0.123456789]);
    // Number(v.toFixed(6)) strips trailing zeros — JS native behaviour
    expect(result).toBe('[1,-0.5,0.123457]');
  });

  it('produces a string starting and ending with brackets', () => {
    const result = toPgVector([0.1, 0.2, 0.3]);
    expect(result).toMatch(/^\[.*\]$/);
  });

  it('handles an empty array', () => {
    expect(toPgVector([])).toBe('[]');
  });

  it('round-trips through parseVector', () => {
    const original = toEmbedding('round-trip test');
    const serialized = toPgVector(original);
    const parsed = parseVector(serialized);
    // Values are rounded to 6 decimal places during serialization
    for (let i = 0; i < original.length; i++) {
      expect(parsed[i]).toBeCloseTo(original[i], 5);
    }
  });
});

describe('parseVector', () => {
  it('parses a postgres vector string literal', () => {
    const result = parseVector('[0.5,-0.25,1.0]');
    expect(result).toEqual([0.5, -0.25, 1.0]);
  });

  it('returns an array unchanged when given a number[]', () => {
    const input = [1, 2, 3];
    expect(parseVector(input)).toEqual([1, 2, 3]);
  });

  it('returns empty array for non-string non-array inputs', () => {
    expect(parseVector(null)).toEqual([]);
    expect(parseVector(undefined)).toEqual([]);
    expect(parseVector(42)).toEqual([]);
    expect(parseVector({})).toEqual([]);
  });

  it('returns empty array for malformed strings', () => {
    expect(parseVector('0.5,0.6')).toEqual([]);
    expect(parseVector('{0.5,0.6}')).toEqual([]);
    expect(parseVector('')).toEqual([]);
  });

  it('filters out non-finite values', () => {
    // Directly passing an array with non-finite values
    const result = parseVector([1, NaN, Infinity, 2]);
    expect(result).toEqual([1, 2]);
  });

  it('handles whitespace in string literals', () => {
    const result = parseVector('[ 0.5 , -0.25 , 1.0 ]');
    expect(result).toEqual([0.5, -0.25, 1.0]);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 for zero-length vector a', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('returns 0 for zero-length vector b', () => {
    expect(cosineSimilarity([1, 1], [0, 0])).toBe(0);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('handles vectors of different lengths (uses minimum length)', () => {
    const result = cosineSimilarity([1, 0, 0], [1, 0]);
    expect(result).toBeCloseTo(1);
  });

  it('returns a value in [-1, 1]', () => {
    const a = toEmbedding('captain picard');
    const b = toEmbedding('lt worf');
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it('produces consistent relative ordering for identical inputs (same text = highest similarity)', () => {
    // Deterministic SHA256 embedding: identical text must always score 1.0
    const base = toEmbedding('architecture review');
    const identical = toEmbedding('architecture review');
    const different = toEmbedding('financial cost analysis');
    expect(cosineSimilarity(base, identical)).toBeCloseTo(1);
    // Identical text must score higher than a completely different text
    expect(cosineSimilarity(base, identical)).toBeGreaterThan(
      cosineSimilarity(base, different)
    );
  });
});

describe('embed (2026-08-14: the hang-fallback fix, found from a real production incident)', () => {
  const ENV_KEYS = ['EMBEDDING_DISABLE', 'EMBEDDING_API_KEY', 'OPENAI_API_KEY', 'CREW_LLM_APPROVED_KEY', 'CREW_LLM_APPROVED_URL', 'EMBEDDING_API_URL', 'EMBEDDING_MODEL'] as const;
  const savedEnv: Record<string, string | undefined> = {};
  const originalFetch = global.fetch;

  beforeEach(() => {
    for (const k of ENV_KEYS) { savedEnv[k] = process.env[k]; delete process.env[k]; }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k];
    }
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('falls back to the deterministic hash immediately when no provider is configured', async () => {
    const v = await embed('no provider configured');
    expect(v).toEqual(toEmbedding('no provider configured'));
  });

  it('uses the real API response when the provider call succeeds', async () => {
    process.env.EMBEDDING_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: new Array(EMBEDDING_DIMENSION).fill(0.5) }] }),
    } as any);
    const v = await embed('real api call');
    expect(v).toEqual(new Array(EMBEDDING_DIMENSION).fill(0.5));
  });

  it('falls back gracefully when the provider call rejects outright (pre-existing behavior, confirmed still intact)', async () => {
    process.env.EMBEDDING_API_KEY = 'test-key';
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const v = await embed('network failure case');
    expect(v).toEqual(toEmbedding('network failure case'));
  });

  it('falls back to the hash instead of hanging forever when the provider call never resolves — the actual bug', async () => {
    process.env.EMBEDDING_API_KEY = 'test-key';
    vi.useFakeTimers();
    // A fetch mock that genuinely never resolves on its own, matching the real production symptom —
    // only settles if its AbortSignal fires, exactly like real fetch() does under an abort.
    global.fetch = vi.fn().mockImplementation((_url: string, init: any) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = embed('this call would hang forever without the fix');
    // Advance past the 8s timeout WITHOUT actually waiting 8 real seconds — this is the test that
    // would have hung the entire test run indefinitely before the fix (no timeout = no fallback =
    // no resolution, ever), same as the real production request.
    await vi.advanceTimersByTimeAsync(8100);
    const v = await promise;
    expect(v).toEqual(toEmbedding('this call would hang forever without the fix'));
  });
});
