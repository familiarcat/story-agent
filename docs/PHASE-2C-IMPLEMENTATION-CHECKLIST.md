# Phase 2C Integration Checklist — Ready for Crew Execution

**Date**: 2026-07-17  
**Status**: ARCHITECTURE COMPLETE · IMPLEMENTATION READY  
**Ownership**: Chief O'Brien (DevOps Lead), Riker (Full-Stack), Geordi (Infrastructure), Quark (Cost)

---

## Pre-Implementation Review (PASS/FAIL)

### Architecture Review
- [x] Zustand store integration verified (Phase 1 complete)
- [x] SyncManager batching framework verified (Phase 1 complete)
- [x] WebSocket proxy (3105) verified (Phase 1B complete)
- [x] WorfGate security layer verified (Phase 1B complete)
- [x] Chat schema (Zod validators) verified (Phase 1B complete)
- [x] Docker Compose baseline verified (5 services ready)
- [x] VSCode extension scaffolding verified (activation hooks in place)

### Documentation Review
- [x] Zustand → WebSocket data flow documented
- [x] Conflict resolution strategy defined (Last-Write-Wins for Phase 2)
- [x] Error handling paths mapped (11 error scenarios)
- [x] Audit trail design complete (immutable, rotated)
- [x] Deployment progression documented (localhost → staging → canary → prod)
- [x] Success criteria measurable (latency, cost, success rate)
- [x] Risk matrix complete (11 identified risks + mitigations)

---

## Phase 2C Implementation Tasks (IN ORDER)

### WEEK 1: Core Integration Layer

#### Day 1–3: Implement `sync-integration.ts` (500 LOC)

**Riker** (Full-Stack Developer — Claude 3.5 Sonnet):

- [ ] **Class Setup**
  - [ ] Constructor: initialize config, metrics, audit trail
  - [ ] Instance variables: WebSocket connection, message queue, conflict tracking
  - [ ] Singleton factory: `initializeSyncBridge()`, `getSyncBridge()`, `disposeSyncBridge()`

- [ ] **Connection Management** (Phase 2C critical)
  - [ ] `connect()`: Create WebSocket to 3105, attach event handlers (open, message, error, close)
  - [ ] `reconnect()`: Exponential backoff (1s → 2s → 4s ... max 30s)
  - [ ] Error handling: Rate limit (429), auth (401), payload (413), timeout
  - [ ] Graceful fallback: If reconnect fails after 10 attempts, emit error + suggest HTTP fallback

- [ ] **Message Batching** (integrate with SyncManager)
  - [ ] `queueChange(msg)`: Add to pendingBatch, apply priority (high = flush now, low = batch)
  - [ ] `flushBatch(storyId)`: Send batched messages to WebSocket
  - [ ] Timer management: Start batch timer on first low-priority message, clear on flush

- [ ] **Conflict Detection & Resolution** (Last-Write-Wins)
  - [ ] `handleRemoteMessage(msg)`: Compare timestamp with `lastSeenTimestamps`
  - [ ] LWW logic: `remote.timestamp > local.timestamp` → keep remote
  - [ ] Log conflict to audit trail + emit conflict event
  - [ ] Update `lastSeenTimestamps` with newer timestamp

- [ ] **Persistence & Recovery**
  - [ ] `persistPendingChanges()`: Serialize to localStorage (key: sync:pending)
  - [ ] `recoverPendingChanges()`: Deserialize from localStorage, replay on reconnect
  - [ ] Deduplication: Check message ID to avoid replaying duplicates

- [ ] **Audit Trail**
  - [ ] `logAudit(entry)`: Append to auditTrail array, rotate if > 10,000 entries
  - [ ] Immutable design: entries never modified after creation
  - [ ] WorfGate compliance: no credential values, only operation summaries
  - [ ] `getAuditTrail(limit)`: Return last N entries (max 10,000)

- [ ] **Metrics Collection**
  - [ ] Track per-message latency (start → response received)
  - [ ] Accumulate total cost (tokens × rate)
  - [ ] Calculate success rate (sent/received ratio)
  - [ ] `getMetrics()`: Return SyncMetrics struct with P50, P99, max latencies

- [ ] **Event Handlers** (subscriptions)
  - [ ] `onMetrics(callback)`: Subscribe to metrics updates
  - [ ] `onError(callback)`: Subscribe to error events
  - [ ] `onConflict(callback)`: Subscribe to conflict resolution
  - [ ] All handlers: Return unsubscribe function

- [ ] **Cleanup**
  - [ ] `dispose()`: Close WebSocket, clear all timers, clear batch queue
  - [ ] Safe to call multiple times

**Tests** (Yar — QA Auditor):
- [ ] Unit test: `initialize()` → connected
- [ ] Unit test: `queueChange()` with high vs low priority
- [ ] Unit test: `handleRemoteMessage()` detects conflicts (LWW)
- [ ] Unit test: `persistPendingChanges()` / `recoverPendingChanges()`
- [ ] Integration test: Zustand → SyncManager → SyncBridge → WebSocket

#### Day 4–5: Integrate with VSCode Extension

**Riker + Geordi** (Infrastructure):

- [ ] Create `packages/vscode-extension/src/chat/sync-integration-adapter.ts` (150 LOC)
  - [ ] Export: `initializeSyncIntegration(config)` — wires extension to sync-integration.ts
  - [ ] On Zustand mutation: Call `syncBridge.queueChange()`
  - [ ] On WebSocket response: Call Zustand store update
  - [ ] Subscribe to metrics + errors for UI feedback

- [ ] Update `packages/vscode-extension/src/extension.ts` (50 LOC added)
  - [ ] On activate: Call `initializeSyncIntegration()` after SyncManager init
  - [ ] On deactivate: Call `disposeSyncBridge()`
  - [ ] Wire Zustand store subscriptions to sync bridge

- [ ] Update `packages/vscode-extension/src/chat/chat-engine.ts` (already exists)
  - [ ] Import sync-integration
  - [ ] On chat response: Update Zustand store via sync bridge

**Tests** (Yar):
- [ ] Integration test: Full flow (user types → Zustand mutation → SyncManager batch → WebSocket send → remote update → Zustand updated)

---

### WEEK 2: DevOps & Deployment

#### Day 1–2: Create Test Scripts

**O'Brien** (DevOps Engineer — Chief focus):

- [ ] `scripts/dev-sync-test.sh` (30 LOC)
  - [ ] Start chat-proxy on 3105
  - [ ] Send test WebSocket message
  - [ ] Verify `/health` endpoint
  - [ ] Verify `/metrics` endpoint

- [ ] `scripts/test-sync-connection.ts` (80 LOC)
  - [ ] Connect to WebSocket
  - [ ] Send ping message
  - [ ] Expect pong response
  - [ ] Measure round-trip latency

- [ ] `scripts/sync-load-test.ts` (100 LOC)
  - [ ] Spawn 10 concurrent WebSocket connections (users)
  - [ ] Each sends 100 messages (1/sec)
  - [ ] Collect latencies, cost, success rate
  - [ ] Print percentiles (P50, P99) + summary

- [ ] `scripts/sync-audit-dump.sh` (15 LOC)
  - [ ] Export audit trail to JSONL file
  - [ ] Timestamp in filename: `audit-trail-YYYYMMDD-HHMMSS.jsonl`

- [ ] `scripts/sync-chaos-test.ts` (120 LOC)
  - [ ] Inject failures: WebSocket drop, rate limit (429), auth fail (401)
  - [ ] Verify auto-reconnect behavior
  - [ ] Verify error handling + recovery

#### Day 3–4: Update Deployment Configs

**Geordi + O'Brien**:

- [ ] Update `docker-compose.dev.yml` (5 LOC)
  - [ ] Add `NEXT_PUBLIC_SYNC_URL: ws://localhost:3105/sync` to UI service

- [ ] Create `docs/PHASE-2-DEPLOYMENT.md` (200 LOC)
  - [ ] Staging: localhost (1 user, manual testing)
  - [ ] Testing: 10–50 users, team + beta testers, monitor latency/cost
  - [ ] Canary: 5% of Section 31 (600 users), A/B vs HTTP fallback
  - [ ] Production: Gradual rollout (25% → 50% → 100% over 3 days)
  - [ ] Rollback: Auto-fallback to HTTP if sync fails >0.1%

- [ ] Create `docs/phase2c/ARCHITECTURE.md` (150 LOC)
  - [ ] Diagram: Zustand → SyncManager → SyncBridge → WebSocket → chat-proxy → MCP → remote store
  - [ ] Message flow sequence diagram
  - [ ] Error handling decision tree
  - [ ] Conflict resolution (LWW) flowchart

- [ ] Create `docs/phase2c/CONFLICT-RESOLUTION.md` (100 LOC)
  - [ ] LWW strategy explanation + examples
  - [ ] Edge cases (clock skew, network partition, simultaneous updates)
  - [ ] Future (Phase 3): CRDT approach for eventual consistency

#### Day 5: Phase 2 Gate Review

**All Crew**:

- [ ] **Code Review**
  - [ ] Riker: Architecture, error handling, edge cases
  - [ ] Data: Type safety, interfaces, generics
  - [ ] O'Brien: DevOps integration, health checks, monitoring

- [ ] **Security Review**
  - [ ] Worf: Credential handling, WorfGate integration, audit trail
  - [ ] No hardcoded keys, all secrets via env vars
  - [ ] All operations logged (no credential values)

- [ ] **Performance Review**
  - [ ] Geordi: Latency measurements, P50/P99 targets
  - [ ] Quark: Cost tracking, budget compliance
  - [ ] Crusher: Observability dashboard readiness

- [ ] **Quality Review**
  - [ ] Yar: Test coverage (>80%), load test results, chaos test results

- [ ] **Sign-Off**
  - [ ] [ ] Picard: Consensus gate — all crew approve
  - [ ] [ ] Riker: Code architecture ✓
  - [ ] [ ] Geordi: Infrastructure readiness ✓
  - [ ] [ ] Quark: Cost projections validated ✓
  - [ ] [ ] Worf: Security audit passed ✓
  - [ ] [ ] O'Brien: Deployment vetted ✓
  - [ ] [ ] Yar: Testing strategy approved ✓
  - [ ] [ ] Crusher: Observability ready ✓

---

## Success Criteria (Must ALL be TRUE)

### Functional
- [ ] sync-integration.ts compiles (TypeScript zero errors)
- [ ] All unit tests pass (100+ test cases)
- [ ] Integration tests pass (Zustand → WebSocket → store)
- [ ] Load test passes (10 users, 100 msg/sec, 5 min duration)
- [ ] Chaos test passes (WebSocket drop, rate limit, auth fail, payload too large)

### Performance
- [ ] Latency P50: <100ms ✓
- [ ] Latency P99: <500ms ✓
- [ ] Success rate: >99.9% (max 1 failure per 1,000 syncs) ✓
- [ ] No latency creep over 10-minute load test ✓

### Cost
- [ ] Total cost <$100/day for 10 concurrent users ✓
- [ ] Cost tracking accurate (matches Quark routing) ✓
- [ ] Token budgets honored (no overage) ✓

### Reliability
- [ ] Reconnect: Auto-recovers within 5s ✓
- [ ] Persistence: Pending messages survive app exit + reload ✓
- [ ] Conflict resolution: LWW applied correctly ✓
- [ ] Error handling: All 11 error scenarios handled gracefully ✓

### Audit & Compliance
- [ ] Audit trail: Every operation logged ✓
- [ ] Immutability: Entries never modified ✓
- [ ] Privacy: No credential values logged ✓
- [ ] Exportable: `getAuditTrail()` works correctly ✓

### Documentation
- [ ] Architecture doc: Complete + accurate ✓
- [ ] Deployment guide: Executable by operators ✓
- [ ] Integration guide: Usable by developers ✓
- [ ] Conflict resolution: Explained with examples ✓

### Crew Sign-Off
- [ ] [ ] All crew members: Consensus gate = APPROVED

---

## Risk Mitigation Plan

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|-----------|-------|
| WebSocket connection drops | HIGH | Session interrupted | Exponential backoff + local queue + replay | O'Brien |
| Conflict (local + remote) | MEDIUM | Data inconsistency | Last-Write-Wins + log conflict + UI notification | Riker |
| Rate limit exceeded (429) | MEDIUM | Requests blocked | Quark throttles batch interval + backoff | Quark |
| Auth failure (401) | LOW | Sync blocked | Client reconnects, server issues new JWT | Worf |
| Payload too large (413) | LOW | Message rejected | Client splits into multiple (auto) | Riker |
| High latency (P99 >500ms) | MEDIUM | Poor UX, cost spike | Monitor per-user, auto-scale MCP if needed | Geordi |
| Audit overflow | LOW | Memory pressure | Rotate entries (max 10,000) | Crusher |
| Hot-reload incompatibility | MEDIUM | Extension breaks | Persist to localStorage, recover on reload | O'Brien |

---

## Phase 2C Timeline

**Week 1:**
- Mon–Wed: Implement sync-integration.ts (Riker)
- Thu–Fri: VSCode integration + first tests (Riker + Yar)

**Week 2:**
- Mon–Tue: Dev/load/chaos test scripts (O'Brien)
- Wed–Thu: Docker + deployment docs (Geordi + O'Brien)
- Fri: Phase 2 gate review + crew sign-off (All crew)

**Week 3:**
- Mon–Wed: Staging deployment (10–50 users)
- Thu–Fri: Monitoring + alerting setup (Crusher)

**Week 4:**
- Mon–Wed: Section 31 canary (5% = 600 users)
- Thu–Fri: Prepare production rollout

---

## References & Resources

- **Phase 1B Delivery**: `/docs/PHASE-1B-DELIVERY-SUMMARY.md`
- **Integration Guide**: `/docs/PHASE-2C-INTEGRATION.md`
- **Skeleton Code**: `/packages/mcp-server/src/lib/sync-integration.ts`
- **WorfGate Security**: `/docs/crew/worfgate-chat-validator-integration.md`
- **Section 31 Live**: Project memory (crew RAG)

---

## Crew Activation

**Chief O'Brien**: Phase 2C is ready for execution.  
**All crew members**: Positions assigned, success criteria clear, risks identified.

**Picard**: Make it so.
