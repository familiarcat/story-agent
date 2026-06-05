import { describe, it, expect } from 'vitest';
import {
  toEmbedding,
  toPgVector,
  parseVector,
  cosineSimilarity,
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
