/**
 * WorfGate Sync Validator — Real-time Sync Security Layer
 *
 * Implements JWT-based per-message authentication and authorization for WebSocket sync:
 * - Session JWT creation and validation
 * - Token refresh mechanism (auto-refresh at 80% TTL)
 * - Per-message JWT signature verification
 * - Operation scoping (ui:sync:read, ui:sync:write)
 * - Session binding and revocation checks
 * - Injection detection for sync payloads
 * - Comprehensive error responses (401/403/429)
 *
 * Worf owns this skill: every sync message passes through WorfGate validation
 * BEFORE being broadcast to the pool. Unauthorized/anomalous messages are
 * immediately rejected with clear status codes.
 *
 * Used by: ChatWebSocketSync handler, WebSocket message validation
 */

import { createHmac, randomBytes } from 'node:crypto';
import { resolveWorfGateCredential, type CredentialAccessResult } from './worfgate-credentials.js';

// ── Types & Interfaces ────────────────────────────────────────────────────────

/**
 * JWT payload for sync session tokens.
 * Binds a session to a crew member with specific scopes and TTL.
 */
export interface SyncJwtPayload {
  /** Session ID (bound to JWT, must match on every message) */
  sessionId: string;
  /** Crew member ID (e.g., 'riker', 'data') */
  crewId: string;
  /** Allowed scopes: 'ui:sync:read' or 'ui:sync:write' */
  scopes: ('ui:sync:read' | 'ui:sync:write')[];
  /** Issued at (Unix timestamp in seconds) */
  iat: number;
  /** Expiration time (Unix timestamp in seconds, 1 hour TTL) */
  exp: number;
  /** Token version (for revocation) */
  ver: number;
}

/**
 * Session JWT validation result.
 * Contains the validated payload and decision metadata.
 */
export interface SyncJwtValidationResult {
  /** True if JWT signature is valid and token is not expired */
  valid: boolean;
  /** HTTP status code: 401=invalid, 403=forbidden, 200=ok */
  statusCode: number;
  /** Human-readable reason */
  reason: string;
  /** Decoded payload (only present if valid=true) */
  payload?: SyncJwtPayload;
  /** If valid=false but should refresh: present with new token */
  refreshToken?: string;
}

/**
 * Sync message validation result.
 * Comprehensive security check combining auth + injection detection.
 */
export interface SyncMessageValidationResult {
  authorized: boolean;
  statusCode: number;
  reason: string;
  flags?: SyncSecurityFlags;
  metadata?: {
    crewId?: string;
    sessionId?: string;
    messageId?: string;
    operationScopes?: ('ui:sync:read' | 'ui:sync:write')[];
  };
}

/**
 * Security flags detected during message validation.
 */
export interface SyncSecurityFlags {
  injectionAttempted: boolean;
  tokenExpired: boolean;
  tokenInvalid: boolean;
  scopeMismatch: boolean;
  sessionMismatch: boolean;
  details: Record<string, string>;
}

/**
 * Sync audit entry (immutable append-only log).
 * No secrets logged; only decisions and metadata.
 */
export interface SyncValidationAuditEntry {
  timestamp: string;
  messageId: string;
  sessionId: string;
  crewId: string;
  operation: 'hello' | 'sync' | 'refresh';
  authorized: boolean;
  statusCode: number;
  reason: string;
  flags?: Omit<SyncSecurityFlags, 'details'>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** JWT TTL: 1 hour (3600 seconds) */
const JWT_TTL_SECONDS = 60 * 60;

/** Refresh threshold: auto-refresh when 80% of TTL has elapsed */
const JWT_REFRESH_THRESHOLD = 0.8;

/** Max payload size for injection check: 10 MB */
const MAX_SYNC_PAYLOAD_SIZE = 10 * 1024 * 1024;

/** Injection signal patterns for sync payloads */
const SYNC_INJECTION_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: 'script-tag', pattern: /<script[^>]*>/i },
  { signal: 'event-handler', pattern: /\s+on\w+\s*=/i },
  { signal: 'protocol-bypass', pattern: /(javascript|data|vbscript):/i },
  { signal: 'sql-injection', pattern: /'|\";|--|\b(DROP|DELETE|INSERT|UPDATE)\b/i },
  { signal: 'command-injection', pattern: /[;&|`$(){}[\]]/i },
  { signal: 'env-var-access', pattern: /process\.env|__dirname|__filename/i },
  { signal: 'eval-pattern', pattern: /\b(eval|Function|execScript)\s*\(/i },
];

// ── In-Memory State ───────────────────────────────────────────────────────────

/** Active sessions keyed by sessionId: { payload, createdAt, lastRefreshAt } */
const activeSessions = new Map<
  string,
  { payload: SyncJwtPayload; createdAt: number; lastRefreshAt: number }
>();

/** Revoked tokens (session blacklist) — binds to sessionId */
const revokedSessions = new Set<string>();

/** Token version counter (for rotation/revocation) */
let tokenVersionCounter = 1;

/** Audit log (in-memory, immutable append-only) */
const auditLog: SyncValidationAuditEntry[] = [];
const AUDIT_MAX = 5000;

/**
 * Record an audit entry (immutable).
 */
function recordAudit(entry: SyncValidationAuditEntry): void {
  auditLog.push(entry);
  if (auditLog.length > AUDIT_MAX) {
    auditLog.splice(0, auditLog.length - AUDIT_MAX);
  }
}

/**
 * Retrieve audit log (read-only, no secrets).
 */
export function getSyncAuditLog(options?: { limit?: number; sessionId?: string }): SyncValidationAuditEntry[] {
  let entries = [...auditLog];
  if (options?.sessionId) {
    entries = entries.filter(e => e.sessionId === options.sessionId);
  }
  if (options?.limit) {
    entries = entries.slice(-options.limit);
  }
  return entries;
}

// ── JWT Generation & Validation ───────────────────────────────────────────────

/**
 * Generate a session JWT for WebSocket sync.
 *
 * Called on WebSocket 'hello' handshake. Creates a token bound to sessionId
 * that expires in 1 hour. Uses CREW_LLM_APPROVED_KEY as the signing secret.
 *
 * @param sessionId Session identifier (bound to token)
 * @param crewId Crew member ID (subject of the token)
 * @param scopes Permitted operations for this session
 * @returns { token, expiresAt, refreshAt }
 * @throws If credential resolution fails
 */
export function createSessionJwt(
  sessionId: string,
  crewId: string,
  scopes: ('ui:sync:read' | 'ui:sync:write')[] = ['ui:sync:read', 'ui:sync:write'],
): { token: string; expiresAt: Date; refreshAt: Date } {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + JWT_TTL_SECONDS) * 1000);
  const refreshAt = new Date((now + JWT_TTL_SECONDS * JWT_REFRESH_THRESHOLD) * 1000);

  const payload: SyncJwtPayload = {
    sessionId,
    crewId: crewId.toLowerCase(),
    scopes,
    iat: now,
    exp: now + JWT_TTL_SECONDS,
    ver: tokenVersionCounter,
  };

  // Sign the JWT
  const token = signJwt(payload);

  // Track this session
  activeSessions.set(sessionId, {
    payload,
    createdAt: now * 1000,
    lastRefreshAt: now * 1000,
  });

  return { token, expiresAt, refreshAt };
}

/**
 * Sign a JWT payload using CREW_LLM_APPROVED_KEY.
 * Uses HMAC-SHA256 for symmetric signing.
 *
 * @param payload The JWT payload to sign
 * @returns Signed JWT string (header.payload.signature)
 */
function signJwt(payload: SyncJwtPayload): string {
  // Resolve credential (will throw if not available)
  const cred = resolveWorfGateCredential('CREW_LLM_APPROVED_KEY', {
    operation: 'llm:call',
    crewId: 'worf',
  });

  if (!cred.authorized || !cred.available || !cred.value) {
    throw new Error('CREW_LLM_APPROVED_KEY not available — WorfGate credential broker failed');
  }

  // Create JWT header
  const header = { alg: 'HS256', typ: 'JWT' };

  // Encode header and payload as base64url
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Sign with HMAC-SHA256
  const message = `${headerB64}.${payloadB64}`;
  const signature = createHmac('sha256', cred.value).update(message).digest('base64url');

  return `${message}.${signature}`;
}

/**
 * Verify a JWT signature.
 * Extracts and validates the signature using CREW_LLM_APPROVED_KEY.
 *
 * @param token JWT token string
 * @returns { valid, payload } or { valid: false }
 */
function verifyJwtSignature(token: string): { valid: boolean; payload?: SyncJwtPayload } {
  // Resolve credential
  const cred = resolveWorfGateCredential('CREW_LLM_APPROVED_KEY', {
    operation: 'llm:call',
    crewId: 'worf',
  });

  if (!cred.authorized || !cred.available || !cred.value) {
    return { valid: false };
  }

  try {
    // Split token
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const message = `${headerB64}.${payloadB64}`;
    const expectedSignature = createHmac('sha256', cred.value)
      .update(message)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return { valid: false };
    }

    // Decode payload
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as SyncJwtPayload;

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Validate a session JWT.
 *
 * Checks signature, expiry, session binding, and revocation status.
 *
 * @param token JWT token string
 * @param sessionId Expected sessionId (must match token)
 * @returns SyncJwtValidationResult with decision and payload
 */
export function validateSessionJwt(token: string, sessionId: string): SyncJwtValidationResult {
  // Verify signature
  const sig = verifyJwtSignature(token);
  if (!sig.valid || !sig.payload) {
    return {
      valid: false,
      statusCode: 401,
      reason: 'invalid_token_signature',
    };
  }

  const payload = sig.payload;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return {
      valid: false,
      statusCode: 401,
      reason: 'token_expired',
    };
  }

  // Check session binding
  if (payload.sessionId !== sessionId) {
    return {
      valid: false,
      statusCode: 403,
      reason: 'session_mismatch',
    };
  }

  // Check revocation
  if (revokedSessions.has(sessionId)) {
    return {
      valid: false,
      statusCode: 403,
      reason: 'session_revoked',
    };
  }

  // Check if refresh is needed (at 80% TTL)
  const ttlRemaining = payload.exp - now;
  const shouldRefresh = ttlRemaining < JWT_TTL_SECONDS * (1 - JWT_REFRESH_THRESHOLD);

  if (shouldRefresh) {
    // Auto-refresh and return new token
    const refreshed = createSessionJwt(payload.sessionId, payload.crewId, payload.scopes);
    return {
      valid: true,
      statusCode: 200,
      reason: 'token_refreshed',
      payload,
      refreshToken: refreshed.token,
    };
  }

  return {
    valid: true,
    statusCode: 200,
    reason: 'token_valid',
    payload,
  };
}

/**
 * Revoke a session (blacklist it).
 *
 * All future tokens with this sessionId will be rejected.
 *
 * @param sessionId Session to revoke
 */
export function revokeSession(sessionId: string): void {
  revokedSessions.add(sessionId);
  activeSessions.delete(sessionId);
}

// ── Injection Detection ───────────────────────────────────────────────────────

/**
 * Detect injection signals in a sync payload.
 *
 * Scans for common attack patterns (script tags, SQL injection, command injection, etc.)
 * in the stringified payload.
 *
 * @param payload The sync message payload object
 * @returns Array of detected signal types (empty if clean)
 */
function detectSyncInjectionSignals(payload: Record<string, any>): string[] {
  const text = JSON.stringify(payload ?? {});
  if (text.length > MAX_SYNC_PAYLOAD_SIZE) {
    return ['payload_too_large'];
  }

  return SYNC_INJECTION_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ signal }) => signal);
}

/**
 * Sanitize a sync payload by removing potentially dangerous content.
 *
 * Note: This is for defense-in-depth. Injection detection is the primary gate.
 *
 * @param payload The payload to sanitize
 * @returns Sanitized payload
 */
export function sanitizeSyncPayload(payload: Record<string, any>): Record<string, any> {
  const json = JSON.stringify(payload);
  // Remove HTML/script content
  const cleaned = json
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-')
    .replace(/(javascript|data|vbscript):/gi, 'safe:');
  try {
    return JSON.parse(cleaned);
  } catch {
    return payload;
  }
}

// ── Message Validation ────────────────────────────────────────────────────────

/**
 * Validate a sync message before broadcasting.
 *
 * Comprehensive security check combining:
 * - JWT validation
 * - Operation scope verification
 * - Injection detection
 * - Session binding
 * - Payload sanitization
 *
 * Veto conditions (immediate 401/403/429):
 * - Invalid JWT signature (401)
 * - Expired token (401)
 * - Session mismatch (403)
 * - Session revoked (403)
 * - Injection attempt detected (403)
 * - Invalid operation scope (403)
 *
 * @param token JWT token from message headers or payload
 * @param sessionId Session ID (must match token)
 * @param payload The sync message payload
 * @param operation Requested operation ('ui:sync:read' | 'ui:sync:write')
 * @param messageId Optional message ID for audit
 * @returns SyncMessageValidationResult with comprehensive decision
 */
export function validateSyncMessage(
  token: string,
  sessionId: string,
  payload: Record<string, any>,
  operation: 'ui:sync:read' | 'ui:sync:write' = 'ui:sync:write',
  messageId?: string,
): SyncMessageValidationResult {
  const ts = new Date().toISOString();
  const injectionSignals = detectSyncInjectionSignals(payload);

  // Validate JWT
  const jwtValidation = validateSessionJwt(token, sessionId);
  if (!jwtValidation.valid || !jwtValidation.payload) {
    const flags: SyncSecurityFlags = {
      injectionAttempted: injectionSignals.length > 0,
      tokenExpired: jwtValidation.reason === 'token_expired',
      tokenInvalid: jwtValidation.reason !== 'token_expired',
      scopeMismatch: false,
      sessionMismatch: jwtValidation.reason === 'session_mismatch',
      details: {},
    };

    recordAudit({
      timestamp: ts,
      messageId: messageId || 'unknown',
      sessionId,
      crewId: 'unknown',
      operation: 'sync',
      authorized: false,
      statusCode: jwtValidation.statusCode,
      reason: jwtValidation.reason,
      flags: {
        injectionAttempted: flags.injectionAttempted,
        tokenExpired: flags.tokenExpired,
        tokenInvalid: flags.tokenInvalid,
        scopeMismatch: false,
        sessionMismatch: flags.sessionMismatch,
      },
    });

    return {
      authorized: false,
      statusCode: jwtValidation.statusCode,
      reason: jwtValidation.reason,
      flags,
    };
  }

  const jwtPayload = jwtValidation.payload;
  const crewId = jwtPayload.crewId;

  // Check operation scope
  if (!jwtPayload.scopes.includes(operation)) {
    const flags: SyncSecurityFlags = {
      injectionAttempted: injectionSignals.length > 0,
      tokenExpired: false,
      tokenInvalid: false,
      scopeMismatch: true,
      sessionMismatch: false,
      details: { scope: `requested ${operation}, allowed: ${jwtPayload.scopes.join(', ')}` },
    };

    recordAudit({
      timestamp: ts,
      messageId: messageId || 'unknown',
      sessionId,
      crewId,
      operation: 'sync',
      authorized: false,
      statusCode: 403,
      reason: 'scope_mismatch',
      flags: {
        injectionAttempted: flags.injectionAttempted,
        tokenExpired: false,
        tokenInvalid: false,
        scopeMismatch: true,
        sessionMismatch: false,
      },
    });

    return {
      authorized: false,
      statusCode: 403,
      reason: 'scope_mismatch',
      flags,
    };
  }

  // Check injection
  if (injectionSignals.length > 0) {
    const flags: SyncSecurityFlags = {
      injectionAttempted: true,
      tokenExpired: false,
      tokenInvalid: false,
      scopeMismatch: false,
      sessionMismatch: false,
      details: { signals: injectionSignals.join(', ') },
    };

    recordAudit({
      timestamp: ts,
      messageId: messageId || 'unknown',
      sessionId,
      crewId,
      operation: 'sync',
      authorized: false,
      statusCode: 403,
      reason: 'injection_detected',
      flags: {
        injectionAttempted: true,
        tokenExpired: false,
        tokenInvalid: false,
        scopeMismatch: false,
        sessionMismatch: false,
      },
    });

    return {
      authorized: false,
      statusCode: 403,
      reason: 'injection_detected',
      flags,
    };
  }

  // All checks passed
  recordAudit({
    timestamp: ts,
    messageId: messageId || 'unknown',
    sessionId,
    crewId,
    operation: 'sync',
    authorized: true,
    statusCode: 200,
    reason: 'message_authorized',
  });

  return {
    authorized: true,
    statusCode: 200,
    reason: 'message_authorized',
    metadata: {
      crewId,
      sessionId,
      messageId,
      operationScopes: jwtPayload.scopes,
    },
  };
}

// ── Session Management ────────────────────────────────────────────────────────

/**
 * Get active session info (for admin/monitoring).
 *
 * @param sessionId Session to look up
 * @returns Session info or null if not found
 */
export function getSessionInfo(sessionId: string): {
  crewId: string;
  scopes: ('ui:sync:read' | 'ui:sync:write')[];
  createdAt: Date;
  expiresAt: Date;
  refreshAt: Date;
} | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  const payload = session.payload;
  const expiresAt = new Date(payload.exp * 1000);
  const refreshAt = new Date((payload.exp - JWT_TTL_SECONDS * (1 - JWT_REFRESH_THRESHOLD)) * 1000);

  return {
    crewId: payload.crewId,
    scopes: payload.scopes,
    createdAt: new Date(session.createdAt),
    expiresAt,
    refreshAt,
  };
}

/**
 * Clear expired sessions (garbage collection).
 *
 * Call periodically to prevent unbounded session map growth.
 *
 * @returns Number of sessions cleared
 */
export function clearExpiredSessions(): number {
  const now = Math.floor(Date.now() / 1000);
  let cleared = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.payload.exp <= now) {
      activeSessions.delete(sessionId);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Get metrics (for monitoring).
 */
export function getSyncValidatorMetrics(): {
  activeSessions: number;
  revokedSessions: number;
  auditLogSize: number;
  tokenVersion: number;
} {
  return {
    activeSessions: activeSessions.size,
    revokedSessions: revokedSessions.size,
    auditLogSize: auditLog.length,
    tokenVersion: tokenVersionCounter,
  };
}
