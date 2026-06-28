/**
 * Multi-file edit reliability (crew mission `multifile-reliability-spec`, OBS 8af6c754 — Data + Geordi):
 * the agent-core loop drifts on complex multi-file edits (dup/missing imports → broken build) — the
 * single gap the crew named before Story Agent can be our primary code assistant. This module gives the
 * loop a safety net so a multi-file task never FINISHES in a broken-build state:
 *
 *   1. SNAPSHOT — before the first mutation to a file, capture its original content (differential:
 *      only touched files; in-memory; null = file didn't exist). WorfGate already clamps paths into
 *      the workspace, so snapshots/rollback stay inside it.
 *   2. VERIFY  — after edits, run a SCOPED `tsc --noEmit` over the impacted package(s) only (cheap).
 *   3. ROLLBACK — if still broken after the loop's self-correction retries, restore the snapshots.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const pexec = promisify(execFile);

/** Tools that mutate files — the loop snapshots their targets before they run. */
export const MUTATING_TOOLS = new Set(['write_file', 'edit_file', 'apply_patch']);

/** Cap retained snapshot bytes per session (Yar: bound memory). Beyond this, stop snapshotting. */
const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;

/** Extract the file path(s) a mutating tool will touch from its (gate-clamped) args. */
export function targetPaths(toolName: string, args: Record<string, unknown>): string[] {
  if (toolName === 'apply_patch') {
    const edits = Array.isArray(args.edits) ? args.edits : [];
    return edits.map((e: any) => String(e?.path)).filter(Boolean);
  }
  if (toolName === 'write_file' || toolName === 'edit_file') {
    return args.path ? [String(args.path)] : [];
  }
  return [];
}

export class EditSession {
  /** abs path → original content (or null if the file did not exist before the first edit). */
  private snapshots = new Map<string, string | null>();
  private bytes = 0;
  private capped = false;

  constructor(private readonly workspace: string) {}

  /** Snapshot the original content of every file a mutating tool is about to touch (once per path). */
  async snapshotForTool(toolName: string, args: Record<string, unknown>): Promise<void> {
    if (!MUTATING_TOOLS.has(toolName) || this.capped) return;
    const root = path.resolve(this.workspace);
    for (const rel of targetPaths(toolName, args)) {
      const abs = path.resolve(root, rel);
      if (abs !== root && !abs.startsWith(root + path.sep)) continue; // stay in workspace
      if (this.snapshots.has(abs)) continue;
      try {
        const content = await fs.readFile(abs, 'utf8');
        this.bytes += Buffer.byteLength(content);
        this.snapshots.set(abs, content);
        if (this.bytes > MAX_SNAPSHOT_BYTES) { this.capped = true; return; }
      } catch {
        this.snapshots.set(abs, null); // file did not exist → rollback deletes it
      }
    }
  }

  hasChanges(): boolean {
    return this.snapshots.size > 0;
  }

  /** Absolute paths touched this session. */
  touched(): string[] {
    return [...this.snapshots.keys()];
  }

  /** Restore every touched file to its snapshot (delete files that didn't exist before). Returns count. */
  async rollback(): Promise<number> {
    let n = 0;
    for (const [abs, original] of this.snapshots) {
      try {
        if (original === null) { await fs.rm(abs, { force: true }); n++; }
        else { await fs.writeFile(abs, original, 'utf8'); n++; }
      } catch { /* best-effort restore */ }
    }
    return n;
  }
}

/** The packages a set of touched files belong to (…/packages/<pkg>/…), each with a tsconfig to check. */
async function impactedPackages(workspace: string, touched: string[]): Promise<string[]> {
  const root = path.resolve(workspace);
  const pkgs = new Set<string>();
  for (const abs of touched) {
    const rel = path.relative(root, abs);
    const m = rel.match(/^packages[\\/]([^\\/]+)[\\/]/);
    if (m) pkgs.add(path.join(root, 'packages', m[1]));
  }
  const withTsconfig: string[] = [];
  for (const dir of pkgs) {
    try { await fs.access(path.join(dir, 'tsconfig.json')); withTsconfig.push(dir); } catch { /* no tsconfig → skip */ }
  }
  return withTsconfig;
}

/** A tsc diagnostic line: `relative/path.ts(line,col): error TSxxxx: ...`. Capture the file path. */
const TSC_ERROR_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+TS\d+:/;

/**
 * Scoped verification: `tsc --noEmit` in each impacted package, but report ONLY errors in the files
 * the agent actually TOUCHED — not the package's PRE-EXISTING errors (e.g. test files missing
 * @types). Otherwise the loop chases noise it didn't cause (observed live). This answers the real
 * question — "did MY multi-file edit break a file I edited?" — which catches the dominant failure
 * mode (dup/missing imports in the edited files). Cheap (one no-emit pass per impacted package).
 *
 * Known limitation: an edit that breaks an UNTOUCHED importer is not caught here (a future
 * baseline-diff could). Returns ok=true when nothing typecheckable was touched.
 */
export async function verifyTouched(workspace: string, touched: string[]): Promise<{ ok: boolean; output: string }> {
  const dirs = await impactedPackages(workspace, touched);
  if (!dirs.length) return { ok: true, output: '' };
  const touchedSet = new Set(touched.map(p => path.resolve(p)));
  const failures: string[] = [];
  for (const dir of dirs) {
    let raw = '';
    try {
      await pexec('npx', ['tsc', '--noEmit'], { cwd: dir, timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
      continue; // clean typecheck for this package
    } catch (e: any) {
      raw = `${e?.stdout || ''}\n${e?.stderr || ''}`;
    }
    // Keep only diagnostics whose file is one the agent touched (paths are relative to the package dir).
    const mine = raw.split(/\r?\n/).filter(line => {
      const m = TSC_ERROR_RE.exec(line.trim());
      if (!m) return false;
      return touchedSet.has(path.resolve(dir, m[1].trim()));
    });
    if (mine.length) failures.push(`# ${path.basename(dir)} — errors in your edited files:\n${mine.join('\n').slice(0, 4000)}`);
  }
  return failures.length ? { ok: false, output: failures.join('\n\n') } : { ok: true, output: '' };
}
