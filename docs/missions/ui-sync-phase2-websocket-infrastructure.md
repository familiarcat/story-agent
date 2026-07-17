# UI Sync Phase 2: Real WebSocket Infrastructure (Week 2-3)

**Status:** PENDING (Activate only after Phase 1 GREEN gate)  
**Timeline:** T+7 days to completion gate  
**Execution Mode:** Autonomous (OpenRouter crew)  
**Depends On:** Phase 1 completion (Zustand store + VSCode integration + cost model)  

## Executive Summary

Phase 2 builds the real WebSocket infrastructure that Phase 1 mocked. Three teams work in **parallel**, implementing the production sync endpoint, security schema, and deployment integration.

### Teams & Leaders
- **Team 4 (Geordi):** WebSocket infrastructure → `packages/mcp-server/src/lib/chat-websocket-sync.ts`
- **Team 5 (Worf):** Per-message auth + audit → extend `worfgate-chat-validator.ts`
- **Team 6 (O'Brien):** Integration + DevOps → Docker, local setup, rollback

### Timeline (Relative to Phase 1 GREEN)
- **T+0 (Phase 1 GREEN):** All Phase 2 teams kickoff immediately
- **T+3 days:** Geordi + Worf deliver (O'Brien depends on both)
- **T+3.5 days:** O'Brien integrates
- **T+4 days:** Gate check (all teams report completion + >99.9% sync success)
- **FINAL GREEN:** Ready for staging deployment (Section 31 production)

---

## Team 4: Geordi La Forge — WebSocket Infrastructure

**Deliverable:** `packages/mcp-server/src/lib/chat-websocket-sync.ts`  
**Deadline:** T+3 days (parallel with Worf)  
**Role:** Build the real WebSocket endpoint + connection pooling + message replay  

### Requirements (Priority Order)

#### 1. WebSocket Endpoint at `/sync` (Port 3106)

Create a real WebSocket server on port 3106 (separate from chat endpoint on 3105):

```typescript
// Usage in mcp-server main.ts:
const syncServer = new ChatSyncWebSocketServer();
const httpServer = http.createServer();
syncServer.attach(httpServer, '/sync');
httpServer.listen(3106);
```

**Message protocol:**
- Client → Server: `{ type: 'sync', messages: SyncMessage[], sessionId: string, userId: string }`
- Server → Client: `{ type: 'sync_ack', id: string, status: 'queued' | 'processing', timestamp: number }`
- Server → Client: `{ type: 'sync_complete', id: string, status: 'synced' | 'conflict', result: any }`

#### 2. Connection Pooling

- **Max connections:** 1,000 concurrent per process (configurable)
- **Session tracking:** Maintain session state per connection
- **Keepalive:** Send ping every 30s, expect pong within 5s
- **Auto-disconnect:** Close if unresponsive for 60s
- **Connection rebalancing:** If pool fills >80%, log warning, reject new connections with `1008` code

#### 3. Message Queue & Replay on Reconnect

**Message queue behavior:**
- Queue up to 100 unacknowledged messages per client
- On disconnect: preserve queue in memory (Redis for persistence Phase 3)
- On reconnect: send queued messages before new ones
- Dedup: check message ID to avoid double-delivery
- TTL: Expire queue entries after 5 minutes

**Replay protocol:**
```typescript
Client disconnects
  → Server keeps queue (sessionId → messages[])
Client reconnects with same sessionId
  → Server: "Here are your undelivered messages"
  → Server: send buffered batch
  → Client ACKs
  → Server: clear buffer
```

#### 4. Health Checks & Metrics

Expose internal `/health` endpoint returning:

```json
{
  "status": "healthy" | "degraded" | "critical",
  "timestamp": "2026-07-17T12:00:00Z",
  "metrics": {
    "activeConnections": 42,
    "activeSessions": 38,
    "queueDepth": 127,
    "messagesThroughput": 2134,
    "avgLatencyMs": 247,
    "errorRate": 0.002,
    "uptimeSeconds": 86400
  }
}
```

Log metrics every 10s to RAG with tag `ui-sync-geordi-metrics`.

#### 5. Latency & Throughput Targets

- **Connection setup:** <100ms (TCP handshake + WebSocket upgrade)
- **Message round-trip (immediate):** <50ms
- **Message round-trip (batched, 300ms):** <400ms total
- **P99 latency:** <500ms on 10 concurrent connections
- **Throughput:** >1,000 messages/sec per connection
- **Error rate:** <0.1% (target 99.9% success)

#### 6. Error Handling

- **Invalid JSON:** Close connection with `1002` (protocol error)
- **Missing fields:** Respond with error, don't close
- **Queue overflow:** Respond `status: 'queued'`, retry on next sync
- **Service unavailable:** Return `503` via HTTP health endpoint
- **Timeout:** 30s max per request, auto-cancel + return timeout error

#### 7. Documentation & Tests

- **JSDoc:** Every exported function + class
- **Integration tests:** vitest with mock WebSocket client
- **Stress tests:** Simulate 100 concurrent connections, verify <500ms P99 latency
- **Failure tests:** Connection drops, queue overflow, malformed messages

### Success Criteria (All must be TRUE for gate)

- [ ] WebSocket endpoint running on port 3106
- [ ] Connection pooling (max 1,000)
- [ ] Message replay on reconnect (dedup working)
- [ ] Health endpoint responding
- [ ] Metrics logged every 10s to RAG
- [ ] <100ms connection setup
- [ ] <500ms P99 latency on 10 concurrent connections
- [ ] >1,000 messages/sec throughput
- [ ] <0.1% error rate
- [ ] >5 integration tests pass
- [ ] >5 stress tests pass
- [ ] JSDoc on 100% of exports
- [ ] Ready for git

### Git Deliverable

```bash
# Branch: feature/ui-sync-phase2
# Commit:
git commit -m "feat(sync): WebSocket endpoint + connection pooling + message replay

- Real WebSocket server on port 3106 (/sync endpoint)
- Connection pooling (max 1,000 concurrent)
- Message queue + replay on reconnect
- Dedup logic (prevent double-delivery)
- Health checks + metrics (logged to RAG)
- <100ms connection setup, <500ms P99 latency
- >1,000 messages/sec throughput
- >10 integration + stress tests"
```

### RAG Completion Signal

```
Tag: ui-sync-phase2-geordi-complete
Content:
- WebSocket endpoint running (port 3106)
- Connection pooling: 1,000 max
- Message replay: working + dedup verified
- Latency: <500ms P99 confirmed
- Throughput: >1,000 msg/sec
- Health metrics: logged to RAG
- Test results: integration + stress tests passing
- Ready for: Worf auth integration + O'Brien deployment
```

**Impact:** UNBLOCKS Worf (auth schema) and O'Brien (integration).

---

## Team 5: Lt. Worf (Security) — Per-Message Auth Schema

**Deliverable:** Extend `packages/shared/src/worfgate-chat-validator.ts`  
**Deadline:** T+3 days (parallel with Geordi)  
**Role:** Implement JWT auth, rate limiting, injection detection, audit logging  

### Requirements (Priority Order)

#### 1. JWT Signing & Verification (WorfGate)

Extend the existing `worfgate-chat-validator.ts` to handle sync messages:

**JWT Schema:**
```typescript
interface SyncMessageJWT {
  sub: string;           // user ID
  sessionId: string;     // session ID
  iat: number;           // issued at
  exp: number;           // expires at (5 min TTL)
  messageCount: number;  // sequence number
  payload: SyncMessage;  // the actual sync payload
  sig: string;           // HMAC signature
}
```

**Signing (server-side):**
```typescript
const jwt = signSyncMessage({
  userId: 'user123',
  sessionId: 'sess456',
  messageCount: 42,
  payload: {type: 'chat', message: 'hello'},
  secret: worfgateSecret
});
```

**Verification (on receive):**
```typescript
const verified = verifySyncMessage(jwt, worfgateSecret);
if (!verified) reject('invalid_signature');
if (Date.now() > verified.exp) reject('expired');
```

#### 2. Rate Limiting (Per-User)

Implement token-bucket rate limiter:

**Policy:**
- 10 requests/second per user (burst capacity: 20)
- If exceeded: return `429` (too many requests) + backoff header
- Log rate limit violations to RAG for analysis

**Enforcement:**
```typescript
const rateLimiter = new PerUserRateLimiter({
  requestsPerSecond: 10,
  burstCapacity: 20,
});

if (!rateLimiter.tryConsume(userId)) {
  return response.status(429).json({error: 'rate_limit_exceeded'});
}
```

#### 3. Injection Detection (Sync Payloads)

Detect malicious payloads (SQL injection, command injection, etc.):

**Validation rules:**
- Max message length: 10KB
- Disallow control characters (except newlines)
- Disallow script tags in chat messages
- Disallow raw SQL in metadata fields
- Validate all fields match expected types

**Example:**
```typescript
function validateSyncPayload(payload: any): boolean {
  if (payload.message?.length > 10000) return false;
  if (/<script|<iframe|javascript:/i.test(payload.message)) return false;
  if (payload.metadata && typeof payload.metadata !== 'object') return false;
  return true;
}
```

Log suspicious payloads to RAG with tag `ui-sync-injection-attempt`.

#### 4. Immutable Audit Logging (WorfGate)

Log every sync message to an append-only audit trail:

**Audit entry format:**
```typescript
interface AuditEntry {
  timestamp: ISO8601;
  userId: string;
  sessionId: string;
  messageId: string;
  action: 'sync_received' | 'sync_validated' | 'sync_queued' | 'sync_sent';
  status: 'success' | 'failed';
  reason?: string;
  signature: string;  // HMAC of entire entry
}
```

**Storage:**
- Write to immutable log: `packages/mcp-server/logs/audit-sync-{date}.jsonl`
- Also write to RAG with tag `ui-sync-audit-{date}`
- Sign each entry with WorfGate key (no tampering)

**Verification (for compliance):**
```typescript
function verifyAuditEntry(entry: AuditEntry, worfgateKey: string): boolean {
  const expected = hmac(JSON.stringify(entry), worfgateKey);
  return entry.signature === expected;
}
```

#### 5. Error Responses

Implement security-appropriate error responses:

- **Invalid JWT:** `{ status: 401, error: 'unauthorized' }` (no details)
- **Rate limited:** `{ status: 429, error: 'too_many_requests', retryAfter: 5 }`
- **Injection detected:** `{ status: 400, error: 'invalid_payload' }` (no details)
- **Expired session:** `{ status: 401, error: 'session_expired' }`

**Log all errors to RAG + audit trail.**

#### 6. Documentation & Tests

- **JSDoc:** Every exported function + class
- **Security tests:** vitest with malicious payloads
- **JWT tests:** Sign + verify round-trip
- **Rate limit tests:** Verify bucket fills + drains correctly
- **Injection tests:** SQL, XSS, command injection payloads
- **Audit log tests:** Verify entries signed + immutable

### Success Criteria (All must be TRUE for gate)

- [ ] JWT signing + verification working
- [ ] Rate limiting enforced (10 req/sec per user)
- [ ] Injection detection active (blocks malicious payloads)
- [ ] Audit logging to file + RAG (100% coverage)
- [ ] All audit entries signed (verified)
- [ ] Error responses don't leak details
- [ ] <10ms auth overhead per message
- [ ] >10 security tests pass
- [ ] JSDoc on 100% of exports
- [ ] Ready for git

### Git Deliverable

```bash
# Branch: feature/ui-sync-phase2
# Commit:
git commit -m "feat(security): Per-message JWT auth + rate limiting + injection detection

- JWT signing + verification (5 min TTL)
- Rate limiting: 10 req/sec per user, burst capacity 20
- Injection detection (SQL, XSS, command injection)
- Immutable audit logging (file + RAG)
- Audit entries signed (HMAC verified)
- <10ms auth overhead per message
- >10 security tests"
```

### RAG Completion Signal

```
Tag: ui-sync-phase2-worf-complete
Content:
- JWT auth: working + TTL verified
- Rate limiting: 10 req/sec enforced
- Injection detection: all payload types blocked
- Audit logging: 100% coverage, all entries signed
- Security tests: passing
- Auth overhead: <10ms
- Ready for: O'Brien integration
```

**Impact:** UNBLOCKS O'Brien to integrate auth with deployment.

---

## Team 6: Chief O'Brien (DevOps) — Integration & Deployment

**Deliverable:** Docker config + local setup + extension update  
**Dependency:** Waits for Geordi + Worf to complete  
**Deadline:** T+3.5 days (after Geordi + Worf)  
**Role:** Wire Zustand sync → WebSocket endpoint, update extension, create deployment config  

### Requirements (Priority Order)

#### 1. Wire Zustand Sync Middleware → WebSocket Endpoint

Update the sync middleware in VSCode extension to use Geordi's real WebSocket:

**Phase 1 (mock):** `mockWebSocketSync()` → logs only
**Phase 2 (real):** `realWebSocketSync()` → connects to ws://localhost:3106/sync

**Implementation:**
```typescript
// In packages/vscode-extension/src/chat/chat-engine.ts:

// Replace mockWebSocketSync with:
async function realWebSocketSync(messages: SyncMessage[]): Promise<SyncResponse> {
  const ws = new WebSocket('ws://localhost:3106/sync');
  
  ws.onopen = () => {
    const jwt = signMessage({...}); // Use Worf's JWT
    ws.send(JSON.stringify({
      type: 'sync',
      messages,
      jwt
    }));
  };
  
  return new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      resolve(response);
    };
    ws.onerror = () => reject(new Error('sync_error'));
  });
}
```

**Fallback:** If WebSocket fails → fall back to mock (graceful degradation)

#### 2. Update VSCode Extension to Use Real WebSocket

Modify `chat-engine.ts` to conditionally use real or mock sync:

```typescript
const useRealSync = process.env.VSCODE_SYNC_REAL === 'true' || !isDevelopment;

async function syncMessages(batch: SyncMessage[]): Promise<SyncResponse> {
  if (useRealSync) {
    return realWebSocketSync(batch);
  } else {
    return mockWebSocketSync(batch);
  }
}
```

**Environment variable:** `VSCODE_SYNC_REAL`
- Development: `false` (use mock for faster iteration)
- Staging: `true` (use real WebSocket)
- Production: `true` (use real WebSocket)

#### 3. Docker Compose Config

Create `docker-compose.dev.yml` with services:

```yaml
version: '3.8'
services:
  # MCP Server (includes WebSocket sync endpoint on 3106)
  mcp-server:
    build: ./packages/mcp-server
    ports:
      - "3103:3103"    # Agent core
      - "3106:3106"    # Sync WebSocket
    environment:
      - NODE_ENV=development
      - STORY_AGENT_AGENT_PORT=3103
      - SYNC_WEBSOCKET_PORT=3106
    depends_on:
      - redis
      - supabase

  # Redis (cache + queue)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Supabase (RAG + auth)
  supabase:
    image: supabase/supabase:latest
    ports:
      - "54321:5432"
    environment:
      - SUPABASE_DB_PASSWORD=password

  # UI (web dashboard)
  ui:
    build: ./packages/ui
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3103
      - NEXT_PUBLIC_SYNC_URL=ws://localhost:3106/sync
```

#### 4. Local Development Setup

Create setup script `scripts/dev-setup-phase2.sh`:

```bash
#!/bin/bash
set -e

echo "Setting up Phase 2 development environment..."

# 1. Build Docker services
docker compose -f docker-compose.dev.yml build

# 2. Start services
docker compose -f docker-compose.dev.yml up -d

# 3. Run migrations (Supabase)
pnpm --filter @story-agent/mcp-server run db:migrate

# 4. Seed test data
pnpm --filter @story-agent/mcp-server run db:seed

# 5. Start VSCode extension (in watch mode)
pnpm --filter @story-agent/vscode-extension run dev

echo "Phase 2 environment ready!"
echo "- MCP Server: http://localhost:3103"
echo "- Sync WebSocket: ws://localhost:3106/sync"
echo "- UI: http://localhost:3000"
```

#### 5. Extension Configuration

Add Phase 2 settings to `packages/vscode-extension/package.json`:

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "storyAgent.syncWebsocketUrl": {
          "type": "string",
          "default": "ws://localhost:3106/sync",
          "description": "WebSocket endpoint for state sync"
        },
        "storyAgent.syncMode": {
          "type": "string",
          "enum": ["mock", "real"],
          "default": "real",
          "description": "Use mock or real WebSocket sync"
        }
      }
    }
  }
}
```

#### 6. Rollback Strategy

Implement graceful fallback if WebSocket fails:

**Rollback logic:**
- WebSocket connection fails → log to RAG
- Fall back to mock sync (in-memory batching)
- Display warning: "Sync service unavailable, using local sync"
- Retry WebSocket every 30s
- Auto-recover when WebSocket returns

**Rollback test:** Simulate WebSocket failure, verify fallback works

#### 7. Documentation & Tests

- **JSDoc:** Every exported function
- **Integration tests:** Mock WebSocket client + real endpoint
- **Rollback tests:** Verify fallback on connection failure
- **E2E test:** Chat → sync → WebSocket → response (full cycle)
- **Docker tests:** Verify services start + communicate

### Success Criteria (All must be TRUE for gate)

- [ ] Real WebSocket integrated in chat-engine.ts
- [ ] VSCode extension uses real sync (VSCODE_SYNC_REAL=true)
- [ ] Docker compose up starts all services
- [ ] Local dev setup script works
- [ ] Extension configuration added
- [ ] Fallback to mock on WebSocket failure
- [ ] Rollback tests pass
- [ ] E2E test (chat → sync → response)
- [ ] <100ms round-trip latency observed
- [ ] Zero breaking changes to VSCode extension
- [ ] JSDoc on 100% of exports
- [ ] Ready for git

### Git Deliverable

```bash
# Branch: feature/ui-sync-phase2
# Commit:
git commit -m "feat(devops): WebSocket integration + Docker setup + rollback strategy

- Wire Zustand sync middleware to real WebSocket endpoint
- Update VSCode extension to use real sync (VSCODE_SYNC_REAL env var)
- Docker compose config (mcp-server, redis, supabase, ui)
- Local dev setup script (docker-compose up + migrations)
- Graceful rollback to mock sync on WebSocket failure
- E2E test (chat → WebSocket → response)
- Zero breaking changes"
```

### RAG Completion Signal

```
Tag: ui-sync-phase2-obrien-complete
Content:
- Real WebSocket integrated (chat-engine.ts)
- VSCode extension updated (VSCODE_SYNC_REAL env var)
- Docker compose running (all services)
- Local dev setup working
- Fallback to mock verified
- E2E test: chat → WebSocket → response passing
- Round-trip latency: <100ms
- Ready for: Staging deployment
```

**Impact:** All Phase 2 infrastructure complete and ready for staging.

---

## Execution Protocol (Phase 2)

### Kickoff (T+0, after Phase 1 GREEN)

1. All three Phase 2 teams receive mission brief
2. Geordi + Worf start immediately (no dependencies)
3. O'Brien polls RAG every 10 min for `ui-sync-phase2-geordi-complete` + `ui-sync-phase2-worf-complete`
4. Teams coordinate via daily RAG standups

### Daily Coordination (Async)

Each team posts daily standup to RAG:

**Tag:** `ui-sync-phase2-standup-{team-name}`

**Content:** Completed today, blockers, next steps, risks

### Blocker Escalation

**Tag:** `ui-sync-phase2-blocker-{team-name}`

**Content:** Issue, root cause, proposed solution, impact

### Gate Check (T+4 days)

All three teams confirm completion:

**Phase 2 Success Checklist:**

**Team 4 (Geordi):**
- [ ] WebSocket endpoint running
- [ ] Connection pooling working
- [ ] Message replay verified
- [ ] <500ms P99 latency
- [ ] >1,000 msg/sec throughput
- [ ] Tests passing

**Team 5 (Worf):**
- [ ] JWT auth working
- [ ] Rate limiting enforced
- [ ] Injection detection active
- [ ] Audit logging 100%
- [ ] Security tests passing

**Team 6 (O'Brien):**
- [ ] Real WebSocket integrated
- [ ] Extension updated
- [ ] Docker compose running
- [ ] Local dev setup working
- [ ] Fallback verified
- [ ] E2E test passing

### GATE: GREEN or RED?

**GREEN:** All teams complete + >99.9% sync success
- → Ready for staging deployment

**RED:** Any team incomplete or criteria not met
- → Request extension (max +2 days)

---

## Phase 2 Success Metrics

- **Sync success rate:** >99.9% (measure via audit logs)
- **P99 latency:** <500ms on 10 concurrent connections
- **Message throughput:** >1,000 messages/second per connection
- **Connection stability:** <0.1% disconnection rate
- **Auth overhead:** <10ms per message
- **Deployment time:** <5 min (Docker compose up)

---

## Ready for Production (After Phase 2 GREEN)

Once Phase 2 gates pass, the system is ready for:

1. **Staging deployment** (10-50 test users)
2. **Section 31 canary** (1% of GitHub Copilot users)
3. **Production rollout** (full crew + users)

---

## BEGIN AFTER PHASE 1 GREEN

Phase 2 teams: Await Phase 1 completion gate. Once GREEN, execute immediately.
