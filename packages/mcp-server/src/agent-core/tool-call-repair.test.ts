import { describe, it, expect } from 'vitest';
import {
  repairToolCallArgs,
  escapeControlCharsInStrings,
  salvageWriteFileArgs,
} from './tool-call-repair.js';

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

// ── Regression: the malformation that lost FOUR consecutive write_file calls ──────────────────────
// A tier-3 model asked to write a whole source file emitted stringified JSON whose `content` held RAW
// newlines. Plain JSON.parse throws on a literal newline inside a string literal, so the entire call
// was discarded — four times in a row, leaving a half-applied change set (an import pointing at a file
// that was never created). This is the multi-file-edit unreliability that forces a premium
// orchestrator to finish the job, so it is worth repairing rather than working around.
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);
const BELL = String.fromCharCode(7);

describe('repairToolCallArgs — stringified JSON containing raw control characters', () => {
  it('recovers a write_file whose content has literal newlines', () => {
    const raw = `{"path":"src/a.ts","content":"line one${NL}line two${NL}line three"}`;
    const r = repairToolCallArgs('write_file', raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.args.path).toBe('src/a.ts');
      expect(r.args.content).toBe(`line one${NL}line two${NL}line three`);
    }
  });

  it('recovers content containing tabs and carriage returns', () => {
    const raw = `{"path":"a.ts","content":"if (x) {${CR}${NL}${TAB}doThing();${CR}${NL}}"}`;
    const r = repairToolCallArgs('write_file', raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(String(r.args.content)).toContain(`${TAB}doThing();`);
  });

  it('still parses well-formed stringified JSON unchanged', () => {
    const r = repairToolCallArgs('write_file', '{"path":"a.ts","content":"line one\\nline two"}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.args.content).toBe(`line one${NL}line two`);
  });

  it('does not double-escape an already-escaped sequence', () => {
    // content should end up as:  regex: \n means newline<real newline>real break
    const raw = `{"path":"a.ts","content":"regex: \\\\n means newline${NL}real break"}`;
    const r = repairToolCallArgs('write_file', raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(String(r.args.content)).toContain('\\n means newline');
      expect(String(r.args.content)).toContain(`${NL}real break`);
    }
  });

  it('repairs a stringified apply_patch with raw newlines in its strings', () => {
    const raw = `{"edits":[{"path":"a.ts","old_string":"foo${NL}bar","new_string":"foo${NL}baz"}]}`;
    const r = repairToolCallArgs('apply_patch', raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.args.edits as any[])[0].new_string).toBe(`foo${NL}baz`);
  });

  it('leaves structural whitespace outside string literals alone', () => {
    const raw = `{${NL}  "path": "a.ts",${NL}  "content": "ok"${NL}}`;
    const r = repairToolCallArgs('write_file', raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.args.path).toBe('a.ts');
  });

  it('still rejects genuinely unrecoverable garbage', () => {
    expect(repairToolCallArgs('edit_file', 'not json at all {{{').ok).toBe(false);
  });
});

describe('escapeControlCharsInStrings', () => {
  it('escapes a newline inside a literal but not one outside', () => {
    expect(escapeControlCharsInStrings(`{"a":"x${NL}y"}${NL}`)).toBe(`{"a":"x\\ny"}${NL}`);
  });

  it('honours backslash escapes so an escaped quote does not flip string state', () => {
    const out = escapeControlCharsInStrings(`{"a":"he said \\"hi\\"${NL}bye"}`);
    expect(out).toContain('\\n');
    expect(out).toContain('\\"hi\\"');
  });

  it('escapes other C0 control characters as unicode', () => {
    expect(escapeControlCharsInStrings(`{"a":"x${BELL}y"}`)).toBe('{"a":"x\\u0007y"}');
  });

  it('is a no-op on already-valid JSON', () => {
    expect(escapeControlCharsInStrings('{"a":"b"}')).toBe('{"a":"b"}');
  });
});

describe('salvageWriteFileArgs', () => {
  it('extracts path and content when the JSON cannot be parsed at all', () => {
    const s = salvageWriteFileArgs('{"path":"a.ts","content":"body "quoted" here"}');
    expect(s?.path).toBe('a.ts');
    expect(s?.content).toContain('body');
  });

  it('returns null when there is no path key', () => {
    expect(salvageWriteFileArgs('{"content":"x"}')).toBeNull();
  });

  it('returns null when there is no content key', () => {
    expect(salvageWriteFileArgs('{"path":"a.ts"}')).toBeNull();
  });
});
