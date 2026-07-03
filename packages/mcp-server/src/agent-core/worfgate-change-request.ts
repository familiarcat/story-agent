/**
 * WorfGate change-request — governed READ/WRITE that "requests a change first, then makes it."
 *
 * Crew-designed (Observation Lounge): give WorfGate write capability WITHOUT losing the gate. It
 * REUSES the existing governor + approval channel (no parallel machinery):
 *   • gateLocalOp  — tier classification (green/yellow for in-workspace code).
 *   • isSensitivePath / isInsideWorkspace — sensitive or out-of-workspace ⇒ red.
 *   • awaitApproval/resolveApproval — the request→approve→apply channel (Redis/in-proc).
 *
 * Flow: requestWorfGateChange() PROPOSES (audited, no content logged) → applyWorfGateChange() writes
 *   - green/yellow (in-workspace code): applies immediately (bounded mutation).
 *   - red / SENSITIVE (~/.zshrc, ~/.alexai-secrets, out-of-workspace): applies ONLY after an explicit
 *     recorded approval — the break-glass. The file is BACKED UP first; the content is NEVER logged.
 *
 * INVARIANT: nothing sensitive is written without an explicit recorded approval.
 */
import { writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { gateLocalOp, isSensitivePath, isInsideWorkspace, type WorfTier } from './worfgate-local.js';
import { awaitApproval } from './approval-registry.js';

type Decision = 'approve' | 'deny';

export interface ChangeRequest {
  id: string;
  path: string;
  description: string;
  crewId: string;
  tier: WorfTier;
  sensitive: boolean;
  needsApproval: boolean;
  status: 'requested' | 'applied' | 'refused';
  createdAt: string;
}

interface ChangeAuditEntry {
  ts: string; id: string; path: string; crewId: string; tier: WorfTier; sensitive: boolean;
  event: 'request' | 'apply' | 'refuse'; decision?: Decision;
}

const auditLog: ChangeAuditEntry[] = [];
const AUDIT_MAX = 500;
let seq = 0;

function audit(e: ChangeAuditEntry): void {
  auditLog.push(e);
  if (auditLog.length > AUDIT_MAX) auditLog.splice(0, auditLog.length - AUDIT_MAX);
}

/** The change-request audit trail — paths + decisions only, NEVER file content or secret values. */
export function getChangeAuditLog(): ChangeAuditEntry[] {
  return [...auditLog];
}

// ── Pending-request registry (so MCP `request` + `apply` can span separate tool calls) ──
const pending = new Map<string, { req: ChangeRequest; content: string }>();

/** Stash a proposed change + its content so a later apply call can retrieve it by id. */
export function stashChange(req: ChangeRequest, content: string): void {
  pending.set(req.id, { req, content });
}
/** Retrieve a stashed change by id (content included — caller must not log it). */
export function getPendingChange(id: string): { req: ChangeRequest; content: string } | undefined {
  return pending.get(id);
}
/** List still-open (requested) changes — the review queue. No content. */
export function listPendingChanges(): ChangeRequest[] {
  return [...pending.values()].map((x) => x.req).filter((r) => r.status === 'requested');
}

/** PROPOSE a change. Classifies tier + whether approval is required. Writes nothing. */
export function requestWorfGateChange(input: {
  path: string; description: string; crewId: string; workspace?: string; nowIso?: string;
}): ChangeRequest {
  const workspace = input.workspace || process.env.STORY_AGENT_WORKSPACE || process.cwd();
  const sensitive = isSensitivePath(input.path) || !isInsideWorkspace(input.path, workspace);
  const tier: WorfTier = sensitive ? 'red' : gateLocalOp('write_file', { path: input.path }, workspace).tier;
  const needsApproval = sensitive || tier === 'red';
  const now = input.nowIso ?? new Date().toISOString();
  const req: ChangeRequest = {
    id: `chg_${now.replace(/[^0-9]/g, '').slice(0, 14)}_${seq++}`,
    path: input.path, description: input.description, crewId: input.crewId,
    tier, sensitive, needsApproval, status: 'requested', createdAt: now,
  };
  audit({ ts: now, id: req.id, path: req.path, crewId: req.crewId, tier, sensitive, event: 'request' });
  return req;
}

/**
 * APPLY a requested change. green/yellow apply immediately; red/sensitive apply ONLY on an explicit
 * approval (opts.decision, or awaited via the approval registry). Backs up an existing file first.
 * Content is written but NEVER logged.
 */
export async function applyWorfGateChange(
  req: ChangeRequest,
  content: string,
  opts: { decision?: Decision; approvalTimeoutMs?: number } = {},
): Promise<{ applied: boolean; reason: string; backup?: string }> {
  const now = new Date().toISOString();
  if (req.status !== 'requested') return { applied: false, reason: `request ${req.id} already ${req.status}` };

  if (req.needsApproval) {
    const decision = opts.decision ?? (await awaitApproval(req.id, opts.approvalTimeoutMs ?? 120_000));
    if (decision !== 'approve') {
      req.status = 'refused';
      audit({ ts: now, id: req.id, path: req.path, crewId: req.crewId, tier: req.tier, sensitive: req.sensitive, event: 'refuse', decision });
      return { applied: false, reason: `approval '${decision}' — change not applied` };
    }
  }

  let backup: string | undefined;
  try {
    if (existsSync(req.path)) { backup = `${req.path}.bak.${Date.now()}`; copyFileSync(req.path, backup); }
  } catch { /* best-effort backup; proceed */ }

  writeFileSync(req.path, content);
  req.status = 'applied';
  audit({ ts: now, id: req.id, path: req.path, crewId: req.crewId, tier: req.tier, sensitive: req.sensitive, event: 'apply', decision: req.needsApproval ? 'approve' : undefined });
  return { applied: true, reason: req.needsApproval ? 'applied after explicit approval' : `applied (${req.tier}, bounded)`, backup };
}
