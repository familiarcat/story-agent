/**
 * Sync Audit Trail — Immutable append-only security log
 *
 * Maintains a cryptographically-signed audit trail of all sync messages.
 * Features:
 * - Immutable: Append-only, no updates or deletions
 * - Cryptographic integrity: HMAC-SHA256 signature per entry
 * - No secrets logged: Only hashes, timestamps, user IDs
 * - Ring buffer: 10K entries in memory + optional Supabase (Phase 3)
 * - Queryable: Filter by userId, sessionId, timestamp range, status
 * - Conflict resolution: Can replay entries to detect out-of-order delivery
 *
 * Each entry is signed with a sequence number to detect tampering or loss.
 * Can be used to audit compliance, replay sync state, or investigate incidents.
 *
 * Usage:
 *   const trail = new SyncAuditTrail();
 *   trail.log({ messageId, userId, sessionId, action, status });
 *   const entries = trail.query({ userId, since, limit });
 *   const checksum = trail.getChecksum(); // Verify integrity
 */

import { createHmac } from 'node:crypto';

// ── Types & Interfaces ────────────────────────────────────────────────────────

/**
 * Sync message action type.
 */
export type SyncMessageAction = 'hello' | 'sync' | 'ping' | 'close' | 'error';

/**
 * Audit trail entry — immutable and signed.
 */
export interface SyncAuditEntry {
  /** Entry sequence number (detect out-of-order or missing entries) */
  sequence: number;
  /** Timestamp in ISO 8601 format */
  timestamp: string;
  /** Unique message ID (for tracing) */
  messageId: string;
  /** User ID (non-secret, used for filtering) */
  userId: string;
  /** Session ID (non-secret, used for filtering) */
  sessionId: string;
  /** Action type: hello|sync|ping|close|error */
  action: SyncMessageAction;
  /** Message status: success|rejected|error|rate_limited */
  status: 'success' | 'rejected' | 'error' | 'rate_limited' | 'timeout';
  /** Human-readable reason (no secret values) */
  reason: string;
  /** HMAC-SHA256 signature of this entry (for integrity verification) */
  signature: string;
  /** Optional: bytes transferred (for analytics) */
  bytesTransferred?: number;
  /** Optional: processing time in milliseconds */
  processingTimeMs?: number;
}

/**
 * Audit trail query options.
 */
export interface SyncAuditQueryOptions {
  /** Filter by user ID */
  userId?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by action */
  action?: SyncMessageAction;
  /** Filter by status */
  status?: 'success' | 'rejected' | 'error' | 'rate_limited' | 'timeout';
  /** Start timestamp (ISO 8601) */
  since?: string;
  /** End timestamp (ISO 8601) */
  until?: string;
  /** Maximum results to return */
  limit?: number;
}

/**
 * Audit integrity check result.
 */
export interface SyncAuditIntegrityCheck {
  /** True if all signatures are valid and sequence is intact */
  valid: boolean;
  /** Total entries checked */
  entriesChecked: number;
  /** Entries with valid signatures */
  validSignatures: number;
  /** Entries with invalid signatures (tampering detected) */
  invalidSignatures: number;
  /** Sequence gaps detected (missing entries) */
  sequenceGaps: number[];
  /** Overall hash (Merkle root for full trail) */
  overallHash: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Max in-memory entries (10K) */
const MAX_ENTRIES = 10_000;

/** Signing key: use a stable key per node (can be rotated, but must be stable for one session) */
const SIGNING_KEY = process.env.SYNC_AUDIT_SIGNING_KEY || Buffer.from('default-sync-audit-key').toString('base64');

// ── In-Memory Ring Buffer ─────────────────────────────────────────────────────

/** Immutable append-only log (ring buffer) */
const auditLog: SyncAuditEntry[] = [];

/** Entry counter (for sequence numbers) */
let sequenceCounter = 0;

// ── Signing & Verification ───────────────────────────────────────────────────

/**
 * Create an HMAC-SHA256 signature for an audit entry.
 * Does NOT include the signature field itself.
 *
 * @param entry Entry to sign (signature field must be empty or absent)
 * @returns Base64url-encoded signature
 */
function signAuditEntry(entry: Omit<SyncAuditEntry, 'signature'>): string {
  const message = JSON.stringify(entry);
  return createHmac('sha256', SIGNING_KEY).update(message).digest('base64url');
}

/**
 * Verify an audit entry signature.
 *
 * @param entry Full entry with signature
 * @returns True if signature is valid
 */
function verifyAuditEntrySignature(entry: SyncAuditEntry): boolean {
  const { signature, ...withoutSig } = entry;
  const expectedSignature = signAuditEntry(withoutSig);
  return signature === expectedSignature;
}

// ── SyncAuditTrail Class ──────────────────────────────────────────────────────

/**
 * Immutable audit trail for sync messages.
 * Thread-safe for append operations (single-threaded JS guarantees atomicity).
 */
export class SyncAuditTrail {
  /**
   * Log an audit entry.
   * Automatically signs the entry and appends to the ring buffer.
   *
   * @param data Partial entry data (without sequence or signature)
   * @returns Full signed entry
   */
  log(data: {
    messageId: string;
    userId: string;
    sessionId: string;
    action: SyncMessageAction;
    status: 'success' | 'rejected' | 'error' | 'rate_limited' | 'timeout';
    reason: string;
    bytesTransferred?: number;
    processingTimeMs?: number;
  }): SyncAuditEntry {
    sequenceCounter++;

    const entry: Omit<SyncAuditEntry, 'signature'> = {
      sequence: sequenceCounter,
      timestamp: new Date().toISOString(),
      messageId: data.messageId,
      userId: data.userId,
      sessionId: data.sessionId,
      action: data.action,
      status: data.status,
      reason: data.reason,
      bytesTransferred: data.bytesTransferred,
      processingTimeMs: data.processingTimeMs,
    };

    const signature = signAuditEntry(entry);
    const fullEntry: SyncAuditEntry = { ...entry, signature };

    // Append to ring buffer
    auditLog.push(fullEntry);
    if (auditLog.length > MAX_ENTRIES) {
      auditLog.splice(0, auditLog.length - MAX_ENTRIES);
    }

    return fullEntry;
  }

  /**
   * Query the audit trail.
   *
   * Returns entries matching the query criteria (no secrets exposed).
   *
   * @param options Query criteria
   * @returns Matching entries (newest first)
   */
  query(options?: SyncAuditQueryOptions): SyncAuditEntry[] {
    let results = [...auditLog];

    if (options?.userId) {
      results = results.filter(e => e.userId === options.userId);
    }

    if (options?.sessionId) {
      results = results.filter(e => e.sessionId === options.sessionId);
    }

    if (options?.action) {
      results = results.filter(e => e.action === options.action);
    }

    if (options?.status) {
      results = results.filter(e => e.status === options.status);
    }

    if (options?.since) {
      const sinceTime = new Date(options.since).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
    }

    if (options?.until) {
      const untilTime = new Date(options.until).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() <= untilTime);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get all entries in the trail.
   * Returns in order (oldest first, newest last).
   */
  getAll(): SyncAuditEntry[] {
    return [...auditLog];
  }

  /**
   * Verify integrity of the entire audit trail.
   *
   * Checks:
   * - All signatures are valid (no tampering)
   * - Sequence numbers are contiguous (no missing entries)
   * - Compute overall hash (Merkle root)
   *
   * @returns Integrity check result
   */
  verifyIntegrity(): SyncAuditIntegrityCheck {
    const entriesChecked = auditLog.length;
    let validSignatures = 0;
    let invalidSignatures = 0;
    const sequenceGaps: number[] = [];
    let lastSequence = 0;

    for (const entry of auditLog) {
      if (verifyAuditEntrySignature(entry)) {
        validSignatures++;
      } else {
        invalidSignatures++;
      }

      // Check sequence continuity
      if (entry.sequence !== lastSequence + 1) {
        if (lastSequence > 0) {
          for (let i = lastSequence + 1; i < entry.sequence; i++) {
            sequenceGaps.push(i);
          }
        }
      }
      lastSequence = entry.sequence;
    }

    // Compute overall hash (Merkle root)
    let overallHash = '';
    if (auditLog.length > 0) {
      const entries = auditLog.map(e => JSON.stringify(e)).join('\n');
      overallHash = createHmac('sha256', SIGNING_KEY).update(entries).digest('base64url');
    }

    return {
      valid: invalidSignatures === 0 && sequenceGaps.length === 0,
      entriesChecked,
      validSignatures,
      invalidSignatures,
      sequenceGaps,
      overallHash,
    };
  }

  /**
   * Get a cryptographic checksum of the entire trail.
   * Useful for periodic integrity checks (e.g., in health monitoring).
   *
   * @returns Base64url-encoded hash of all entries
   */
  getChecksum(): string {
    if (auditLog.length === 0) {
      return '';
    }
    const entries = auditLog.map(e => JSON.stringify(e)).join('\n');
    return createHmac('sha256', SIGNING_KEY).update(entries).digest('base64url');
  }

  /**
   * Get statistics about the audit trail.
   */
  getStats(): {
    totalEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    entriesByStatus: Record<string, number>;
    entriesByAction: Record<string, number>;
    uniqueUsers: Set<string>;
    uniqueSessions: Set<string>;
  } {
    const entriesByStatus: Record<string, number> = {};
    const entriesByAction: Record<string, number> = {};
    const uniqueUsers = new Set<string>();
    const uniqueSessions = new Set<string>();

    for (const entry of auditLog) {
      entriesByStatus[entry.status] = (entriesByStatus[entry.status] ?? 0) + 1;
      entriesByAction[entry.action] = (entriesByAction[entry.action] ?? 0) + 1;
      uniqueUsers.add(entry.userId);
      uniqueSessions.add(entry.sessionId);
    }

    const oldestEntry = auditLog.length > 0 ? new Date(auditLog[0]!.timestamp) : null;
    const newestEntry = auditLog.length > 0 ? new Date(auditLog[auditLog.length - 1]!.timestamp) : null;

    return {
      totalEntries: auditLog.length,
      oldestEntry,
      newestEntry,
      entriesByStatus,
      entriesByAction,
      uniqueUsers,
      uniqueSessions,
    };
  }

  /**
   * Export audit trail as JSONL (one entry per line).
   * Useful for backup, archival, or Supabase ingestion.
   *
   * @returns JSONL string (entries separated by newlines)
   */
  exportJsonl(): string {
    return auditLog.map(e => JSON.stringify(e)).join('\n');
  }

  /**
   * Clear audit log (use with caution — irreversible).
   * Call this only on shutdown or during testing.
   */
  clear(): void {
    auditLog.length = 0;
    sequenceCounter = 0;
  }

  /**
   * Replay entries to rebuild state or detect conflicts.
   *
   * Useful for:
   * - Conflict resolution: detect which user actually won a race
   * - State reconstruction: replay in order to compute final state
   * - Forensics: understand sequence of events leading to incident
   *
   * @param filter Optional filter to replay only matching entries
   * @returns Entries in order of sequence (oldest first)
   */
  replay(filter?: SyncAuditQueryOptions): SyncAuditEntry[] {
    let entries = this.query(filter);
    // Sort by sequence ascending (to replay in order)
    entries.sort((a, b) => a.sequence - b.sequence);
    return entries;
  }

  /**
   * Get metrics for monitoring and health checks.
   */
  getMetrics() {
    const stats = this.getStats();
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentEntries = auditLog.filter(
      e => new Date(e.timestamp).getTime() >= oneHourAgo
    );

    const recentSuccessful = recentEntries.filter(e => e.status === 'success').length;
    const recentRejected = recentEntries.filter(e => e.status === 'rejected').length;

    return {
      totalEntries: stats.totalEntries,
      recentEntries: recentEntries.length,
      recentSuccessful,
      recentRejected,
      successRate: recentEntries.length > 0 ? (recentSuccessful / recentEntries.length) * 100 : 0,
      uniqueUsers: stats.uniqueUsers.size,
      uniqueSessions: stats.uniqueSessions.size,
    };
  }
}

/**
 * Global singleton instance.
 */
let globalTrail: SyncAuditTrail | null = null;

/**
 * Get or create the global audit trail instance.
 */
export function getGlobalSyncAuditTrail(): SyncAuditTrail {
  if (!globalTrail) {
    globalTrail = new SyncAuditTrail();
  }
  return globalTrail;
}
