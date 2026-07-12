# Redis Pub/Sub Timing Issue — Fargate Multi-Task Approval Gates

## Executive Summary
**Problem**: Interactive approval gates fail on multi-task Fargate deployments due to Redis pub/sub race condition. Message published before subscriber ready, causing approval requests to silently fail (returns 0 subscribers).

**Impact**: Cross-task approval gates (WorfGate interactive gates spanning SSE stream + approve POST on different tasks) cannot deliver decisions reliably.

**Test Failure**: `approval-registry.integration.test.ts:24` — `expect(reached).toBe(true)` gets false.

---

## Technical Context

### Architecture
```
┌─────────────────────────────────────────────────┐
│ Fargate: Two Tasks (can land on different hosts) │
├─────────────────────────────────────────────────┤
│ Task A (SSE Stream)    │ Task B (Approve POST)  │
│ ┌──────────────────┐   │ ┌──────────────────┐   │
│ │ GET /agent/sse   │   │ │ POST /approve    │   │
│ │ awaitApproval() ──Redis subscribe──→       │   │
│ │ (waits for msg)  │   │ resolveApproval() │   │
│ │                  │   │ (publishes msg) ──Redis publish──→ (silence)
│ │ (timeout: deny)  │   │ returns: false(0) │   │
│ └──────────────────┘   │ └──────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Current Implementation
**File**: `packages/mcp-server/src/agent-core/approval-registry.ts`

```typescript
// Subscriber (Task A)
export async function awaitApproval(id: string, timeoutMs: number): Promise<Decision> {
  const redis = await getRedis().catch(() => null);
  if (redis) {
    const sub = redis.duplicate();  // Dedicated connection required for SUBSCRIBE
    await sub.connect();
    return new Promise<Decision>((resolve) => {
      // ... setup timeout handler ...
      sub.subscribe(CHANNEL(id), (msg: string) => finish(msg === 'approve' ? 'approve' : 'deny')).catch(() => finish('deny'));
    });
  }
  // Fallback to in-process Map
}

// Publisher (Task B)
export async function resolveApproval(id: string, decision: Decision): Promise<boolean> {
  const redis = await getRedis().catch(() => null);
  if (redis) {
    const receivers = await redis.publish(CHANNEL(id), decision).catch(() => 0);
    return receivers > 0;  // Returns 0 when no subscribers listening yet
  }
  // Fallback to in-process Map
}
```

### Test Failure Sequence
```
1. awaitApproval(id, 5000)
   └─ Start (Redis subscriber created, connecting...)
   
2. await setTimeout(150ms)  ← PROBLEM: Not enough time for subscription to be ready
   
3. resolveApproval(id, 'approve')
   └─ Publish to Redis
   └─ No subscribers listening yet → returns false
   
4. expect(reached).toBe(true)  ← FAILS
```

---

## Investigation Questions for Crew

### 1. **Timing Analysis**
- [ ] Is 150ms sufficient for `redis.duplicate().connect()` + `subscribe()` to complete?
- [ ] What's the actual latency of subscription setup? (add instrumentation)
- [ ] On Fargate containers, could connect time be > 150ms due to cold starts, network latency?
- [ ] Should timeout be adaptive or configurable?

### 2. **Redis Connection Lifecycle**
- [ ] Is there a way to await subscription confirmation (Redis SUBSCRIBE response)?
- [ ] Should we use Redis `PSUBSCRIBE` with pattern matching for reliability?
- [ ] Does node-redis v4 guarantee callback registration before subscribe() completes?

### 3. **Fallback Reliability**
- [ ] Is in-process Map fallback always working? (seems to be, for local dev)
- [ ] Should we prefer in-process Map for single-instance + only use Redis for multi-task?
- [ ] Can we detect Fargate vs local and route accordingly?

### 4. **Proposed Solutions**

**Option A: Increase Wait Time (Simple)**
- Increase 150ms → 500ms (or make configurable)
- Pro: Minimal code change
- Con: Adds latency to approval flow, might not be enough on slow networks

**Option B: Subscription Confirmation (Better)**
- Wait for explicit subscription ready signal instead of arbitrary timeout
- Pro: Eliminates race condition entirely
- Con: Requires changes to Redis protocol handling

**Option C: Hybrid Strategy (Best)**
- Use subscription confirmation when available
- Fall back to longer timeout (500-1000ms) if confirmation fails
- Add instrumentation to measure actual subscription latency
- Pro: Robust + observable
- Con: More complex implementation

**Option D: Rethink Architecture**
- Store pending approvals in Redis SET instead of pub/sub?
- Poll/check for decision instead of waiting?
- Pro: Decouples publisher and subscriber
- Con: Higher latency (polling overhead)

---

## Success Criteria

✅ **Test passes**: `approval-registry.integration.test.ts` all 4 tests green  
✅ **Multi-task safe**: Simulated cross-task scenario (two separate processes) works  
✅ **Observable**: Instrumentation shows subscription latency metrics  
✅ **Documented**: Updated comments explain why timing is as it is  
✅ **Backwards compatible**: In-process fallback still works for single-instance  

---

## Deliverables Requested

1. **Root cause analysis**: Exact point of failure in subscription lifecycle
2. **Recommended fix**: One of Options A-D with rationale
3. **Implementation**: Code changes + test updates
4. **Metrics**: Subscription latency baseline measurement
5. **Documentation**: Comment updates + decision rationale

---

## Files to Modify

- `packages/mcp-server/src/agent-core/approval-registry.ts` — main implementation
- `packages/mcp-server/src/agent-core/approval-registry.integration.test.ts` — test adjustments
- (Optional) `packages/shared/src/db.ts` — if adding instrumentation to getRedis()

## Constraints

- Must maintain backwards compatibility with in-process fallback
- Cannot break existing SSE stream handling
- WorfGate approvals must remain <5s timeout (user waiting for gate)

---

**Severity**: High (Fargate multi-task deployments cannot use approval gates)  
**Scope**: Crew deliberation on architecture, then implementation  
**Effort**: 1-2 crew lounge sessions
