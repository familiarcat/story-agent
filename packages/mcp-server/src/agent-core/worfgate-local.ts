/**
 * WorfGate — Local Operations Governor (green / yellow / red tiers).
 *
 * Per the Observation Lounge unification ruling (Worf): the gate ENABLES speed rather than
 * impeding it. Capabilities are open; the gate governs and AUTONOMOUSLY REMEDIATES rather than
 * hard-blocking. Three tiers:
 *
 *   green  — pre-authorized, zero-latency (reads, search, git status/diff/log). Proceed.
 *   yellow — mutating but bounded (file writes/edits, safe shell). Auto-remediate args, proceed.
 *   red    — high blast radius (rm -rf, writes/shell outside the workspace, secret access,
 *            force-push, network exfil). Remediate if possible; otherwise escalate.
 *
 * Remediation modifies the operation to a safe form (clamps paths into the workspace, strips
 * dangerous flags) and lets it continue — only genuinely unrecoverable actions escalate.
 */
import path from 'path';

export type WorfTier = 'green' | 'yellow' | 'red';

export interface LocalGateResult {
  tier: WorfTier;
  /** Final (possibly remediated) arguments to execute with. */
  args: Record<string, unknown>;
  /** True when the op may proceed autonomously (green/yellow, or red successfully remediated). */
  proceed: boolean;
  reasons: string[];
  /** What the gate changed, if anything (for the audit trail + lounge narration). */
  remediations: string[];
}

const GREEN_TOOLS = new Set(['read_file', 'list_dir', 'search_code', 'git_status', 'git_diff', 'rag_recall', 'crew_deliberate']);
const YELLOW_TOOLS = new Set(['write_file', 'edit_file', 'apply_patch', 'run_shell']);

// Shell patterns that are irreversibly destructive at scale → red unless remediated away.
const RED_SHELL = [
  /\brm\s+-rf?\s+\/(?:\s|$)/, // rm -rf /
  /\brm\s+-rf?\s+~(?:\s|$)/, // rm -rf ~
  /\bgit\s+push\s+.*--force\b/, /\bgit\s+push\s+.*-f\b/,
  /\bmkfs\b/, /\bdd\s+if=/, /:\(\)\s*\{.*\}\s*;/, // fork bomb
  /\b(curl|wget)\b[^|]*\|\s*(sh|bash|zsh)\b/, // pipe-to-shell remote exec
  /\bchmod\s+-R\s+777\s+\//,
];

// Sensitive paths/strings the gate refuses to read or exfiltrate even in green/yellow.
const SECRET_HINTS = [/\.alexai-secrets/, /\.ssh\//, /id_rsa/, /\.aws\/credentials/, /\.env(\.|$)/, /api-keys\.env/, /\.zshrc/, /\.zshenv/];

/** True if a path is a sensitive/secret location (shared classifier — reused by the change-request gate). */
export function isSensitivePath(p: string): boolean {
  return SECRET_HINTS.some((re) => re.test(p));
}

/** True if a path resolves INSIDE the workspace (out-of-workspace writes are high-blast-radius = red). */
export function isInsideWorkspace(p: string, workspace: string = process.env.STORY_AGENT_WORKSPACE || process.cwd()): boolean {
  const root = path.resolve(workspace);
  const resolved = path.resolve(root, p);
  return resolved === root || resolved.startsWith(root + path.sep);
}

/** Clamp a path argument into the workspace; returns {value, changed}. */
function clampPath(p: string, workspace: string): { value: string; changed: boolean } {
  const root = path.resolve(workspace);
  const resolved = path.resolve(root, p);
  if (resolved === root || resolved.startsWith(root + path.sep)) {
    return { value: resolved, changed: resolved !== p && p !== path.relative(root, resolved) };
  }
  // Outside the workspace → remediate by re-rooting the basename inside the workspace.
  const safe = path.join(root, path.basename(resolved));
  return { value: safe, changed: true };
}

/**
 * Classify and remediate a local tool invocation. Pure + synchronous so it can run in the
 * tool-execution hot path without blocking.
 */
export function gateLocalOp(
  tool: string,
  rawArgs: Record<string, unknown>,
  workspace: string = process.env.STORY_AGENT_WORKSPACE || process.cwd(),
): LocalGateResult {
  const args = { ...rawArgs };
  const reasons: string[] = [];
  const remediations: string[] = [];

  // ── Path-bearing tools: clamp into the workspace + refuse secret reads. ──
  for (const key of ['path', 'file_path', 'dir', 'directory']) {
    const v = args[key];
    if (typeof v === 'string' && v.length) {
      if (SECRET_HINTS.some(re => re.test(v))) {
        reasons.push(`refusing secret-bearing path: ${v}`);
        return { tier: 'red', args, proceed: false, reasons, remediations };
      }
      const { value, changed } = clampPath(v, workspace);
      if (changed) {
        args[key] = value;
        remediations.push(`clamped ${key} into workspace → ${value}`);
      } else {
        args[key] = value;
      }
    }
  }

  if (GREEN_TOOLS.has(tool)) {
    return { tier: 'green', args, proceed: true, reasons: ['pre-authorized read/inspect'], remediations };
  }

  if (tool === 'run_shell') {
    const cmd = String(args.command ?? '');
    if (SECRET_HINTS.some(re => re.test(cmd))) {
      reasons.push('command references secret material');
      return { tier: 'red', args, proceed: false, reasons, remediations };
    }
    if (RED_SHELL.some(re => re.test(cmd))) {
      reasons.push(`destructive command pattern: ${cmd}`);
      // Irreversible — cannot be safely remediated; escalate.
      return { tier: 'red', args, proceed: false, reasons, remediations };
    }
    // Strip a force-push flag if it slipped through softer forms, then proceed.
    if (/\bgit\s+push\b/.test(cmd) && /(--force-with-lease)/.test(cmd) === false && /(--force|-f)\b/.test(cmd)) {
      args.command = cmd.replace(/\s--force\b/g, ' --force-with-lease').replace(/\s-f\b/g, ' --force-with-lease');
      remediations.push('downgraded git push --force → --force-with-lease');
    }
    return { tier: 'yellow', args, proceed: true, reasons: ['bounded shell execution'], remediations };
  }

  if (YELLOW_TOOLS.has(tool)) {
    return { tier: 'yellow', args, proceed: true, reasons: ['bounded mutation'], remediations };
  }

  // Unknown/unclassified tool → deny-by-default (red, withhold) and escalate for review, rather
  // than auto-running as a bounded mutation. A browser-driven request can name a tool the governor
  // doesn't recognize; defaulting such tools to yellow would let an unvetted op proceed. Worf's
  // security review (docs/security/browser-agent-review-2026-06-26.md, finding #3) requires explicit
  // classification before an op runs.
  return { tier: 'red', args, proceed: false, reasons: [`unclassified tool ${tool} — defaulting to red (deny-by-default)`], remediations };
}
