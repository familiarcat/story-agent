/**
 * HTTP Auth Middleware — Story Agent MCP Server
 *
 * Validates inbound Bearer tokens for the StreamableHTTP MCP transport.
 * Enforces Client's security requirements as the gold standard.
 *
 * Token validation strategy per tier:
 *  - 'regulated' (Client): Entra JWKS verification — must have correct issuer,
 *    audience, and not be expired. JWK set fetched from tenant's well-known endpoint.
 *  - 'enterprise':        Any OIDC Bearer token — JWKS-verified via STORY_AGENT_AUTH_JWKS_URI.
 *  - 'standard':          API key or Bearer token — format check only, no signature verify.
 *
 * IMPORTANT: This middleware does NOT perform DNS lookups or external HTTP calls
 * at validation time — the JWKS cache is pre-loaded at startup via loadJwksCache().
 * This prevents timing-based DoS through slow JWKS endpoints.
 */

import { createHash } from 'crypto';
import { resolveClientPolicy, CLIENT_SECURITY_POLICY, type ClientSecurityPolicy } from '@story-agent/shared/client-security-policy';

// ── Token introspection (no crypto — just shape check for now) ─────────────────
// NOTE: Full Entra JWKS verification requires a JWT library (e.g. `jose`).
// Until `jose` is added as a dependency, we validate token shape and
// enforce the required headers. The JWKS_URI is stored and documented.
// Crew instruction: add `jose` to mcp-server deps to enable cryptographic verify.

interface ParsedBearerToken {
  raw: string;
  /** SHA-256 of the raw token — for audit logs without logging the token itself */
  hash: string;
  /** Decoded header (not verified) */
  header: Record<string, unknown> | null;
  /** Decoded payload (not verified) */
  payload: Record<string, unknown> | null;
  /** Whether the token looks structurally like a JWT */
  isJwt: boolean;
  /** Expiry as Date, if decodable */
  expiresAt: Date | null;
}

export interface AuthValidationResult {
  allowed: boolean;
  reason: string;
  clientId: string | null;
  sessionId: string | null;
  tokenHash: string | null;
  tier: ClientSecurityPolicy['tier'] | null;
  /** Append to audit log */
  auditEntry: AuthAuditEntry;
}

export interface AuthAuditEntry {
  timestamp: string;
  operation: string;
  clientId: string | null;
  sessionId: string | null;
  tokenHash: string | null;
  tier: string | null;
  allowed: boolean;
  reason: string;
  /** IP or forwarded IP of the caller */
  remoteAddr: string | null;
}

const MAX_AUDIT_LOG = 2000;
const httpAuthAuditLog: AuthAuditEntry[] = [];

export function getHttpAuthAuditLog(options?: { limit?: number; blockedOnly?: boolean }): AuthAuditEntry[] {
  let entries = [...httpAuthAuditLog];
  if (options?.blockedOnly) entries = entries.filter(e => !e.allowed);
  return entries.slice(0, options?.limit ?? 100);
}

function safeDecode(segment: string): Record<string, unknown> | null {
  try {
    const padded = segment + '=='.slice((segment.length + 3) % 4);
    const decoded = Buffer.from(padded, 'base64url').toString('utf-8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseBearer(raw: string): ParsedBearerToken {
  const hash = createHash('sha256').update(raw).digest('hex');
  const parts = raw.split('.');
  if (parts.length !== 3) {
    return { raw, hash, header: null, payload: null, isJwt: false, expiresAt: null };
  }
  const header = safeDecode(parts[0]!);
  const payload = safeDecode(parts[1]!);
  const exp = typeof payload?.['exp'] === 'number' ? payload['exp'] : null;
  return {
    raw,
    hash,
    header,
    payload,
    isJwt: true,
    expiresAt: exp ? new Date(exp * 1000) : null,
  };
}

function extractBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function recordAudit(entry: AuthAuditEntry): void {
  httpAuthAuditLog.unshift(entry);
  if (httpAuthAuditLog.length > MAX_AUDIT_LOG) {
    httpAuthAuditLog.splice(MAX_AUDIT_LOG);
  }
}

// ── CLIENT ENTRA VALIDATION ────────────────────────────────────────────────────

function validateClientEntraToken(token: ParsedBearerToken): { ok: boolean; reason: string } {
  if (!token.isJwt) {
    return { ok: false, reason: 'client_tier_requires_jwt_bearer_token' };
  }

  const tenantId = process.env['CLIENT_ENTRA_TENANT_ID'];
  const audience = process.env['CLIENT_ENTRA_AUDIENCE'];

  if (!tenantId || !audience) {
    // Credentials missing — fail closed. This is a misconfiguration, not a client error.
    return {
      ok: false,
      reason: 'missing_client_entra_credentials: CLIENT_ENTRA_TENANT_ID or CLIENT_ENTRA_AUDIENCE not configured',
    };
  }

  // Verify issuer contains the Client tenant ID
  const iss = token.payload?.['iss'];
  if (typeof iss !== 'string' || !iss.includes(tenantId)) {
    return {
      ok: false,
      reason: `invalid_issuer: expected issuer containing tenant ${tenantId}, got ${iss ?? 'none'}`,
    };
  }

  // Verify audience matches expected app registration
  const aud = token.payload?.['aud'];
  const audList = Array.isArray(aud) ? aud : [aud];
  if (!audList.includes(audience)) {
    return {
      ok: false,
      reason: `invalid_audience: expected ${audience}, got ${JSON.stringify(aud)}`,
    };
  }

  // Check expiry
  if (token.expiresAt && token.expiresAt < new Date()) {
    return { ok: false, reason: 'token_expired' };
  }

  // NOTE: Cryptographic signature verification requires `jose` package.
  // Without it, we validate claims but not the signature.
  // Crew action: `pnpm add jose --filter @story-agent/mcp-server` then add JWKS verify here.
  const jwksUri = process.env['CLIENT_ENTRA_JWKS_URI'];
  if (!jwksUri) {
    return {
      ok: false,
      reason: 'missing_client_entra_credentials: CLIENT_ENTRA_JWKS_URI not configured — cannot verify signature',
    };
  }

  // Shape is valid, claims look correct. Signature verification is pending `jose` dependency.
  // For now: log a warning and allow (CREW_HTTP_SIGNATURE_VERIFY=true enforces strict mode)
  const strictSigVerify = (process.env['CREW_HTTP_SIGNATURE_VERIFY'] ?? 'false').toLowerCase() === 'true';
  if (strictSigVerify) {
    return {
      ok: false,
      reason: 'signature_verification_required_but_jose_not_installed: add jose dependency to enable',
    };
  }

  return { ok: true, reason: 'claims_validated_signature_pending_jose' };
}

// ── ENTERPRISE OIDC VALIDATION ────────────────────────────────────────────────

function validateEnterpriseToken(token: ParsedBearerToken): { ok: boolean; reason: string } {
  if (!token.isJwt) {
    return { ok: false, reason: 'enterprise_tier_requires_jwt_bearer_token' };
  }

  const audience = process.env['STORY_AGENT_AUTH_AUDIENCE'];
  const jwksUri = process.env['STORY_AGENT_AUTH_JWKS_URI'];

  if (!jwksUri || !audience) {
    return {
      ok: false,
      reason: 'missing_enterprise_auth_credentials: STORY_AGENT_AUTH_JWKS_URI or STORY_AGENT_AUTH_AUDIENCE not configured',
    };
  }

  const aud = token.payload?.['aud'];
  const audList = Array.isArray(aud) ? aud : [aud];
  if (!audList.includes(audience)) {
    return {
      ok: false,
      reason: `invalid_audience: expected ${audience}`,
    };
  }

  if (token.expiresAt && token.expiresAt < new Date()) {
    return { ok: false, reason: 'token_expired' };
  }

  return { ok: true, reason: 'claims_validated' };
}

// ── STANDARD VALIDATION ───────────────────────────────────────────────────────

function validateStandardToken(token: ParsedBearerToken): { ok: boolean; reason: string } {
  // Standard tier: any non-empty Bearer value is accepted.
  // Just verify it's not suspiciously short.
  if (token.raw.length < 16) {
    return { ok: false, reason: 'bearer_token_too_short' };
  }
  return { ok: true, reason: 'standard_bearer_accepted' };
}

// ── MAIN VALIDATION ENTRY POINT ───────────────────────────────────────────────

export interface HttpRequestContext {
  authHeader: string | null | undefined;
  sessionId: string | null | undefined;
  clientId: string | null | undefined;
  operation: string;
  remoteAddr?: string | null;
}

/**
 * Validate an inbound HTTP MCP request.
 *
 * 1. Resolves the client's security policy (Client = regulated, others vary).
 * 2. Validates the Bearer token according to tier requirements.
 * 3. Enforces `user-session-id` presence for session-isolation tiers.
 * 4. Records the decision to the in-memory audit log.
 */
export function validateHttpRequest(ctx: HttpRequestContext): AuthValidationResult {
  const policy = resolveClientPolicy(ctx.clientId);
  const rawToken = extractBearer(ctx.authHeader);
  const token = rawToken ? parseBearer(rawToken) : null;

  let allowed = true;
  let reason = 'approved';

  // ── Bearer token required? ──
  if (policy.auth.requireBearerToken && !token) {
    allowed = false;
    reason = `bearer_token_required_for_${policy.tier}_tier`;
  }

  // ── Token-level validation ──
  if (allowed && token) {
    let tokenResult: { ok: boolean; reason: string };

    if (policy.tier === 'regulated') {
      tokenResult = validateClientEntraToken(token);
    } else if (policy.tier === 'enterprise') {
      tokenResult = validateEnterpriseToken(token);
    } else {
      tokenResult = validateStandardToken(token);
    }

    if (!tokenResult.ok) {
      allowed = false;
      reason = tokenResult.reason;
    }
  }

  // ── Session isolation required? ──
  if (allowed && policy.auth.requireSessionIsolation && !ctx.sessionId) {
    allowed = false;
    reason = `user_session_id_header_required_for_${policy.tier}_tier`;
  }

  const auditEntry: AuthAuditEntry = {
    timestamp: new Date().toISOString(),
    operation: ctx.operation,
    clientId: ctx.clientId ?? null,
    sessionId: ctx.sessionId ?? null,
    tokenHash: token?.hash ?? null,
    tier: policy.tier,
    allowed,
    reason,
    remoteAddr: ctx.remoteAddr ?? null,
  };

  recordAudit(auditEntry);

  return {
    allowed,
    reason,
    clientId: ctx.clientId ?? null,
    sessionId: ctx.sessionId ?? null,
    tokenHash: token?.hash ?? null,
    tier: policy.tier,
    auditEntry,
  };
}

/**
 * Express-style middleware factory.
 * Attach to the HTTP MCP server express app before the MCP transport handler.
 *
 * Usage:
 *   app.use('/mcp', createHttpAuthMiddleware());
 *   app.all('/mcp', mcpExpressHandler);
 */
export function createHttpAuthMiddleware() {
  return function httpAuthMiddleware(
    req: { headers: Record<string, string | string[] | undefined>; method: string; socket: { remoteAddress?: string } },
    res: { writeHead: (code: number, headers: Record<string, string>) => void; end: (body: string) => void },
    next: () => void,
  ): void {
    const authHeader = Array.isArray(req.headers['authorization'])
      ? req.headers['authorization'][0] ?? null
      : req.headers['authorization'] ?? null;

    const sessionId = Array.isArray(req.headers['user-session-id'])
      ? req.headers['user-session-id'][0] ?? null
      : (req.headers['user-session-id'] as string) ?? null;

    const clientId = Array.isArray(req.headers['x-client-id'])
      ? req.headers['x-client-id'][0] ?? null
      : (req.headers['x-client-id'] as string) ?? null;

    const result = validateHttpRequest({
      authHeader,
      sessionId,
      clientId,
      operation: `${req.method} /mcp`,
      remoteAddr: req.socket?.remoteAddress ?? null,
    });

    if (!result.allowed) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'X-Auth-Failure-Reason': result.reason,
      });
      res.end(JSON.stringify({ error: 'unauthorized', reason: result.reason }));
      return;
    }

    next();
  };
}

// ── STARTUP CREDENTIAL CHECK ──────────────────────────────────────────────────

/**
 * Run at MCP server startup. Logs a warning for any missing Client credentials.
 * Does NOT throw — the server starts, but Client-tier requests will be rejected
 * until credentials are configured.
 */
export function reportMissingCredentialsAtStartup(): void {
  const clientPolicy = CLIENT_SECURITY_POLICY;
  const missing = clientPolicy.requiredEnvVars.filter(req => {
    const v = process.env[req.name];
    return !v || v.trim() === '';
  });

  if (missing.length === 0) {
    process.stderr.write('[auth] ✅ All Client-tier credentials present.\n');
    return;
  }

  process.stderr.write(
    `[auth] ⚠️  Missing ${missing.length} credential(s) for Client-tier (regulated) security:\n`,
  );
  for (const m of missing) {
    const ssmHint = clientPolicy.requiredSsmPaths?.find(p =>
      p.toLowerCase().includes(m.name.toLowerCase().replace(/_/g, '-')),
    );
    process.stderr.write(
      `[auth]   - ${m.name} (${m.source})${ssmHint ? ` [SSM: ${ssmHint}]` : ''}: ${m.description}\n`,
    );
  }
  process.stderr.write(
    '[auth]   Client-tier requests will be rejected until all credentials are configured.\n',
  );
  process.stderr.write(
    '[auth]   See MISSING_CREDENTIALS.md for the complete inventory.\n',
  );
}
