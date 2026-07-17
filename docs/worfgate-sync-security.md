# WorfGate Sync Security — Real-time WebSocket Protection

## Overview

WorfGate Sync Security is the security layer protecting real-time UI synchronization via WebSocket. It implements **JWT-based per-message authentication**, **adaptive rate limiting**, and **immutable audit trails** for all sync operations.

## Architecture

### Three Security Layers

1. **Session JWT Validator** (`worfgate-sync-validator.ts`)
   - Per-message JWT validation
   - Token refresh mechanism (auto-refresh at 80% TTL)
   - Injection detection for payloads
   - Session binding and revocation

2. **Rate Limiter** (`sync-rate-limiter.ts`)
   - Per-user global limit: 1000 messages/min (16.67/sec)
   - Per-connection burst limit: 10 messages/sec
   - Adaptive throttling on budget depletion
   - Graceful fallback (429 without close)

3. **Immutable Audit Trail** (`sync-audit-trail.ts`)
   - Cryptographically signed entries (HMAC-SHA256)
   - Ring buffer (10K entries in-memory)
   - Queryable by user/session/timestamp/status
   - Integrity verification and Merkle root

### Integration Point

`ChatWebSocketSync` (updated with WorfGate hooks):
- Creates session JWT on WebSocket `hello`
- Validates JWT + rate limits + injection detection on every message
- Logs all operations to audit trail
- Provides metrics including security stats

## Security Flow

### Connection Lifecycle

```
1. Client connects to ws://server/sync
   ↓
2. Client sends 'hello' with userId, sessionId, crewId, surface
   ↓
3. Server resolves CREW_LLM_APPROVED_KEY (WorfGate credential broker)
   ↓
4. Server creates session JWT (1 hour TTL, bound to sessionId)
   ↓
5. Server registers for rate limiting
   ↓
6. Server sends hello response with JWT + replayed messages
   ↓
7. Client keeps JWT for all future messages
```

### Message Validation

```
Client sends sync message with JWT
   ↓
1. Rate Limit Check
   ├─ Check burst limit (10 msg/sec)
   ├─ Check minute window limit (1000 msg/min)
   └─ If exceeded → 429 message (no close)
   ↓
2. JWT Validation
   ├─ Verify signature (HMAC-SHA256)
   ├─ Check expiry
   ├─ Check session binding
   ├─ Check revocation status
   └─ Auto-refresh if needed (80% TTL)
   ↓
3. Injection Detection
   ├─ Scan for script tags, SQL, command injection
   ├─ Check payload size (<10 MB)
   └─ Sanitize on defense-in-depth
   ↓
4. Operation Scope Check
   ├─ Verify 'ui:sync:read' or 'ui:sync:write' scope
   └─ Reject if not in scopes
   ↓
5. Log to Audit Trail
   └─ Record message: timestamp, status, reason, crew ID
   ↓
6. Broadcast to Session
   └─ Send to all connected clients in session
```

## Veto Criteria (Hard Block)

### 401 Unauthorized (Close Connection)
- Missing CREW_LLM_APPROVED_KEY
- Invalid JWT signature
- Expired token

### 403 Forbidden (Close + Revoke)
- Session mismatch (JWT sessionId ≠ actual sessionId)
- Session revoked (blacklist entry)
- Injection detected (script tags, SQL, command injection, etc.)
- Operation scope mismatch (missing required scope)

### 429 Rate Limited (No Close)
- Burst limit exceeded (>10 msg/sec in 1 second)
- Minute window limit exceeded (>1000 msg/min)
- Send 429 message with `retryAfterMs` and fallback suggestion
- Connection stays open; client can retry after backoff

## JWT Token Format

```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sessionId": "session-uuid",
  "crewId": "riker",
  "scopes": ["ui:sync:read", "ui:sync:write"],
  "iat": 1234567890,
  "exp": 1234571490,
  "ver": 1
}

Signature: HMAC-SHA256(header.payload, CREW_LLM_APPROVED_KEY)
```

### Token Lifecycle

- **TTL**: 1 hour (3600 seconds)
- **Auto-refresh**: At 80% TTL (2880 seconds elapsed)
- **Refresh response**: New token in sync message with `refreshToken` field
- **Session binding**: JWT tied to specific `sessionId`, must match on every message

## Rate Limiting

### Per-Connection Limits

- **Burst**: 10 messages/second (1-second sliding window)
- **Minute**: 1000 messages/minute (60-second sliding window)
- **Strategy**: Accept up to burst limit, keep running minute total, reject if total > 1000

### When Rate Limited

1. Check `rateLimitStatus.allowed`
2. If `false`:
   - Send 429 error message (do NOT close connection)
   - Suggest fallback: `http_polling` or `backoff`
   - Include `retryAfterMs` (time until quota resets)
3. Client can retry after backoff or switch to HTTP polling

### Auto-Recovery

- Quota resets after 60-second idle (no messages)
- Per-user cross-connection aggregate tracking
- Metrics available for monitoring (total messages/min, active connections)

## Injection Detection

### Patterns Detected

1. **Script Tags**: `<script[^>]*>`
2. **Event Handlers**: `\s+on\w+\s*=` (onclick, onerror, etc.)
3. **Protocol Bypass**: `javascript:`, `data:`, `vbscript:`
4. **SQL Injection**: Quotes, semicolons, DROP/DELETE/INSERT/UPDATE
5. **Command Injection**: Shell metacharacters (`;`, `|`, `&`, `` ` ``, `$`, `()`)
6. **Env Var Access**: `process.env`, `__dirname`, `__filename`
7. **Eval Patterns**: `eval()`, `Function()`, `execScript()`

### Sanitization

- Removes script tags: `<script>.*?</script>`
- Replaces event handlers: `on\w+=` → `data-`
- Neutralizes protocols: `javascript:` → `safe:`
- Defense-in-depth (injection = hard block, sanitization = extra layer)

## Audit Trail

### Entry Format

```typescript
interface SyncAuditEntry {
  sequence: number;           // Auto-incrementing
  timestamp: string;          // ISO 8601
  messageId: string;          // Unique message ID
  userId: string;             // Non-secret
  sessionId: string;          // Non-secret
  action: 'hello'|'sync'|'ping'|'close'|'error';
  status: 'success'|'rejected'|'error'|'rate_limited'|'timeout';
  reason: string;             // No secrets
  signature: string;          // HMAC-SHA256
  bytesTransferred?: number;  // Analytics
  processingTimeMs?: number;  // Latency
}
```

### Integrity

- **Immutable**: Append-only, no updates or deletes
- **Signed**: Each entry signed with HMAC-SHA256
- **Sequence Verification**: Detect missing or out-of-order entries
- **Checksum**: Merkle root of entire trail for periodic integrity checks

### Querying

```typescript
// Query by user
trail.query({ userId: 'riker', since: '2024-01-01T00:00:00Z' });

// Query by status
trail.query({ status: 'rejected', limit: 100 });

// Verify integrity
const check = trail.verifyIntegrity();
console.log(`Valid: ${check.valid}, Gaps: ${check.sequenceGaps.length}`);

// Replay for conflict resolution
const entries = trail.replay({ userId, since });
```

## Integration with Chat WebSocket

### Connection Handler (hello)

```typescript
private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  // 1. Parse hello message
  // 2. Resolve CREW_LLM_APPROVED_KEY via WorfGate
  // 3. Create session JWT → jwtResponse
  // 4. Register connection in pool
  // 5. Register for rate limiting
  // 6. Audit: log success
  // 7. Send hello response with JWT
}
```

### Message Handler (sync)

```typescript
private async handleMessage(connectionId: string, crewId: string, data: RawData): Promise<void> {
  // 1. Rate limit check → rateLimitStatus
  // 2. If not allowed → 429 message (no close)
  // 3. Validate message → validation = validateSyncMessage(jwt, ...)
  // 4. If not authorized → close + revoke session
  // 5. Broadcast to session
  // 6. Audit: log success/rejection
}
```

### Disconnect Handler

```typescript
private handleDisconnect(connectionId: string | null, sessionId: string | null, userId: string | null): void {
  // 1. Audit: log disconnect
  // 2. Unregister from rate limiter
  // 3. Unregister from connection pool
}
```

## Performance Targets

- **JWT validation**: <10ms per message
- **Rate limit check**: <5ms per message
- **Audit logging**: <2ms per entry
- **Total auth overhead**: <20ms per message

## Monitoring & Metrics

### Available Metrics

```typescript
// Get all metrics
const metrics = sync.getMetrics();

// Includes:
// - pool: active connections, messages sent/received
// - queue: queued messages, retention
// - rateLimit: active connections, total messages in window
// - audit: entries by status, unique users/sessions
// - worfgate: active sessions, tokens, audit log size
```

### Health Checks

- Periodic: Every 60 seconds
- Prune stale connections: Every 5 minutes
- Verify audit trail integrity: On demand (can be expensive)

## Error Responses

### 401 Unauthorized

```json
{
  "type": "error",
  "statusCode": 401,
  "reason": "invalid_token_signature",
  "flags": {
    "tokenInvalid": true,
    "tokenExpired": false
  }
}
```

### 403 Forbidden

```json
{
  "type": "error",
  "statusCode": 403,
  "reason": "injection_detected",
  "flags": {
    "injectionAttempted": true,
    "details": {
      "signals": "script-tag,command-injection"
    }
  }
}
```

### 429 Rate Limited

```json
{
  "type": "error",
  "statusCode": 429,
  "reason": "minute_limit_exceeded",
  "retryAfterMs": 30000,
  "suggestedFallback": "http_polling"
}
```

## Credential Broker Integration

All JWT signing uses **WorfGate credential broker**:

```typescript
const cred = resolveWorfGateCredential('CREW_LLM_APPROVED_KEY', {
  operation: 'llm:call',
  crewId: 'worf',  // Only Worf can access sync validator
});
```

- **Required**: CREW_LLM_APPROVED_KEY must be present
- **Audited**: Every credential access logged (no value)
- **Bounded**: Crew-only access (11 authorized members)
- **Governed**: O'Brien can break-glass override (rate-limited, monitored)

## Testing

### Unit Test Skeletons

```typescript
describe('SyncJwtValidator', () => {
  it('creates valid JWT tokens', () => {});
  it('validates JWT signatures', () => {});
  it('rejects expired tokens', () => {});
  it('detects session mismatch', () => {});
  it('detects injection signals', () => {});
  it('auto-refreshes at 80% TTL', () => {});
});

describe('SyncRateLimiter', () => {
  it('allows burst up to 10 msg/sec', () => {});
  it('rejects minute limit exceeded', () => {});
  it('recovers after idle period', () => {});
  it('tracks per-user aggregate', () => {});
});

describe('SyncAuditTrail', () => {
  it('signs each entry with HMAC-SHA256', () => {});
  it('detects signature tampering', () => {});
  it('verifies sequence continuity', () => {});
  it('queries by userId/sessionId/status', () => {});
});
```

### Mock Credential Broker

```typescript
// For testing, mock WorfGate credential broker
resolveWorfGateCredential.mockReturnValue({
  authorized: true,
  available: true,
  value: 'test-key-value',
  reason: 'mocked',
});
```

## Deployment Checklist

- [ ] `CREW_LLM_APPROVED_KEY` configured in `~/.zshrc` or AWS Secrets Manager
- [ ] `SYNC_AUDIT_SIGNING_KEY` configured (if custom key needed)
- [ ] WebSocket endpoint on port 3106 (or configured port)
- [ ] Health checks enabled (60-second interval)
- [ ] Metrics endpoint `/sync/metrics` available
- [ ] Audit trail queryable via API
- [ ] Rate limiter pruning enabled (5-minute interval)
- [ ] Crew access verified (Worf owns sync validator)

## References

- [WorfGate Credentials](../worfgate-credentials.ts)
- [Chat Validator Pattern](../worfgate-chat-validator.ts)
- [WebSocket Sync Endpoint](../chat-websocket-sync.ts)
- [HTTP Auth Middleware](../http-auth-middleware.ts) — Similar JWT patterns

## Future Enhancements (Phase 3+)

- [ ] Supabase integration for audit trail persistence
- [ ] Distributed rate limiting (Redis-backed for multi-node)
- [ ] Token revocation list (blocklist for compromised tokens)
- [ ] Automatic key rotation (credential manager integration)
- [ ] Metrics export (Prometheus/CloudWatch)
- [ ] Advanced anomaly detection (behavioral analysis)
- [ ] Session migration (reconnection with new token)
