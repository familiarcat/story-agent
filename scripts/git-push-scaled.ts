#!/usr/bin/env tsx
/**
 * git-push-scaled — push with a timeout that SCALES with the size of the change being pushed, with
 * exponential-backoff retries (the repo's pushes hang intermittently on pack transfer; a fixed
 * timeout either gives up too early on a big push or wastes time on a small one).
 *
 * The heuristic (stored to RAG as `git-push-scaled-timeout` so any future push reuses it):
 *   base 45s + 1.5s/file + 0.05s/line changed, clamped to [45s, 600s], measured from the unpushed
 *   commits (origin/<branch>..HEAD). Retries 3× with 1.5× backoff on timeout/failure.
 *
 * Usage: npx tsx scripts/git-push-scaled.ts [remote] [branch]   (defaults: origin, current branch)
 */
import { execSync, spawn } from 'node:child_process';

function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

/** Size of the change about to be pushed → a scaled timeout in ms. */
export function scaledTimeoutMs(files: number, lines: number): number {
  const seconds = 45 + files * 1.5 + lines * 0.05;
  return Math.round(Math.min(600, Math.max(45, seconds)) * 1000);
}

function measureUnpushed(remote: string, branch: string): { files: number; lines: number; commits: number } {
  let range = `${remote}/${branch}..HEAD`;
  try { sh(`git rev-parse ${remote}/${branch}`); }
  catch { range = 'HEAD'; } // remote branch doesn't exist yet → measure the whole branch tip
  const stat = (() => { try { return sh(`git diff --shortstat ${range}`); } catch { return ''; } })();
  const files = Number(/(\d+) files? changed/.exec(stat)?.[1] ?? 0);
  const ins = Number(/(\d+) insertions?/.exec(stat)?.[1] ?? 0);
  const del = Number(/(\d+) deletions?/.exec(stat)?.[1] ?? 0);
  const commits = (() => { try { return Number(sh(`git rev-list --count ${range}`)); } catch { return 1; } })();
  return { files, lines: ins + del, commits };
}

/**
 * One push attempt. `resilient` disables delta-base search (pack.window/depth=0, single-threaded):
 * the repo's real push hangs were NOT network — they were git stalling in "Counting objects" while
 * scanning a CORRUPT delta-base candidate object (left by an earlier SIGKILLed push). window=0 skips
 * that scan entirely. The first attempt runs normally (best compression); retries go resilient.
 * NOTE: never SIGKILL a `git push` — that is what corrupts the object store in the first place; we
 * SIGTERM and let git unwind. If a 174MB-sparse pack-*.pack with a tiny .idx appears, `rm` it
 * (unlink — do NOT `mv` it to another filesystem, the corrupt read hangs).
 */
function pushOnce(remote: string, branch: string, timeoutMs: number, resilient: boolean): Promise<boolean> {
  const cfg = resilient ? ['-c', 'pack.window=0', '-c', 'pack.depth=0', '-c', 'pack.threads=1'] : [];
  return new Promise(resolve => {
    const p = spawn('git', [...cfg, 'push', remote, branch], { stdio: 'inherit' });
    const timer = setTimeout(() => { p.kill('SIGTERM'); resolve(false); }, timeoutMs);
    p.on('exit', code => { clearTimeout(timer); resolve(code === 0); });
    p.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

async function main() {
  const remote = process.argv[2] || 'origin';
  const branch = process.argv[3] || sh('git rev-parse --abbrev-ref HEAD');
  const { files, lines, commits } = measureUnpushed(remote, branch);
  if (commits === 0) { console.log(`Nothing to push (${remote}/${branch} up to date).`); return; }

  let timeout = scaledTimeoutMs(files, lines);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resilient = attempt > 1; // attempt 1 = best compression; retries skip delta-search (corrupt-object-safe)
    console.log(`[git-push-scaled] ${commits} commit(s), ${files} files, ${lines} lines → timeout ${Math.round(timeout / 1000)}s (attempt ${attempt}/3${resilient ? ', resilient/no-delta' : ''})`);
    if (await pushOnce(remote, branch, timeout, resilient)) { console.log('[git-push-scaled] ✓ pushed'); return; }
    console.log('[git-push-scaled] timed out / failed; backing off…');
    timeout = Math.min(600_000, Math.round(timeout * 1.5));
  }
  console.error('[git-push-scaled] ✗ all attempts exhausted — check for a corrupt local object/pack (see header)');
  process.exit(1);
}

main().catch(e => { console.error('[git-push-scaled] error', e?.message || e); process.exit(1); });
