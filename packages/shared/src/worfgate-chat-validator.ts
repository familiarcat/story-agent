/**
 * WorfGate Chat Validator — Phase 1B Security Layer
 *
 * VSCode chat security validation layer enforcing:
 * - Credential authorization (CREW_LLM_APPROVED_KEY access check)
 * - Rate limiting (token/sec and burst detection per crew member)
 * - Prompt injection detection (built on existing patterns from chat.ts)
 * - Anomaly flagging (failed auth attempts, unusual patterns)
 * - Audit trail (all validation checks, no secrets logged)
 *
 * Worf owns this skill: every chat request passes through WorfGate validation
 * BEFORE reaching the canonical chat turn. Unauthorized/anomalous requests are
 * immediately denied with clear error codes (401/429/403).
 *
 * Used by: VSCode chat agent, web UI /chat endpoint, OpenAI-compatible /v1/chat/completions
 */

import { resolveWorfGateCredential, type CredentialAccessResult } from './worfgate-credentials.js';

// ── Types & Interfaces ────────────────────────────────────────────────────────

/** Chat request validation result (always includes reason, never includes secret values). */
export interface ChatValidationResult {
  authorized: boolean;
  /** HTTP status code: 401=unauthorized, 429=rate-limited, 403=suspicious, 200=ok. */
  statusCode: number;
  reason: string;
  flags?: ChatAnomalyFlags;
  metadata?: {
    tokenCount?: number;
    crewId?: string;
    windowsRemaining?: number;
    injectionSignalsDetected?: number;
  };
}

/** Anomaly flags raised during validation. */
export interface ChatAnomalyFlags {
  /** True if injection attempt detected. */
  injectionAttempted: boolean;
  /** True if rate limit exceeded (tokens/sec > threshold). */
  rateLimited: boolean;
  /** True if repeated failed auth attempts detected (>3 in 60s). */
  authAttackPattern: boolean;
  /** True if unusual token burst detected (>50 tokens/sec from same crewId). */
  tokenBurst: boolean;
  /** True if payload is suspiciously large (>1MB). */
  payloadSuspicious: boolean;
  /** Details of each flag (for audit). */
  details: Record<string, string>;
}

/** Sanitization result (injection-free prompt, original preserved). */
export interface ChatSanitizationResult {
  isClean: boolean;
  sanitized: string;
  original: string;
  injectionSignals: string[];
  removedDirectives: string[];
}

/** Audit entry for WorfGate chat validation (no secrets, only decisions & counts). */
export interface ChatValidationAuditEntry {
  timestamp: string;
  crewId: string;
  clientId?: string | null;
  authorized: boolean;
  statusCode: number;
  reason: string;
  tokenCount?: number;
  flags?: Omit<ChatAnomalyFlags, 'details'>;
  injectionSignalsCount?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Rate limit: tokens/second per crewId (hard cap for burst detection). */
const RATE_LIMIT_TOKENS_PER_SEC = 50;

/** Burst window: 1-second sliding window for burst detection. */
const BURST_WINDOW_MS = 1000;

/** Repeated auth failure threshold: >3 failed auth attempts in 60 seconds triggers anomaly flag. */
const AUTH_FAILURE_THRESHOLD = 3;
const AUTH_FAILURE_WINDOW_MS = 60 * 1000;

/** Max payload size (1 MB). */
const MAX_PAYLOAD_SIZE_BYTES = 1 * 1024 * 1024;

/** Section 31 budget per crewId (soft limit, triggers review not hard stop). */
const SECTION31_BUDGET_TOKENS_PER_CREW = 50_000;

/** Prompt injection signal patterns (expanded from chat.ts). */
const INJECTION_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: 'override-instructions', pattern: /ignore\s+(all|any|previous|prior)\s+(instructions|rules|system)/i },
  { signal: 'prompt-exfiltration', pattern: /(reveal|print|dump|show|expose)\s+(the\s+)?(system|developer|assistant)\s+prompt/i },
  { signal: 'role-spoofing', pattern: /^\s*(system|developer|assistant)\s*:/im },
  { signal: 'policy-bypass', pattern: /(bypass|disable|remove)\s+(safety|guardrails?|worfgate|constraints)/i },
  { signal: 'tool-injection-markers', pattern: /<\|[^|>]+\|>|```(?:system|tool|code-execution)/i },
  { signal: 'function-override', pattern: /(?:override|redefine|replace)\s+(?:function|method|class|validator)/i },
  { signal: 'context-exfiltration', pattern: /(dump|export|save|write)\s+(?:context|conversation|history|memory)/i },
];

// ── In-Memory Tracking (for rate limiting + anomaly detection) ────────────────

/** Per-crewId token usage window (sliding, 1 second). */
const tokenUsageByCrewId = new Map<string, Array<{ timestamp: number; tokens: number }>>();

/** Per-crewId auth failure log (sliding, 60 seconds). */
const authFailuresByCrewId = new Map<string, number[]>();

/** Global audit log (in-memory, best-effort; rotates at MAX). */
const auditLog: ChatValidationAuditEntry[] = [];
const AUDIT_MAX = 1000;

function recordAudit(entry: ChatValidationAuditEntry): void {
  auditLog.push(entry);
  if (auditLog.length > AUDIT_MAX) {
    auditLog.splice(0, auditLog.length - AUDIT_MAX);
  }
}

/** Retrieve audit log (read-only, no secrets). */
export function getChatValidationAuditLog(): ChatValidationAuditEntry[] {
  return [...auditLog];
}

// ── Token Usage Tracking (Rate Limiting) ─────────────────────────────────────

/**
 * Track token usage for a crew member and detect bursts.
 * Returns { allowed: boolean, windowsRemaining: number }.
 */
function trackTokenUsage(crewId: string, tokenCount: number): { allowed: boolean; windowsRemaining: number } {
  const now = Date.now();
  const cutoff = now - BURST_WINDOW_MS;

  let usage = tokenUsageByCrewId.get(crewId) ?? [];
  // Prune old entries outside the window
  usage = usage.filter(e => e.timestamp >= cutoff);

  const tokensInWindow = usage.reduce((sum, e) => sum + e.tokens, 0);
  const projectedTotal = tokensInWindow + tokenCount;

  // Check burst: if adding these tokens exceeds rate limit
  const burstDetected = projectedTotal > RATE_LIMIT_TOKENS_PER_SEC;

  // Record this usage
  usage.push({ timestamp: now, tokens: tokenCount });
  tokenUsageByCrewId.set(crewId, usage);

  const windowsRemaining = Math.max(0, Math.floor((SECTION31_BUDGET_TOKENS_PER_CREW - projectedTotal) / BURST_WINDOW_MS));

  return { allowed: !burstDetected, windowsRemaining };
}

// ── Auth Failure Tracking (Attack Detection) ───────────────────────────────────

/**
 * Record an auth failure for anomaly detection.
 * Returns true if the failure count exceeds the threshold.
 */
function recordAuthFailure(crewId: string): boolean {
  const now = Date.now();
  const cutoff = now - AUTH_FAILURE_WINDOW_MS;

  let failures = authFailuresByCrewId.get(crewId) ?? [];
  failures = failures.filter(ts => ts >= cutoff);
  failures.push(now);

  authFailuresByCrewId.set(crewId, failures);

  return failures.length >= AUTH_FAILURE_THRESHOLD;
}

// ── Injection Detection ──────────────────────────────────────────────────────

/**
 * Detect prompt injection signals in a message.
 * Returns array of detected signal types.
 */
function detectInjectionSignals(message: string): string[] {
  const text = String(message ?? '');
  return INJECTION_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ signal }) => signal);
}

// ── Sanitization (Directive Removal) ────────────────────────────────────────

/**
 * Sanitize a chat request by removing unsafe directives while preserving the core message.
 * Does NOT remove injection attempts (that's for detectChatAnomaly to flag).
 * Only removes explicit directives that could bypass safety controls.
 */
export function sanitizeChatRequest(message: string): ChatSanitizationResult {
  const original = String(message ?? '').trim();
  const lines = original.split(/\r?\n/);
  const injectionSignals = detectInjectionSignals(original);

  // Directives that are ALWAYS safe to remove (they're meta-controls, not content)
  const UNSAFE_DIRECTIVE_PATTERNS = [
    /^\s*directive\s*:\s*(no-crew-preflight|analyze-only)\s*$/i, // These are meta, safe to strip
  ];

  const removed: string[] = [];
  const kept: string[] = [];

  for (const line of lines) {
    let isDirective = false;
    for (const pattern of UNSAFE_DIRECTIVE_PATTERNS) {
      if (pattern.test(line)) {
        removed.push(line.trim());
        isDirective = true;
        break;
      }
    }
    if (!isDirective) kept.push(line);
  }

  const sanitized = kept.join('\n').trim();

  return {
    isClean: injectionSignals.length === 0,
    sanitized: sanitized || original,
    original,
    injectionSignals,
    removedDirectives: removed,
  };
}

// ── Main Validation Functions ────────────────────────────────────────────────

/**
 * CREDENTIAL AUTHORIZATION: Validate chat request can access CREW_LLM_APPROVED_KEY.
 *
 * - Checks WorfGate authorization
 * - Verifies credential is available (present in env)
 * - Records audit entry (NO credential value logged)
 * - Detects repeated auth failure patterns
 *
 * @param crewId Crew member ID (crew identity for authorization)
 * @param clientId Optional client ID for multi-tenant auditing
 * @returns ChatValidationResult with status code (401 if denied, 200 if authorized)
 */
export function validateChatCredentials(
  crewId?: string,
  clientId?: string | null,
): ChatValidationResult {
  const effectiveCrewId = (crewId ?? 'vscode-chat').toLowerCase();
  const ts = new Date().toISOString();

  // Try to resolve the credential through WorfGate
  const credResult = resolveWorfGateCredential('CREW_LLM_APPROVED_KEY', {
    operation: 'llm:call',
    crewId: effectiveCrewId,
    clientId,
  });

  const authorized = credResult.authorized && credResult.available;

  // Detect repeated failures (attack pattern)
  let authAttackPattern = false;
  if (!authorized) {
    authAttackPattern = recordAuthFailure(effectiveCrewId);
  }

  const statusCode = authorized ? 200 : authAttackPattern ? 403 : 401;

  const flags: ChatAnomalyFlags = {
    injectionAttempted: false,
    rateLimited: false,
    authAttackPattern,
    tokenBurst: false,
    payloadSuspicious: false,
    details: {},
  };

  if (authAttackPattern) {
    flags.details.authAttack = `Repeated auth failures detected for ${effectiveCrewId}`;
  }

  recordAudit({
    timestamp: ts,
    crewId: effectiveCrewId,
    clientId,
    authorized,
    statusCode,
    reason: credResult.reason,
    flags: {
      injectionAttempted: false,
      rateLimited: false,
      authAttackPattern,
      tokenBurst: false,
      payloadSuspicious: false,
    },
  });

  return {
    authorized,
    statusCode,
    reason: credResult.reason,
    flags: authAttackPattern ? flags : undefined,
  };
}

/**
 * ANOMALY DETECTION: Detect rate limiting, injection attempts, payload anomalies.
 *
 * - Rate limiting: token bursts > 50 tokens/sec
 * - Injection attempts: prompt injection signal patterns
 * - Payload size: > 1 MB triggers suspicious flag
 * - Burst detection: unusual token spikes from same crew member
 *
 * @param message Chat message to analyze
 * @param crewId Crew member ID (for rate limiting tracking)
 * @param tokenCount Estimated token count (for rate limiting)
 * @returns ChatAnomalyFlags with detected anomalies; returns empty flags if all clear
 */
export function detectChatAnomaly(
  message: string,
  crewId?: string,
  tokenCount?: number,
): ChatAnomalyFlags & { injectionSignals: string[] } {
  const effectiveCrewId = (crewId ?? 'vscode-chat').toLowerCase();
  const text = String(message ?? '');
  const injectionSignals = detectInjectionSignals(text);
  const estimatedTokens = tokenCount ?? Math.ceil(text.length / 4);

  // Check payload size
  const payloadBytes = new TextEncoder().encode(text).length;
  const payloadSuspicious = payloadBytes > MAX_PAYLOAD_SIZE_BYTES;

  // Check rate limiting
  const rateCheck = trackTokenUsage(effectiveCrewId, estimatedTokens);
  const rateLimited = !rateCheck.allowed;

  const flags: ChatAnomalyFlags & { injectionSignals: string[] } = {
    injectionAttempted: injectionSignals.length > 0,
    rateLimited,
    authAttackPattern: false, // Checked separately in validateChatCredentials
    tokenBurst: rateLimited, // Burst = rate limit exceeded
    payloadSuspicious,
    details: {},
    injectionSignals,
  };

  if (injectionSignals.length > 0) {
    flags.details.injectionSignals = injectionSignals.join(', ');
  }

  if (payloadSuspicious) {
    flags.details.payloadSize = `${Math.round(payloadBytes / 1024)} KB (limit: ${Math.round(MAX_PAYLOAD_SIZE_BYTES / 1024)} KB)`;
  }

  if (rateLimited) {
    flags.details.tokenBurst = `${estimatedTokens} tokens in ${BURST_WINDOW_MS}ms window (limit: ${RATE_LIMIT_TOKENS_PER_SEC}/sec)`;
  }

  return flags;
}

/**
 * UNIFIED VALIDATION: Run full security checks on a chat request.
 *
 * Combines credential validation + anomaly detection into a single pass.
 * Returns a comprehensive ChatValidationResult that integrates both checks.
 *
 * Veto conditions (immediate 401/403/429):
 * - Missing credential authorization (401)
 * - Repeated auth failure attacks (403)
 * - Rate limit exceeded (429)
 * - Injection attempt detected (403)
 *
 * @param message Chat message to validate
 * @param options.crewId Crew member ID (default: 'vscode-chat')
 * @param options.clientId Optional client ID for multi-tenant auditing
 * @param options.tokenCount Optional token count (auto-estimated if omitted)
 * @returns ChatValidationResult with all checks applied
 */
export function validateChatRequest(
  message: string,
  options?: {
    crewId?: string;
    clientId?: string | null;
    tokenCount?: number;
  },
): ChatValidationResult {
  const crewId = options?.crewId ?? 'vscode-chat';
  const clientId = options?.clientId ?? null;
  const tokenCount = options?.tokenCount;

  const ts = new Date().toISOString();

  // Step 1: Validate credentials
  const credCheck = validateChatCredentials(crewId, clientId);
  if (!credCheck.authorized) {
    return credCheck; // 401 or 403 (with auth attack flag)
  }

  // Step 2: Detect anomalies
  const anomalies = detectChatAnomaly(message, crewId, tokenCount);

  // Step 3: Determine final status code and reason
  let statusCode = 200;
  let reason = 'chat_authorized';
  const flags = anomalies;

  if (anomalies.injectionAttempted) {
    statusCode = 403;
    reason = 'prompt_injection_detected';
  } else if (anomalies.rateLimited) {
    statusCode = 429;
    reason = 'rate_limit_exceeded';
  } else if (anomalies.payloadSuspicious) {
    statusCode = 413;
    reason = 'payload_too_large';
  }

  // Determine if ANY anomaly flag is set
  const hasAnomalies =
    anomalies.injectionAttempted ||
    anomalies.rateLimited ||
    anomalies.authAttackPattern ||
    anomalies.tokenBurst ||
    anomalies.payloadSuspicious;

  // Record audit entry
  recordAudit({
    timestamp: ts,
    crewId,
    clientId,
    authorized: statusCode === 200,
    statusCode,
    reason,
    tokenCount: tokenCount ?? Math.ceil(String(message).length / 4),
    flags: hasAnomalies
      ? {
          injectionAttempted: anomalies.injectionAttempted,
          rateLimited: anomalies.rateLimited,
          authAttackPattern: anomalies.authAttackPattern,
          tokenBurst: anomalies.tokenBurst,
          payloadSuspicious: anomalies.payloadSuspicious,
        }
      : undefined,
    injectionSignalsCount: (anomalies as any).injectionSignals?.length ?? 0,
  });

  const rateCheck = trackTokenUsage(crewId, tokenCount ?? Math.ceil(String(message).length / 4));

  return {
    authorized: statusCode === 200,
    statusCode,
    reason,
    flags: hasAnomalies ? flags : undefined,
    metadata: {
      tokenCount: tokenCount ?? Math.ceil(String(message).length / 4),
      crewId,
      windowsRemaining: rateCheck.windowsRemaining,
      injectionSignalsDetected: anomalies.injectionSignals?.length ?? 0,
    },
  };
}

// ── Async Variants (for credential provider chain) ──────────────────────────

/**
 * Async variant of validateChatCredentials (reserved for future Vault/Secrets Manager integration).
 * Currently a pass-through to the sync version, but allows for async credential providers.
 */
export async function validateChatCredentialsAsync(
  crewId?: string,
  clientId?: string | null,
): Promise<ChatValidationResult> {
  // For now, just call the sync version.
  // In future, this can walk the async credential provider chain.
  return validateChatCredentials(crewId, clientId);
}

/**
 * Async variant of validateChatRequest for future async credential checks.
 * Currently a pass-through to the sync version.
 */
export async function validateChatRequestAsync(
  message: string,
  options?: {
    crewId?: string;
    clientId?: string | null;
    tokenCount?: number;
  },
): Promise<ChatValidationResult> {
  return validateChatRequest(message, options);
}

// ── Helpers: Error Response Builders ────────────────────────────────────────

/**
 * Build a standard error response for a validation failure.
 * Used by API handlers to return consistent error format.
 */
export function buildValidationErrorResponse(result: ChatValidationResult): {
  statusCode: number;
  error: { code: string; message: string; flags?: Partial<ChatAnomalyFlags> };
} {
  const errorCode = result.statusCode === 401 ? 'unauthorized' : result.statusCode === 429 ? 'rate_limited' : result.statusCode === 413 ? 'payload_too_large' : 'forbidden';

  return {
    statusCode: result.statusCode,
    error: {
      code: errorCode,
      message: result.reason,
      flags: result.flags
        ? {
            injectionAttempted: result.flags.injectionAttempted,
            rateLimited: result.flags.rateLimited,
            authAttackPattern: result.flags.authAttackPattern,
            tokenBurst: result.flags.tokenBurst,
            payloadSuspicious: result.flags.payloadSuspicious,
          }
        : undefined,
    },
  };
}
