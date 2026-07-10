/**
 * Story lifecycle automation — keeps git and Aha! in lockstep. startStoryWithBranch() creates an Aha
 * story (via the governed executeAhaStoryWithMemory: gated, audited, RAG-remembered) AND its matching
 * git branch (story/<REF>-<slug>, created from main WITHOUT switching the working tree, never force),
 * so every story coincides with a branch. The first step of the crew's branch lifecycle (RAG
 * git-aha-branching): story → branch → (PR link) → (merge: status done + delete branch).
 */
import { execSync } from 'node:child_process';
import { executeAhaStoryWithMemory } from './crew-aha-mission.js';
import { ahaRefToBranchName, slugify } from './git-aha-branching.js';
import { linkAhaStoryToPR, updateAhaStoryStatus } from './aha.js';
// cross-surface sync (AHA-SYNC-TIERS)
import { emitAhaEventSafe } from '@story-agent/shared/aha-events';

export interface StartStoryResult {
  dryRun?: boolean;
  ahaRef?: string;
  branch?: string;
  branchCreated?: boolean;
  pushed?: boolean;
  note?: string;
  ahaAudit?: unknown;
}

export interface LinkStoryToPRResult {
  dryRun?: boolean;
  ref: string;
  prUrl: string;
  linked?: boolean;
}

export interface CompleteStoryResult {
  dryRun?: boolean;
  ref: string;
  branch: string;
  completed?: boolean;
  deleted?: boolean;
}

/** Create an Aha story + its matching git branch (in sync). Dry-run unless confirm:true. */
export async function startStoryWithBranch(input: {
  name: string;
  description?: string;
  releaseId: string;
  executor?: string;
  clientId?: string | null;
  confirm?: boolean;
  push?: boolean;
  cwd?: string;
}): Promise<StartStoryResult> {
  const executor = input.executor ?? 'riker';
  if (input.confirm !== true) {
    return {
      dryRun: true,
      branch: `story/<REF>-${slugify(input.name)}`,
      note: `Would create Aha story "${input.name}" in release ${input.releaseId} (via ${executor}) + a matching branch from main. Re-call with confirm:true.`,
    };
  }

  // 1. Create the Aha story (gated, audited, RAG-remembered).
  const aha = await executeAhaStoryWithMemory({
    story: { name: input.name, description: input.description },
    executor,
    releaseId: input.releaseId,
    clientId: input.clientId ?? null,
    confirm: true,
  });
  const ref = (aha as { ahaRef?: string }).ahaRef;
  if (!ref) return { note: 'Aha create returned no reference', ahaAudit: (aha as { audit?: unknown }).audit };

  // 2. Derive the matching branch + 3. create it from main WITHOUT switching (non-disruptive, never force).
  const branch = ahaRefToBranchName({ ref, name: input.name, kind: 'story' });
  const cwd = input.cwd ?? process.cwd();
  let branchCreated = false;
  let pushed = false;
  let note = '';
  try {
    execSync(`git branch ${branch} main`, { cwd, stdio: 'pipe' });
    branchCreated = true;
    if (input.push) {
      execSync(`git push -u origin ${branch}`, { cwd, stdio: 'pipe' });
      pushed = true;
    }
  } catch (e) {
    note = `branch op: ${e instanceof Error ? e.message : String(e)}`;
  }

  return { ahaRef: ref, branch, branchCreated, pushed, note, ahaAudit: (aha as { audit?: unknown }).audit };
}

/** Link an Aha story to its PR and move it to code review (gated). */
export async function linkStoryToPR(input: {
  ref: string;
  prUrl: string;
  prTitle: string;
  confirm?: boolean;
}): Promise<LinkStoryToPRResult> {
  if (input.confirm !== true) {
    return { dryRun: true, ref: input.ref, prUrl: input.prUrl };
  }

  await linkAhaStoryToPR(input.ref, input.prUrl, input.prTitle);
  await updateAhaStoryStatus(input.ref, 'In code review');
  void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: 'linked', resourceId: input.ref });
  void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: 'status_changed', resourceId: input.ref, meta: { status_to: 'In code review' } });
  return { ref: input.ref, prUrl: input.prUrl, linked: true };
}

/** Mark an Aha story shipped and delete its branch on merge (gated; never main). */
export async function completeStory(input: {
  ref: string;
  branch: string;
  confirm?: boolean;
  cwd?: string;
}): Promise<CompleteStoryResult> {
  if (input.branch === 'main') throw new Error('refuse to operate on main');
  if (input.confirm !== true) {
    return { dryRun: true, ref: input.ref, branch: input.branch };
  }

  await updateAhaStoryStatus(input.ref, 'Shipped');
  void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: 'status_changed', resourceId: input.ref, meta: { status_to: 'Shipped' } });
  let deleted = false;
  try {
    execSync('git branch -d ' + input.branch, { cwd: input.cwd ?? process.cwd(), stdio: 'pipe' });
    execSync('git push origin --delete ' + input.branch, { cwd: input.cwd ?? process.cwd(), stdio: 'pipe' });
    deleted = true;
  } catch (e) {}
  return { ref: input.ref, branch: input.branch, completed: true, deleted };
}