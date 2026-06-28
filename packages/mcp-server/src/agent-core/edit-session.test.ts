import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { EditSession, targetPaths, MUTATING_TOOLS } from './edit-session.js';

describe('edit-session (multi-file reliability snapshot/rollback)', () => {
  let ws: string;
  beforeEach(async () => { ws = await fs.mkdtemp(path.join(os.tmpdir(), 'edit-session-')); });
  afterEach(async () => { await fs.rm(ws, { recursive: true, force: true }); });

  it('targetPaths extracts paths per tool shape', () => {
    expect(targetPaths('write_file', { path: 'a.ts' })).toEqual(['a.ts']);
    expect(targetPaths('edit_file', { path: 'b.ts' })).toEqual(['b.ts']);
    expect(targetPaths('apply_patch', { edits: [{ path: 'c.ts' }, { path: 'd.ts' }] })).toEqual(['c.ts', 'd.ts']);
    expect(targetPaths('read_file', { path: 'x.ts' })).toEqual([]); // non-mutating handled by caller
  });

  it('the mutating-tool set is the three writers', () => {
    expect([...MUTATING_TOOLS].sort()).toEqual(['apply_patch', 'edit_file', 'write_file']);
  });

  it('rollback restores an edited file to its ORIGINAL content', async () => {
    const f = path.join(ws, 'src.ts');
    await fs.writeFile(f, 'original\n', 'utf8');
    const s = new EditSession(ws);
    await s.snapshotForTool('edit_file', { path: 'src.ts' }); // captures "original"
    await fs.writeFile(f, 'BROKEN EDIT\n', 'utf8');           // simulate the loop's edit
    expect(s.hasChanges()).toBe(true);
    const n = await s.rollback();
    expect(n).toBe(1);
    expect(await fs.readFile(f, 'utf8')).toBe('original\n');
  });

  it('rollback DELETES a file that did not exist before (snapshot = null)', async () => {
    const s = new EditSession(ws);
    await s.snapshotForTool('write_file', { path: 'new.ts' }); // file absent → null snapshot
    await fs.writeFile(path.join(ws, 'new.ts'), 'created by agent\n', 'utf8');
    await s.rollback();
    await expect(fs.access(path.join(ws, 'new.ts'))).rejects.toBeTruthy();
  });

  it('snapshots are differential — one original kept per path despite repeated edits', async () => {
    const f = path.join(ws, 'x.ts');
    await fs.writeFile(f, 'v1\n', 'utf8');
    const s = new EditSession(ws);
    await s.snapshotForTool('edit_file', { path: 'x.ts' });
    await fs.writeFile(f, 'v2\n', 'utf8');
    await s.snapshotForTool('edit_file', { path: 'x.ts' }); // must NOT overwrite the v1 snapshot
    await s.rollback();
    expect(await fs.readFile(f, 'utf8')).toBe('v1\n');
  });

  it('ignores paths that escape the workspace', async () => {
    const s = new EditSession(ws);
    await s.snapshotForTool('write_file', { path: '../../etc/passwd' });
    expect(s.hasChanges()).toBe(false);
  });
});
