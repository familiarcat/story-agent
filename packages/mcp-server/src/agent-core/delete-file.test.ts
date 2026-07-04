import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { deleteFileTool } from './delete-file.js';

describe('deleteFileTool', () => {
  const workspace = process.cwd();
  const tempDir = path.join(workspace, 'temp-test-delete-file');

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return a dry-run message when confirm is not true', async () => {
    const testFile = path.join(tempDir, 'test-file.txt');
    await fs.writeFile(testFile, 'test content');

    const result = await deleteFileTool.handler(
      { path: testFile },
      { workspace }
    );

    expect(result).toMatch(/dry-run: would delete/);
    await expect(fs.access(testFile)).resolves.toBeUndefined(); // File still exists
  });

  it('should refuse to delete outside the workspace', async () => {
    const result = await deleteFileTool.handler(
      { path: '/etc/passwd' },
      { workspace }
    );

    expect(result).toBe('error: refusing to delete outside the workspace');
  });
});