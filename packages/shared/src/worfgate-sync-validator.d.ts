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
/**
 * Retrieve audit log (read-only, no secrets).
 */
export declare function getSyncAuditLog(options?: {
    limit?: number;
    sessionId?: string;
}): SyncValidationAuditEntry[];
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
export declare function createSessionJwt(sessionId: string, crewId: string, scopes?: ('ui:sync:read' | 'ui:sync:write')[]): {
    token: string;
    expiresAt: Date;
    refreshAt: Date;
};
/**
 * Validate a session JWT.
 *
 * Checks signature, expiry, session binding, and revocation status.
 *
 * @param token JWT token string
 * @param sessionId Expected sessionId (must match token)
 * @returns SyncJwtValidationResult with decision and payload
 */
export declare function validateSessionJwt(token: string, sessionId: string): SyncJwtValidationResult;
/**
 * Revoke a session (blacklist it).
 *
 * All future tokens with this sessionId will be rejected.
 *
 * @param sessionId Session to revoke
 */
export declare function revokeSession(sessionId: string): void;
/**
 * Sanitize a sync payload by removing potentially dangerous content.
 *
 * Note: This is for defense-in-depth. Injection detection is the primary gate.
 *
 * @param payload The payload to sanitize
 * @returns Sanitized payload
 */
export declare function sanitizeSyncPayload(payload: Record<string, any>): Record<string, any>;
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
export declare function validateSyncMessage(token: string, sessionId: string, payload: Record<string, any>, operation?: 'ui:sync:read' | 'ui:sync:write', messageId?: string): SyncMessageValidationResult;
/**
 * Get active session info (for admin/monitoring).
 *
 * @param sessionId Session to look up
 * @returns Session info or null if not found
 */
export declare function getSessionInfo(sessionId: string): {
    crewId: string;
    scopes: ('ui:sync:read' | 'ui:sync:write')[];
    createdAt: Date;
    expiresAt: Date;
    refreshAt: Date;
} | null;
/**
 * Clear expired sessions (garbage collection).
 *
 * Call periodically to prevent unbounded session map growth.
 *
 * @returns Number of sessions cleared
 */
export declare function clearExpiredSessions(): number;
/**
 * Get metrics (for monitoring).
 */
export declare function getSyncValidatorMetrics(): {
    activeSessions: number;
    revokedSessions: number;
    auditLogSize: number;
    tokenVersion: number;
};
//# sourceMappingURL=worfgate-sync-validator.d.ts.map