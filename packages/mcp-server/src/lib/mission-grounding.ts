import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface MissionGroundingReport {
  verified: boolean;
  unknownPaths: string[];
}

const PATH_REFERENCE = /`((?:\.?\.?\/)?[\w@./-]+\.(?:[a-z]+|json|ya?ml|md))`/gi;

function findWorkspaceRoot(start: string): string {
  let directory = resolve(start);
  while (directory !== dirname(directory)) {
    if (existsSync(resolve(directory, 'pnpm-workspace.yaml'))) return directory;
    directory = dirname(directory);
  }
  return resolve(start);
}

/**
 * Checks explicit file references in model output against the workspace. This is deliberately
 * conservative: an unknown reference does not fail the mission, but it prevents the plan from
 * being represented as an approved, reusable RAG decision.
 */
export function validateMissionGrounding(text: string, workspace = process.cwd()): MissionGroundingReport {
  const unknownPaths = new Set<string>();
  const workspaceRoot = findWorkspaceRoot(workspace);

  for (const match of text.matchAll(PATH_REFERENCE)) {
    const reference = match[1];
    if (!existsSync(resolve(workspaceRoot, reference))) unknownPaths.add(reference);
  }

  return { verified: unknownPaths.size === 0, unknownPaths: [...unknownPaths] };
}