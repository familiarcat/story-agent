/**
 * Publish precondition — machine ratification for the ONE publish op that has a checkable gate.
 *
 * WorfGate classifies publish/deploy ops as red (see worfgate-local.ts): they are irreversible from
 * the outside world's perspective and are not covered by the loop's file-snapshot rollback. The
 * operator's autonomy envelope nonetheless says "CI green on a PR you opened == ratified, merge it".
 *
 * `gateLocalOp` is pure and synchronous by design (it runs in the tool hot path), so it cannot ask
 * GitHub anything. This module is the async half: given a blocked `gh pr merge`, it asks whether CI
 * is genuinely green and returns a ratification decision. Only `pr-merge` is eligible — a deploy or
 * a migration has no equivalent machine-checkable precondition and stays human-ratified.
 *
 * FAIL CLOSED. Every uncertainty (gh missing, network error, unparseable output, no PR, pending
 * check, merge conflict, ZERO checks) resolves to "not ratified". A publish that proceeds because we
 * could not tell is the exact failure this gate exists to prevent.
 */
import { execFile } from 'node:child_process';
import { classifyPublishShell } from './worfgate-local.js';

export interface PublishRatification {
  ratified: boolean;
  /** Human-readable justification — surfaced in the gate event and the audit trail. */
  reason: string;
  /** Check names + conclusions consulted, when we got that far. */
  checks?: Array<{ name: string; conclusion: string }>;
}

/** Injectable `gh` runner so the decision logic is testable without a network or a real repo. */
export type GhRunner = (args: string[], cwd: string) => Promise<{ ok: boolean; stdout: string; stderr: string }>;

const defaultGh: GhRunner = (args, cwd) =>
  new Promise((resolve) => {
    // No shell: argv is passed directly, so a crafted command string cannot inject extra gh flags.
    execFile('gh', args, { cwd, timeout: 20_000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout ?? ''), stderr: String(stderr ?? err?.message ?? '') });
    });
  });

/** Conclusions that count as a passing check. GitHub reports skipped/neutral as non-failures. */
const PASSING = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED']);

/** Extract an explicit PR number from `gh pr merge 14 --squash`, if the command names one. */
export function parsePrNumber(command: string): string | null {
  const m = /\bgh\s+pr\s+merge\s+(\d+)\b/.exec(command);
  return m ? m[1] : null;
}

/**
 * Decide whether a red-gated publish command may proceed without a human.
 * Returns `ratified: false` for anything that is not a CI-checkable PR merge.
 */
export async function evaluatePublishPrecondition(opts: {
  command: string;
  workspace: string;
  gh?: GhRunner;
}): Promise<PublishRatification> {
  const { command, workspace } = opts;
  const gh = opts.gh ?? defaultGh;

  const publish = classifyPublishShell(command);
  if (!publish) {
    return { ratified: false, reason: 'not a publish operation — nothing to ratify' };
  }
  if (publish.kind !== 'pr-merge') {
    return {
      ratified: false,
      reason: `${publish.what} has no machine-checkable precondition — human ratification required`,
    };
  }

  const pr = parsePrNumber(command);
  const target = pr ?? '';
  const args = ['pr', 'view', ...(target ? [target] : []), '--json', 'number,state,mergeable,mergeStateStatus,statusCheckRollup'];

  let res: { ok: boolean; stdout: string; stderr: string };
  try {
    res = await gh(args, workspace);
  } catch (e: any) {
    return { ratified: false, reason: `could not query CI status (${e?.message ?? e}) — failing closed` };
  }
  if (!res.ok) {
    return { ratified: false, reason: `gh pr view failed (${res.stderr.trim().slice(0, 200)}) — failing closed` };
  }

  let data: any;
  try {
    data = JSON.parse(res.stdout);
  } catch {
    return { ratified: false, reason: 'could not parse gh output — failing closed' };
  }

  if (data?.state && data.state !== 'OPEN') {
    return { ratified: false, reason: `PR is ${data.state}, not OPEN — nothing to ratify` };
  }
  if (data?.mergeable && data.mergeable !== 'MERGEABLE') {
    return { ratified: false, reason: `PR is not mergeable (${data.mergeable}) — failing closed` };
  }

  const rollup: Array<any> = Array.isArray(data?.statusCheckRollup) ? data.statusCheckRollup : [];
  const checks = rollup
    .map((c) => ({
      name: String(c?.name ?? c?.context ?? 'unnamed'),
      conclusion: String(c?.conclusion ?? c?.state ?? '').toUpperCase(),
    }))
    // A null-named, null-conclusion entry is GitHub reporting "no checks yet", not a passing check.
    .filter((c) => c.name !== 'unnamed' || c.conclusion !== '');

  // ZERO checks is NOT green. This repo has already been bitten by exactly this: the ui-tests
  // workflow was invalid YAML, produced 0 jobs, and therefore reported nothing — which would read as
  // "all checks passed" to any naive all()-style test. Require positive evidence of a passing suite.
  if (checks.length === 0) {
    return {
      ratified: false,
      reason: 'no CI checks reported — an empty check set is not green (a broken workflow reports nothing); failing closed',
      checks,
    };
  }

  const unfinished = checks.filter((c) => c.conclusion === '' || c.conclusion === 'PENDING' || c.conclusion === 'IN_PROGRESS' || c.conclusion === 'QUEUED');
  if (unfinished.length) {
    return {
      ratified: false,
      reason: `${unfinished.length} check(s) still running (${unfinished.map((c) => c.name).join(', ')}) — not ratified yet`,
      checks,
    };
  }

  const failing = checks.filter((c) => !PASSING.has(c.conclusion));
  if (failing.length) {
    return {
      ratified: false,
      reason: `${failing.length} check(s) not passing: ${failing.map((c) => `${c.name}=${c.conclusion}`).join(', ')}`,
      checks,
    };
  }

  return {
    ratified: true,
    reason: `CI green — ${checks.length} check(s) passing (${checks.map((c) => c.name).join(', ')}); ratified per the autonomy envelope`,
    checks,
  };
}
