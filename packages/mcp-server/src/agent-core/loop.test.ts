import { describe, it, expect } from 'vitest';
import { looksActionable, shouldEscalate, isRetryable } from './loop.js';

describe('looksActionable (self-healing stall detection)', () => {
  it('is true for tasks that imply tool use', () => {
    expect(looksActionable('edit the DiffView colors in agent/page.tsx')).toBe(true);
    expect(looksActionable('create scripts/check.mjs and run it')).toBe(true);
    expect(looksActionable('reskin the page through the primitives')).toBe(true);
    expect(looksActionable('fix the failing build')).toBe(true);
  });
  it('is false for pure questions / answers', () => {
    expect(looksActionable('what does this function do?')).toBe(false);
    expect(looksActionable('summarize the architecture')).toBe(false);
  });
});

describe('shouldEscalate', () => {
  it('escalates on security/architecture signals', () => {
    expect(shouldEscalate('review the security of the auth flow')).toBe(true);
    expect(shouldEscalate('design the schema migration')).toBe(true);
  });
  it('escalates on very long prompts (>600 chars)', () => {
    expect(shouldEscalate('x'.repeat(601))).toBe(true);
  });
  it('does not escalate a short simple task', () => {
    expect(shouldEscalate('add a comment to README')).toBe(false);
  });
});

describe('isRetryable', () => {
  it('retries 429 / 5xx / transient network', () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ code: 'ECONNRESET' })).toBe(true);
  });
  it('does not retry a 400', () => {
    expect(isRetryable({ status: 400 })).toBe(false);
  });
});
