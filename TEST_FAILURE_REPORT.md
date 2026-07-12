# Test Failure Report — 2026-07-12

## Summary
- **Total Tests Run**: 298 (111 shared unit + 187 mcp-server tests)
- **Failures**: 1 confirmed
- **Errors**: 1 integration setup issue (CommonJS/ESM mismatch)

---

## ❌ FAILURE #1: Redis Pub/Sub Round-Trip

**Test**: `approval-registry.integration.test.ts > delivers an approve decision across connections`  
**File**: `packages/mcp-server/src/agent-core/approval-registry.integration.test.ts:24`  
**Status**: FAIL (consistently)

### Error
```
AssertionError: expected false to be true
- Expected: true
- Received: false

Line 24: expect(reached).toBe(true);
```

### What the test does
1. Calls `awaitApproval(id, 5000)` — creates Redis subscriber on dedicated connection
2. Waits 150ms for subscriber to attach
3. Calls `resolveApproval(id, 'approve')` — publishes approval on main connection
4. Expects publisher to report message reached ≥1 subscriber (but gets 0)

### Root cause
Redis pub/sub message is **not reaching** the subscriber. Possible causes:
- **Race condition**: 150ms wait insufficient for subscription to complete
- **Connection issue**: Duplicate connection not subscribing properly
- **Channel timing**: Message published before subscription ready
- **Redis state**: Potential key expiration or channel cleanup

### Impact
- Affects multi-task Fargate deployments where SSE stream and approval POST land on different tasks
- Fallback to in-process Map works fine on single-instance deployments
- **Blocks cross-task approval gates** in production

### Investigation needed
- [ ] Increase wait time (150ms → 500ms) and retry
- [ ] Add logging to awaitApproval/resolveApproval to trace subscription lifecycle
- [ ] Verify duplicate connection is subscribing before publish
- [ ] Check if subscription callback is async/race condition

---

## ⚠️ ERROR #1: Integration Test Setup

**Test Suite**: `packages/shared/src/db.integration.test.ts`  
**Error**: CommonJS/ESM mismatch

### Error
```
Error: Vitest cannot be imported in a CommonJS module using require()
Please use "import" instead.
```

**File**: `test/setup.ts:6` — imports vitest with CommonJS

### Impact
- Shared package integration tests cannot run
- Does not block unit tests (111 passed)
- Likely configuration issue with vitest ESM handling

### Fix
- Update `vitest.config.ts` in shared package to handle ESM/CommonJS properly
- OR update test setup to use dynamic import

---

## ✅ PASSING
- **Shared unit tests**: 14 files, 111 tests passed
- **MCP-Server unit tests**: 29 files (1 skipped), 187 tests passed
- **Total passing**: 298 tests

---

## Recommended Actions

### High Priority
1. **Fix approval-registry Redis pub/sub**
   - Add delay before publish or improve subscription wait
   - Add diagnostic logging for subscription state
   - Test with real multi-task scenario

### Medium Priority
2. **Fix integration test setup**
   - Resolve CommonJS/ESM config in @story-agent/shared
   - Enable db.integration.test.ts to run

### Testing
- Run with `pnpm run test` after fixes
- Verify `pnpm run check` passes (typecheck + lint + build + test)

---

**Generated**: 2026-07-12 03:32 UTC  
**Environment**: Redis 127.0.0.1:6379 (reachable ✓)
