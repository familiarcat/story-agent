import { createHash } from 'crypto';
import { getDbClient } from '../../../shared/src/db.js';

type WorfGateTarget = 'github' | 'aha' | 'approved_llm' | 'supabase' | 'other';

export interface WorfGateDecision {
  allowed: boolean;
  reasons: string[];
  detectedMarkers: string[];
}

export interface WorfGateAuditEntry {
  timestamp: string;
  operation: string;
  target: WorfGateTarget;
  repoFullName: string | null;
  allowed: boolean;
  reasons: string[];
  detectedMarkers: string[];
  payloadHash: string;
}

const WORFGATE_AUDIT_MAX = parseInt(process.env.WORFGATE_AUDIT_MAX ?? '500', 10);
const worfGateAuditLog: WorfGateAuditEntry[] = [];

const DEFAULT_CONTROLLED_MARKERS = [
  'bayer',
  'confidential',
  'internal use only',
  'regulated',
  'customer data',
  'patient',
  'phi',
  'pii',
  'secret',
  'proprietary',
];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function detectControlledMarkers(text: string): string[] {
  const custom = parseCsv(process.env.WORFGATE_CONTROLLED_MARKERS);
  const markers = custom.length > 0 ? custom : DEFAULT_CONTROLLED_MARKERS;
  const lower = text.toLowerCase();

  return markers.filter(marker => lower.includes(marker.toLowerCase()));
}

function isEnforced(): boolean {
  return (process.env.WORFGATE_ENFORCE ?? 'true').toLowerCase() === 'true';
}

function allowControlledData(): boolean {
  return (process.env.WORFGATE_ALLOW_CONTROLLED ?? 'false').toLowerCase() === 'true';
}

function allowedGithubOrgs(): string[] {
  return parseCsv(process.env.WORFGATE_ALLOWED_GITHUB_ORGS).map(org => org.toLowerCase());
}

function isGithubOrgAllowed(repoFullName?: string): boolean {
  if (!repoFullName) return false;
  const [owner] = repoFullName.split('/');
  if (!owner) return false;
  const allowed = allowedGithubOrgs();
  if (allowed.length === 0) return false;
  return allowed.includes(owner.toLowerCase());
}

function payloadHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function addWorfGateAuditEntry(entry: WorfGateAuditEntry): Promise<void> {
  worfGateAuditLog.unshift(entry);
  if (worfGateAuditLog.length > WORFGATE_AUDIT_MAX) {
    worfGateAuditLog.splice(WORFGATE_AUDIT_MAX);
  }

  // Hardening: Async background persistence
  try {
    const db = await getDbClient();
    await db.from('sa_security_audit').insert({
      operation: entry.operation,
      target: entry.target,
      allowed: entry.allowed,
      detected_markers: entry.detectedMarkers,
      payload_hash: entry.payloadHash,
      reasons: entry.reasons
    });
  } catch (err) {
    process.stderr.write(`[WORFGATE] CRITICAL: Failed to persist audit entry: ${err}\n`);
  }
}

export function getWorfGateAuditLog(options?: {
  limit?: number;
  blockedOnly?: boolean;
}): WorfGateAuditEntry[] {
  const blockedOnly = options?.blockedOnly ?? false;
  const limit = options?.limit ?? 50;

  const filtered = blockedOnly
    ? worfGateAuditLog.filter(entry => !entry.allowed)
    : worfGateAuditLog;

  return filtered.slice(0, limit);
}

export function evaluateWorfGateOutbound(input: {
  target: WorfGateTarget;
  payloadText: string;
  repoFullName?: string;
}): WorfGateDecision {
  if (!isEnforced()) {
    return { allowed: true, reasons: ['WORFGATE_ENFORCE=false'], detectedMarkers: [] };
  }

  const detectedMarkers = detectControlledMarkers(input.payloadText);
  if (detectedMarkers.length === 0) {
    return { allowed: true, reasons: ['No controlled markers detected'], detectedMarkers };
  }

  if (allowControlledData()) {
    return {
      allowed: true,
      reasons: ['Controlled data explicitly allowed by WORFGATE_ALLOW_CONTROLLED=true'],
      detectedMarkers,
    };
  }

  if (input.target === 'github' && isGithubOrgAllowed(input.repoFullName)) {
    return {
      allowed: true,
      reasons: ['GitHub organization explicitly allowed by WORFGATE_ALLOWED_GITHUB_ORGS'],
      detectedMarkers,
    };
  }

  return {
    allowed: false,
    reasons: ['Controlled markers detected without an allow policy for this target'],
    detectedMarkers,
  };
}

export function enforceWorfGateOutbound(input: {
  target: WorfGateTarget;
  payloadText: string;
  repoFullName?: string;
  operation: string;
}): void {
  const decision = evaluateWorfGateOutbound(input);
  const auditEntry: WorfGateAuditEntry = {
    timestamp: new Date().toISOString(),
    operation: input.operation,
    target: input.target,
    repoFullName: input.repoFullName ?? null,
    allowed: decision.allowed,
    reasons: decision.reasons,
    detectedMarkers: decision.detectedMarkers,
    payloadHash: payloadHash(input.payloadText),
  };
  addWorfGateAuditEntry(auditEntry);

  if (decision.allowed) {
    if (decision.detectedMarkers.length > 0) {
      process.stderr.write(
        `[WORFGATE] ALLOW ${input.operation} target=${input.target} markers=${decision.detectedMarkers.join(',')} reasons=${decision.reasons.join('; ')}\n`
      );
    }
    return;
  }

  process.stderr.write(
    `[WORFGATE] BLOCK ${input.operation} target=${input.target} markers=${decision.detectedMarkers.join(',')} reasons=${decision.reasons.join('; ')}\n`
  );

  throw new Error(
    `WorfGate blocked outbound operation '${input.operation}'. Controlled markers: ${decision.detectedMarkers.join(', ')}`
  );
}
