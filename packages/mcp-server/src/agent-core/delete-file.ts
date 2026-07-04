/**
 * Governed delete_file capability for the agent-core loop (completes CRUD).
 *
 * This is the delete verb of CRUD, governed (confirm + workspace clamp + trash backup)
 * so chat-driven deletes are safe and reversible.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { isInsideWorkspace } from './worfgate-local.js';

export const deleteFileTool = {
  name: 'delete_file',
  description: 'Delete a file from the workspace with backup to .crew/trash. Requires confirm:true to proceed.',
  schema: z.object({
    path: z.string().describe('Path to the file to delete, relative to the workspace root or absolute within it.'),
    confirm: z.boolean().optional().describe('Must be true to actually delete the file (otherwise dry-run).'),
  }),
  handler: async (args: Record<string, unknown>, ctx: { workspace: string }) => {
    const resolvedPath = path.resolve(ctx.workspace, String(args.path));

    // Validate the path is inside the workspace
    if (!isInsideWorkspace(resolvedPath, ctx.workspace)) {
      return `error: refusing to delete outside the workspace`;
    }

    // Check if the file exists
    try {
      await fs.access(resolvedPath);
    } catch (e) {
      return `error: no such file: ${args.path}`;
    }

    // Handle dry-run mode
    if (args.confirm !== true) {
      return `dry-run: would delete ${args.path} (backed up to .crew/trash) — re-call with confirm:true`;
    }

    // Prepare the trash directory
    const trashDir = path.resolve(ctx.workspace, '.crew/trash');
    try {
      await fs.mkdir(trashDir, { recursive: true });
    } catch (e) {
      return `error: failed to create trash directory: ${(e as Error).message}`;
    }

    // Move the file to trash
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basename = path.basename(resolvedPath);
    const trashPath = path.resolve(trashDir, `${timestamp}-${basename}`);

    try {
      await fs.rename(resolvedPath, trashPath);
      return `deleted ${args.path} (backup: .crew/trash/${timestamp}-${basename})`;
    } catch (e) {
      return `error: failed to delete ${args.path}: ${(e as Error).message} (backup not attempted)`;
    }
  },
};
