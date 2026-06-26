import { describe, it, expect } from 'vitest';
import { parseSSEFrame, cumulativeCost, sanitizeError, isDiff, safeJson } from './transcript';

describe('parseSSEFrame', () => {
  it('parses a named event + json data', () => {
    const f = parseSSEFrame('event: done\ndata: {"totalCostUSD":0.5,"model":"x"}');
    expect(f).toEqual({ eventName: 'done', data: { totalCostUSD: 0.5, model: 'x' } });
  });
  it('parses a data-only frame (no event name)', () => {
    const f = parseSSEFrame('data: {"type":"model","model":"deepseek/deepseek-chat"}');
    expect(f?.eventName).toBeNull();
    expect(f?.data.type).toBe('model');
  });
  it('returns null for a partial / non-json frame', () => {
    expect(parseSSEFrame('data: {oops')).toBeNull();
    expect(parseSSEFrame(': keep-alive comment')).toBeNull();
  });
});

describe('cumulativeCost (SET semantics — no double counting)', () => {
  it('sets from a done frame totalCostUSD', () => {
    expect(cumulativeCost(0.1, { eventName: 'done', data: { totalCostUSD: 0.9 } })).toBe(0.9);
  });
  it('sets from a cost frame costUSD (cumulative at threshold)', () => {
    expect(cumulativeCost(0.1, { eventName: null, data: { type: 'cost', costUSD: 0.4 } })).toBe(0.4);
  });
  it('leaves the total unchanged for unrelated frames', () => {
    expect(cumulativeCost(0.3, { eventName: null, data: { type: 'tool_call', tool: 'read_file' } })).toBe(0.3);
  });
  it('does not double-count: cost then done reflects the final, not the sum', () => {
    let c = 0;
    c = cumulativeCost(c, { eventName: null, data: { type: 'cost', costUSD: 0.4 } });
    c = cumulativeCost(c, { eventName: 'done', data: { totalCostUSD: 0.6 } });
    expect(c).toBe(0.6); // not 1.0
  });
});

describe('sanitizeError (no internals leak to the browser)', () => {
  it('strips absolute filesystem paths', () => {
    const out = sanitizeError('ENOENT: /Users/alice/.alexai-secrets/api-keys.env not found');
    expect(out).not.toContain('/Users/alice');
    expect(out).toContain('<path>');
  });
  it('skips stack frames, keeps the first meaningful line', () => {
    const out = sanitizeError('Boom happened\n    at foo (/var/app/x.js:1:2)\n    at bar');
    expect(out).toBe('Boom happened');
  });
  it('falls back to a friendly message on empty input', () => {
    expect(sanitizeError('')).toMatch(/something went wrong/i);
  });
  it('caps length to 300 chars', () => {
    expect(sanitizeError('x'.repeat(1000)).length).toBe(300);
  });
});

describe('isDiff heuristic', () => {
  it('detects a git_diff / apply_patch unified diff', () => {
    expect(isDiff('git_diff', 'diff --git a/x b/x\n@@ -1 +1 @@\n-old\n+new')).toBe(true);
  });
  it('is false for plain tool output', () => {
    expect(isDiff('read_file', 'just some file contents\nwith lines')).toBe(false);
  });
});

describe('safeJson', () => {
  it('pretty-prints objects and passes strings through', () => {
    expect(safeJson({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(safeJson('already a string')).toBe('already a string');
  });
});
