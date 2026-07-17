# Phase 2C Integration Guide: Zustand ↔ WebSocket Sync Bridge

**Status**: CREW-DELIBERATED ARCHITECTURE  
**Date**: 2026-07-17  
**Chief O'Brien**: Execute this integration roadmap  
**Ownership**: Riker (code), Geordi (infrastructure), Quark (cost), Worf (security)

---

## Executive Summary

Phase 2C integrates three Phase 1 components into a production-ready sync bridge:

1. **Zustand store** (local state) 
2. **SyncManager** (batching + queue)
3. **WebSocket proxy** (3105, real-time push)

**Primary deliverable**: `sync-integration.ts` — the bridge connecting Zustand mutations → WebSocket messages → remote store updates.

**Success gate**: >99.9% sync success, <500ms P99 latency, <$100/day for 10 users, all crew sign-off.

---

## Architecture: Current State (Phase 1B)

### Component Status

| Component | File | Status | Port | Purpose |
|-----------|------|--------|------|---------|
| **WorfGate Chat Validator** | `packages/shared/src/worfgate-chat-validator.ts` | ✓ Complete | — | Security layer: credential auth, injection detection, rate limiting |
| **Chat Schema** | `packages/mcp-server/src/lib/chat-schema.ts` | ✓ Complete | — | Zod validators: UnifiedChatMessage, ChatResponse, ChatCostAnalysis |
| **WebSocket Proxy** | `packages/mcp-server/src/lib/chat-websocket-proxy.ts` | ✓ Complete | 3105 | Chat routing: VSCode → MCP, session management, metrics collection |
| **Chat Proxy Server** | `packages/mcp-server/src/agent-core/chat-proxy-server.ts` | ✓ Complete | 3105 | HTTP server wrapper: health checks, metrics endpoints, WebSocket attach |
| **Zustand Store** | `packages/ui/src/store/**` | ? VERIFY | — | Local state for VSCode extension (needs inspection) |
| **SyncManager** | `packages/vscode-extension/src/chat/sync-manager.ts` | ✓ Phase 1 | — | Message batching: high-priority (flush immediate), low-priority (batch every 300ms) |
| **ChatClient** | `packages/vscode-extension/src/chat/chat-client.ts` | ✓ Phase 1 | — | WebSocket connection: auto-reconnect (exponential backoff), session mgmt, metrics |
| **VSCode Extension** | `packages/vscode-extension/src/extension.ts` | ✓ Scaffolding | — | Activation: init SyncManager, init ChatClient, register providers |
| **Docker Compose** | `docker-compose.dev.yml` | ✓ Partial | Multiple | Services: RAG (3102), MCP (3103), chat-proxy (3105), UI (3000) |

### Data Flow (Current)

```
VSCode User
  ↓ (action: send message)
Zustand store mutation detected
  ↓
SyncManager.queueSyncMessage(msg)
  ↓ (Phase 1: console log)
[Phase 2C: Real WebSocket send needed here]
  ↓
WebSocket proxy (3105)
  ↓
runCanonicalChatTurn(msg)
  ↓ (crew chat processing)
ChatResponse (answer, cost, metadata)
  ↓
WebSocket response → VSCode client
  ↓
Zustand store updated (remote result)
  ↓
VSCode UI renders new state
```

---

## Phase 2C Implementation Roadmap

### 1. Create `sync-integration.ts` (NEW FILE)

**File**: `packages/mcp-server/src/lib/sync-integration.ts` (≈500 lines)

**Purpose**: Bridge layer connecting Zustand → SyncManager → WebSocket → remote store

**Key Functions**:

```typescript
/**
 * Initialize the sync bridge.
 * Connects SyncManager batch callbacks to WebSocket push.
 * Starts conflict detector, audit logger, recovery manager.
 */
export async function initializeSyncBridge(options: SyncBridgeOptions): Promise<SyncBridge>

/**
 * Queue a sync message from Zustand mutation.
 * High-priority (user_action): flush immediately
 * Low-priority (metadata, keystrokes): batch per SyncManager config
 */
export function queueZustandChange(change: PendingChange): void

/**
 * Handle incoming WebSocket message (remote update).
 * Detect conflicts (LWW: keep remote if newer timestamp).
 * Update local Zustand store.
 * Record audit entry.
 */
export async function handleRemoteSyncMessage(msg: SyncMessage): Promise<ConflictResolution>

/**
 * Persist pending changes to local storage.
 * Survive extension reload or WebSocket disconnect.
 * Replay on reconnect.
 */
export function persistPendingChanges(): Promise<void>

/**
 * Recover pending changes from local storage.
 * Called on WebSocket reconnect.
 */
export function recoverPendingChanges(): Promise<SyncMessage[]>

/**
 * Get current audit trail (immutable, no secrets).
 * Used for compliance + debugging.
 */
export function getAuditTrail(limit?: number): AuditEntry[]

/**
 * Dispose resources (cleanup).
 */
export function disposeSyncBridge(): void
```

**Interfaces**:

```typescript
interface SyncBridgeOptions {
  wsProxyUrl: string;        // e.g., ws://localhost:3105/sync
  batchIntervalMs: number;   // e.g., 300
  maxBatchSize: number;      // e.g., 50
  persistenceKey: string;    // localStorage key
  conflictStrategy: 'lww' | 'crdt';  // Phase 2: LWW, Phase 3: CRDT
  auditEnabled: boolean;     // Always true for Section 31
}

interface SyncMessage {
  id: string;                // UUID
  type: 'chat_message' | 'metadata' | 'keystroke' | 'user_action';
  storyId: string;
  payload: unknown;
  timestamp: string;         // ISO 8601
  priority: 'high' | 'low';
  clientId?: string;
  userId?: string;
  crewId?: string;
}

interface ConflictResolution {
  hasConflict: boolean;
  strategy: 'lww' | 'crdt';
  winner: 'local' | 'remote';
  reason: string;             // e.g., "remote timestamp newer"
  mergedChange: PendingChange;
}

interface AuditEntry {
  timestamp: string;
  messageId: string;
  type: string;
  direction: 'outbound' | 'inbound';
  storyId: string;
  payloadHash: string;        // SHA256 (no payload value logged)
  crewId?: string;
  clientId?: string;
  resolution?: ConflictResolution;
  cost?: number;              // Tokens or cost in USD
}
```

**Key Implementation Details**:

1. **Conflict Resolution (Last-Write-Wins for Phase 2)**:
   - Each SyncMessage has a `timestamp` (ISO 8601)
   - On collision (both local and remote changes to same field):
     - Compare timestamps
     - Keep the one with the newer timestamp
     - Log conflict as audit entry
     - Notify UI (toast: "remote change merged")

2. **Error Handling**:
   - WebSocket down → queue persists to localStorage
   - Rate limited (429) → exponential backoff, notify Quark
   - Auth failed (401) → refresh token, reconnect
   - Payload too large (413) → split into multiple messages
   - Timeout (no response in 5s) → retry with backoff

3. **Audit Trail**:
   - Max 10,000 entries in-memory (rotate oldest)
   - Fields: timestamp, messageId, type, direction, storyId, payloadHash (never value), cost
   - Immutable once written (no edits, only reads)
   - Exportable via `getAuditTrail()` for compliance

4. **Recovery**:
   - On disconnect: pending messages persist to localStorage
   - On reconnect: pending messages replayed (with dedup check)
   - Store reconciled: remote state merged with local queue

---

### 2. Update VSCode Extension (MODIFY)

**File**: `packages/vscode-extension/src/chat/chat-engine.ts` (NEW/UPDATE)

**Changes**:

```typescript
/**
 * Initialize real chat engine (Phase 2: replaces mock).
 * Connects ChatClient → WebSocket → sync bridge.
 * Handles Zustand store subscriptions.
 */
export async function initializeChatEngine(options: ChatEngineOptions): Promise<ChatEngine>

/**
 * On Zustand store change → queue sync message.
 * Called from extension.ts when store mutations detected.
 */
export function onZustandChange(change: PendingChange): void

/**
 * Send chat message via WebSocket.
 * High-priority: sends immediately to WebSocket.
 * Response updates Zustand store + audit trail.
 */
export async function sendChatMessage(msg: string, priority?: 'high' | 'low'): Promise<ChatResponse>

/**
 * Subscribe to sync bridge metrics (latency, cost, errors).
 */
export function onSyncMetrics(callback: (m: SyncMetrics) => void): void
```

**Integration Points**:

1. **SyncManager initialization** (already in extension.ts):
   ```typescript
   initSyncManager({ batchIntervalMs: 300, idleThresholdMs: 300, maxBatchSize: 50 });
   ```

2. **SyncManager batch callback** (wire to sync bridge):
   ```typescript
   syncMgr.onBatchReady((storyId, messages) => {
     syncBridge.pushBatch(storyId, messages);
   });
   ```

3. **WebSocket response handler** (update Zustand):
   ```typescript
   chatClient.onResponse((res) => {
     zustandStore.updateChatMessage(res.id, { answer: res.content, ... });
   });
   ```

---

### 3. Update Docker Compose (MODIFY)

**File**: `docker-compose.dev.yml` (UPDATE)

**Changes**:

```yaml
version: '3.8'

services:
  # RAG server (Redis-backed observation memory + embeddings)
  rag:
    # ... existing config ...

  # MCP server (crew tools + agent-core loop)
  mcp:
    # ... existing config ...

  # Chat proxy (WebSocket relay for VSCode)
  chat-proxy:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.turbo
    environment:
      NODE_ENV: development
      STORY_AGENT_CHAT_PROXY_PORT: '3105'
      MCP_URL: 'http://mcp:3103'
      RAG_URL: 'http://rag:3102'
    ports:
      - '3105:3105'
    command: >
      sh -c "npm run --workspace=@story-agent/mcp-server start:chat-proxy"
    networks:
      - internal
    depends_on:
      mcp:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3105/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Sync service (NEW — Phase 2C: optional, may run in mcp-server)
  # For now, sync runs inside chat-proxy/mcp; add separate service if needed in Phase 3
  # Port 3106 reserved for Phase 3 (multi-service sync coordinator)

  # Next.js UI (web dashboard)
  ui:
    # ... existing config ...
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_MCP_URL: 'http://localhost:3103'
      NEXT_PUBLIC_RAG_URL: 'http://localhost:3102'
      NEXT_PUBLIC_CHAT_PROXY_URL: 'ws://localhost:3105/chat-ws'
      # Add Phase 2C sync URL:
      NEXT_PUBLIC_SYNC_URL: 'ws://localhost:3105/sync'  # or ws://localhost:3106/sync in Phase 3

networks:
  internal:
    # ... existing config ...
```

**Health Checks**:

- `/health` endpoint on chat-proxy returns `{ status: 'ok', timestamp, uptime, activeConnections }`
- Metrics endpoint `/metrics` returns connection pool stats, latency percentiles

---

### 4. Create Dev Test Scripts (NEW FILES)

#### `scripts/dev-sync-test.sh`

```bash
#!/bin/bash
# Start sync server and test WebSocket connection

set -e

echo "[dev-sync-test] Starting chat-proxy on port 3105..."
npx tsx packages/mcp-server/src/agent-core/chat-proxy-server.ts &
PROXY_PID=$!

sleep 2

echo "[dev-sync-test] Testing WebSocket connection..."
npx tsx scripts/test-sync-connection.ts localhost 3105

echo "[dev-sync-test] Testing health endpoint..."
curl -s http://localhost:3105/health | jq .

echo "[dev-sync-test] Testing metrics endpoint..."
curl -s http://localhost:3105/metrics | jq .

kill $PROXY_PID 2>/dev/null || true
echo "[dev-sync-test] Done"
```

#### `scripts/sync-load-test.ts`

```typescript
/**
 * Load test: 10 concurrent users, 100 msg/sec, measure latency + cost
 */
import { WebSocket } from 'ws';
import * as Timer from 'perf_hooks';

const NUM_USERS = 10;
const MESSAGES_PER_USER = 100;
const SERVER_URL = 'ws://localhost:3105/chat-ws';

interface Metrics {
  latencies: number[];
  costTotal: number;
  successCount: number;
  errorCount: number;
}

async function runLoadTest() {
  const metrics: Metrics = {
    latencies: [],
    costTotal: 0,
    successCount: 0,
    errorCount: 0,
  };

  for (let u = 0; u < NUM_USERS; u++) {
    const ws = new WebSocket(SERVER_URL);
    
    for (let m = 0; m < MESSAGES_PER_USER; m++) {
      const start = Timer.performance.now();
      
      await new Promise((resolve) => {
        ws.send(JSON.stringify({
          type: 'chat',
          message: `Load test message ${m} from user ${u}`,
          priority: 'high',
        }));
        
        ws.once('message', (data) => {
          const latency = Timer.performance.now() - start;
          metrics.latencies.push(latency);
          metrics.successCount++;
          
          try {
            const msg = JSON.parse(data.toString());
            if (msg.costUSD) metrics.costTotal += msg.costUSD;
          } catch {}
          
          resolve(null);
        });
      });
    }
    
    ws.close();
  }

  // Compute percentiles
  metrics.latencies.sort((a, b) => a - b);
  const p50 = metrics.latencies[Math.floor(metrics.latencies.length * 0.5)];
  const p99 = metrics.latencies[Math.floor(metrics.latencies.length * 0.99)];

  console.log(`
LOAD TEST RESULTS
=================
Users:            ${NUM_USERS}
Messages/user:    ${MESSAGES_PER_USER}
Total messages:   ${NUM_USERS * MESSAGES_PER_USER}

Success:          ${metrics.successCount}
Errors:           ${metrics.errorCount}
Success rate:     ${(metrics.successCount / (NUM_USERS * MESSAGES_PER_USER) * 100).toFixed(2)}%

Latency (ms):
  P50:            ${p50.toFixed(1)}
  P99:            ${p99.toFixed(1)}
  
Cost:             $${metrics.costTotal.toFixed(4)}
Cost/msg:         $${(metrics.costTotal / metrics.successCount).toFixed(6)}
`);
}

runLoadTest().catch(console.error);
```

#### `scripts/sync-audit-dump.sh`

```bash
#!/bin/bash
# Export audit trail for compliance review

OUTPUT_FILE="audit-trail-$(date +%Y%m%d-%H%M%S).jsonl"

echo "[sync-audit] Exporting audit trail to ${OUTPUT_FILE}..."

npx tsx --eval "
import { getSyncBridge } from '../packages/mcp-server/src/lib/sync-integration.js';

const bridge = getSyncBridge();
const entries = bridge.getAuditTrail(10000);

entries.forEach(e => console.log(JSON.stringify(e)));
" > "$OUTPUT_FILE"

echo "[sync-audit] Exported ${OUTPUT_FILE} ($(wc -l < $OUTPUT_FILE) entries)"
```

---

### 5. Create Deployment Strategy Doc (NEW FILE)

**File**: `docs/PHASE-2-DEPLOYMENT.md`

**Sections**:

1. **Staging (Localhost)**
   - Single-user dev environment
   - All services on docker-compose
   - Target: Verify basic sync, measure latency, test WebSocket reconnection

2. **Testing (10–50 Users)**
   - Internal team + beta testers
   - Monitor: Latency (P50, P99), cost, error rate, audit trail
   - Success criteria: >99% sync success, P99 <500ms

3. **Canary (5% of Section 31 Users)**
   - 600 users (out of 12,000)
   - A/B test: sync vs HTTP fallback
   - Auto-rollback if sync failure rate >0.1%

4. **Production (Full Rollout)**
   - Gradual: 25% → 50% → 100% over 3 days
   - Monitoring: Real-time latency + cost dashboard
   - SLA: >99.9% sync success, <$100/day

5. **Rollback Procedure**
   - If sync unavailable: VSCode extension auto-falls back to HTTP
   - If rate limited: SyncManager increases batch interval
   - If errors >0.1%: Canary stops, reverts to HTTP

---

### 6. Testing Strategy (NEW FILE)

**File**: `packages/mcp-server/src/lib/sync-integration.test.ts` (≈300 lines)

**Test Coverage**:

1. **Unit Tests** (sync-integration.ts functions)
   - ✓ initializeSyncBridge()
   - ✓ queueZustandChange() — high vs low priority
   - ✓ handleRemoteSyncMessage() — conflict detection (LWW)
   - ✓ persistPendingChanges() / recoverPendingChanges()
   - ✓ getAuditTrail()

2. **Integration Tests** (Zustand + SyncManager + WebSocket)
   - ✓ Zustand mutation → SyncManager batch → WebSocket push
   - ✓ WebSocket response → Zustand store update
   - ✓ Reconnect scenario: pending changes replayed

3. **Load Tests** (10 users, 100 msg/sec, 5 min)
   - ✓ Latency: P50 <100ms, P99 <500ms
   - ✓ Success rate: >99.9%
   - ✓ Cost tracking: accurate token counting

4. **Chaos Tests** (failure injection)
   - ✓ WebSocket drop mid-message → auto-reconnect
   - ✓ Rate limit (429) → exponential backoff
   - ✓ Auth fail (401) → token refresh + reconnect
   - ✓ Payload too large (413) → split message

---

## File Tree (Phase 2C Deliverables)

```
packages/mcp-server/src/lib/
├── sync-integration.ts              (NEW, 500 LOC)
├── sync-integration.test.ts         (NEW, 300 LOC)
└── sync-integration.types.ts        (NEW, 100 LOC)

packages/vscode-extension/src/chat/
├── chat-engine.ts                   (UPDATE, 50 LOC added)
└── sync-integration-adapter.ts      (NEW, 150 LOC) — connects chat-engine to mcp sync-integration

packages/mcp-server/src/agent-core/
└── chat-proxy-server.ts             (UNCHANGED — already complete)

docker-compose.dev.yml               (UPDATE, 5 LOC — add SYNC_URL env var)

scripts/
├── dev-sync-test.sh                 (NEW, 30 LOC)
├── sync-load-test.ts                (NEW, 100 LOC)
├── sync-audit-dump.sh               (NEW, 15 LOC)
└── test-sync-connection.ts          (NEW, 80 LOC)

docs/
├── PHASE-2-DEPLOYMENT.md            (NEW, 200 LOC)
├── phase2c/
│   ├── architecture.md              (NEW, 150 LOC) — Zustand → sync → WebSocket flow
│   ├── conflict-resolution.md       (NEW, 100 LOC) — LWW strategy + edge cases
│   └── crew-analysis-*.md           (CREW DELIBERATION OUTPUT)
```

---

## Success Criteria (Phase 2 Gate)

All must be TRUE to proceed to Section 31 canary:

- [ ] **Code Quality**
  - TypeScript: zero errors (`pnpm check`)
  - ESLint: passes all rules
  - Test coverage: >80%

- [ ] **Performance**
  - Latency P50: <100ms
  - Latency P99: <500ms
  - Success rate: >99.9%

- [ ] **Cost**
  - <$100/day for 10 concurrent users
  - Crew token budgets honored
  - Quark routing accurate

- [ ] **Reliability**
  - Load test (10 users, 100 msg/sec): passes
  - Chaos test (WebSocket drop, rate limit): passes
  - Reconnection: auto-recovers

- [ ] **Audit**
  - Audit trail: complete, immutable
  - WorfGate: all operations logged
  - Compliance: ready for regulatory review

- [ ] **Documentation**
  - Deployment guide: complete
  - Architecture diagram: accurate
  - Integration guide: usable by operators

- [ ] **Crew Sign-Off**
  - Riker: code architecture approved
  - Geordi: infrastructure ready
  - Quark: cost projections validated
  - Worf: security audit passed
  - O'Brien: deployment procedure vetted
  - Yar: test strategy approved
  - Crusher: observability dashboard ready

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| WebSocket connection drops | Session interrupted | High | Exponential backoff + local queue + replay on reconnect |
| Conflict (local + remote changes) | Data loss or inconsistency | Medium | Last-Write-Wins (timestamp comparison) + log conflict + notify UI |
| Rate limit exceeded (Worf budget) | Requests rejected (429) | Medium | Quark adjusts batch interval + exponential backoff |
| Auth failure (JWT expired) | Sync blocked (401) | Low | Client reconnects, server issues new JWT |
| Payload too large (>1 MB) | Message rejected (413) | Low | Client splits into multiple messages (automatic) |
| High latency creep (P99 >500ms) | Poor UX, cost spike | Medium | Monitor per-user latency, auto-scale MCP if needed |
| Audit trail overflow | Memory pressure | Low | Rotate old entries (max 10,000 in-memory) |
| Hot-reload incompatibility | Extension reload breaks sync | Medium | Persist pending changes to localStorage, recover on reload |

---

## Next Steps (Implementation Order)

1. **Week 1 (Day 1–3)**: Build `sync-integration.ts` + unit tests
2. **Week 1 (Day 4–5)**: Integrate with chat-engine, update extension.ts
3. **Week 2 (Day 1–2)**: Dev test scripts (load, chaos, audit)
4. **Week 2 (Day 3–4)**: Docker updates, deployment docs
5. **Week 2 (Day 5)**: Phase 2 gate review + crew sign-off
6. **Week 3**: Staging deployment + monitoring
7. **Week 4**: Section 31 canary (5% of users)

---

## References

- **Phase 1B Delivery**: [PHASE-1B-DELIVERY-SUMMARY.md](../PHASE-1B-DELIVERY-SUMMARY.md)
- **WorfGate Security**: [docs/crew/worfgate-chat-validator-integration.md](../docs/crew/worfgate-chat-validator-integration.md)
- **Chat Schema**: [packages/mcp-server/src/lib/chat-schema.ts](../packages/mcp-server/src/lib/chat-schema.ts)
- **Section 31 Live**: [MEMORY](~/.claude/projects/-Users-bradygeorgen-Developer-story-agent/memory/section31-week2-live.md)

---

**EXECUTE NOW. Chief O'Brien, activate Phase 2C.**
