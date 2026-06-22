import { createHash } from 'crypto';
import { getDbClient } from '@story-agent/shared/db';
import { resolveClientPolicy } from '@story-agent/shared/client-security-policy';

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
  clientId: string | null;
  securitySensitivityScore: number | null;
  allowed: boolean;
  reasons: string[];
  detectedMarkers: string[];
  payloadHash: string;
}

const WORFGATE_AUDIT_MAX = parseInt(process.env.WORFGATE_AUDIT_MAX ?? '500', 10);
const worfGateAuditLog: WorfGateAuditEntry[] = [];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function detectStructuralMarkers(text: string): string[] {
  const markers: string[] = [];
  // Detect crew usage of lax types requested for autonomous flexibility
  if (text.includes(': any') || text.includes('as any')) markers.push('TS_ANY_USAGE');
  if (text.includes('undefined')) markers.push('TS_UNDEFINED_USAGE');
  return markers;
}

function detectControlledMarkers(text: string, clientId?: string | null): string[] {
  const policy = resolveClientPolicy(clientId);
  const markers = policy.worfGate.controlledMarkers;
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
      timestamp: entry.timestamp,
      operation: entry.operation,
      target: entry.target,
      repo_full_name: entry.repoFullName,
      client_id: entry.clientId,
      security_sensitivity_score: entry.securitySensitivityScore,
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
  clientId?: string | null;
  securitySensitivityScore?: number;
}): WorfGateDecision {
  if (!isEnforced()) {
    return { allowed: true, reasons: ['WORFGATE_ENFORCE=false'], detectedMarkers: [] };
  }

  const policy = resolveClientPolicy(input.clientId);
  const detectedMarkers = detectControlledMarkers(input.payloadText, input.clientId);
  const structuralMarkers = detectStructuralMarkers(input.payloadText);
  
  if (detectedMarkers.length === 0 && structuralMarkers.length === 0) {
    return { allowed: true, reasons: ['No controlled or structural markers detected'], detectedMarkers: [] };
  }

  // HARD BLOCK (regulated / military-grade clients): controlled data NEVER leaves — not overridable
  // by the WORFGATE_ALLOW_CONTROLLED flag, an allowControlledOutbound policy, or a GitHub-org allowlist.
  if (policy.auth.controlledDataHardBlock && detectedMarkers.length > 0) {
    return {
      allowed: false,
      reasons: [`Controlled-data HARD BLOCK (${policy.tier} tier '${policy.clientId}') — not overridable`],
      detectedMarkers: [...detectedMarkers, ...structuralMarkers],
    };
  }

  if (policy.worfGate.allowControlledOutbound || allowControlledData()) {
    return {
      allowed: true,
      reasons: ['Controlled/Structural data explicitly allowed by policy or flag'],
      detectedMarkers: [...detectedMarkers, ...structuralMarkers],
    };
  }

  if (input.target === 'github' && isGithubOrgAllowed(input.repoFullName)) {
    return {
      allowed: true,
      reasons: ['GitHub organization explicitly allowed by WORFGATE_ALLOWED_GITHUB_ORGS'],
      detectedMarkers: [...detectedMarkers, ...structuralMarkers],
    };
  }

  // Allow structural markers (any/undefined) even if no specific allow policy, but log them for governance
  if (detectedMarkers.length === 0 && structuralMarkers.length > 0) {
    return {
      allowed: true,
      reasons: ['Structural markers detected and permitted for autonomous flexibility under governance'],
      detectedMarkers: structuralMarkers,
    };
  }

  return {
    allowed: false,
    reasons: ['Security protocols enforced: controlled markers detected without an allow policy'],
    detectedMarkers: [...detectedMarkers, ...structuralMarkers],
  };
}

export function enforceWorfGateOutbound(input: {
  target: WorfGateTarget;
  payloadText: string;
  repoFullName?: string;
  clientId?: string | null;
  securitySensitivityScore?: number;
  operation: string;
}): void {
  const decision = evaluateWorfGateOutbound(input);
  const auditEntry: WorfGateAuditEntry = {
    timestamp: new Date().toISOString(),
    operation: input.operation,
    target: input.target,
    repoFullName: input.repoFullName ?? null,
    clientId: input.clientId ?? null,
    securitySensitivityScore: input.securitySensitivityScore ?? null,
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
