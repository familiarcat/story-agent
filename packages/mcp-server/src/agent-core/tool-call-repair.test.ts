import { describe, it, expect } from 'vitest';
import { repairToolCallArgs } from './tool-call-repair.js';

describe('repairToolCallArgs', () => {
  it('parses stringified JSON args', () => {
    const result = repairToolCallArgs('write_file', '{"path":"test.txt","content":"hello"}');
    expect(result).toEqual({ ok: true, args: { path: 'test.txt', content: 'hello' } });
  });

  it('normalizes flat apply_patch to edits[]', () => {
    const result = repairToolCallArgs('apply_patch', { path: 'test.txt', old_string: 'old', new_string: 'new' });
    expect(result).toEqual({ ok: true, args: { edits: [{ path: 'test.txt', old_string: 'old', new_string: 'new' }] } });
  });

  it('passes through canonical apply_patch', () => {
    const args = { edits: [{ path: 'test.txt', old_string: 'old', new_string: 'new' }] };
    const result = repairToolCallArgs('apply_patch', args);
    expect(result).toEqual({ ok: true, args });
  });

  it('returns ok:false for missing path', () => {
    const result = repairToolCallArgs('write_file', { content: 'hello' });
    expect(result).toEqual({ ok: false, error: "'path' must be a non-empty string." });
  });

  it('defaults write_file content to empty string', () => {
    const result = repairToolCallArgs('write_file', { path: 'test.txt' });
    expect(result).toEqual({ ok: true, args: { path: 'test.txt', content: "" } });
  });
});