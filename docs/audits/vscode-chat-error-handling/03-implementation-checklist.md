# VSCode Chat Error Handling — Implementation Checklist

## BLOCKING ISSUES FOR STAGING DEPLOYMENT (2026-07-10)

### Issue 1: HTTP Fetch Has No Timeout
**File:** `packages/vscode-extension/src/panels/ChatPanel.ts`
**Lines:** 188-199
**Severity:** CRITICAL
**Risk:** User sees spinning "thinking" forever if dashboard API hangs

**Changes Required:**
```typescript
// BEFORE (current):
const response = await fetch(`${dashboardUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, history: chatHistory }),
});

// AFTER (required fix):
const ctrl = new AbortController();
const timeoutHandle = setTimeout(() => ctrl.abort(), 30000);
try {
  const response = await fetch(`${dashboardUrl}/api/chat`, {
    signal: ctrl.signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: chatHistory }),
  });
  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }
  // ... rest of parsing
} finally {
  clearTimeout(timeoutHandle);
}
```

**Effort:** 15 minutes
**Status:** ⛔ BLOCKING

---

### Issue 2: ChatPanel Uses HTTP Instead of WebSocket
**File:** `packages/vscode-extension/src/panels/ChatPanel.ts`
**Function:** `callCrewChatViaWebSocket` (lines 172-224)
**Severity:** CRITICAL (Architectural)
**Risk:** Defeats entire WebSocket pooling/batching/reconnect architecture

**Problem:**
- Function name claims WebSocket but uses HTTP fetch
- No connection state management
- No message batching benefits
- No auto-reconnect
- Each request creates new HTTP connection

**Changes Required:**
Refactor ChatPanel to delegate to `chat-engine.runAssistantTurn()` instead of direct HTTP.

```typescript
// INSTEAD OF direct fetch, use:
import { runAssistantTurn } from '../chat/chat-engine';

async function callCrewChat(userMessage: string) {
  const stream = this.panel.webview.postMessage; // VS Code stream adapter
  const result = await runAssistantTurn(
    userMessage,
    stream,
    new vscode.CancellationToken(),
    this.context.globalMemento,
    this.sessionId
  );
  
  return {
    answer: result.text,  // from runAssistantTurn response
    model: result.model,
    costUSD: result.costUSD,
    sources: result.sources,
  };
}
```

**Effort:** 1-2 hours (refactor + testing)
**Status:** ⛔ BLOCKING

---

### Issue 3: Low-Priority Messages Silently Lost on Reconnect
**File:** `packages/vscode-extension/src/chat/chat-client.ts`
**Lines:** 191-200 (flushBatch method)
**Severity:** HIGH
**Risk:** User sends message, thinks it was sent, but it's lost

**Problem:**
```typescript
// CURRENT (broken):
private flushBatch(): void {
  if (this.lowPriorityQueue.length === 0) return;
  
  const batch = this.lowPriorityQueue.splice(0, 10); // REMOVES from queue
  for (const request of batch) {
    this.send({ ...request, priority: 'high' }).catch(err => {
      this.errorHandlers.forEach(h => h(err));
      // ERROR: batch item is already spliced out, never re-queued!
    });
  }
}
```

**Changes Required:**
```typescript
private flushBatch(): void {
  if (this.lowPriorityQueue.length === 0) return;
  
  const batch = this.lowPriorityQueue.splice(0, 10);
  for (const request of batch) {
    this.send({ ...request, priority: 'high' }).catch(err => {
      this.errorHandlers.forEach(h => h(err));
      // FIX: re-queue the request so it's not lost
      this.lowPriorityQueue.unshift(request);
    });
  }
}
```

**Effort:** 15 minutes
**Status:** ⛔ BLOCKING

---

### Issue 4: No Error Sanitization (Secret Leakage Risk)
**File:** `packages/vscode-extension/src/panels/ChatPanel.ts`
**Lines:** 105-111 (error handling in chat panel)
**Severity:** MEDIUM
**Risk:** Errors could display tokens, API keys, or paths to user

**Problem:**
```typescript
// CURRENT (unsafe):
const errorMsg = err instanceof Error ? err.message : String(err);
this.panel.webview.postMessage({
  command: 'error',
  message: errorMsg,  // Direct, unsanitized error
});
```

**Changes Required:**
```typescript
const errorMsg = err instanceof Error ? err.message : String(err);
// Sanitize: remove paths, tokens, URLs
const sanitized = errorMsg
  .replace(/\/[a-zA-Z0-9._\/-]+/g, '[path]')
  .replace(/Bearer [a-zA-Z0-9._\-]+/g, '[token]')
  .replace(/https?:\/\/[^\s]+/g, '[url]')
  .replace(/\b\d{20,}\b/g, '[number]'); // API key-like patterns

this.panel.webview.postMessage({
  command: 'error',
  message: sanitized,
});
```

**Effort:** 15 minutes
**Status:** ⛔ BLOCKING

---

## HIGH-PRIORITY ISSUES (Next Sprint)

### Issue 5: No 429 Rate Limit Handling
**File:** `packages/vscode-extension/src/chat/chat-engine.ts` + `chat-client.ts`
**Severity:** MEDIUM
**Risk:** Users hit rate limit, system cascades with failing requests

**Changes Required:**
- Detect 429 responses from API
- Parse `Retry-After` header
- Apply exponential backoff before retry
- Show user-friendly message: "Rate limited. Retrying in Xs..."

**Effort:** 1-2 hours
**Status:** 🟡 HIGH PRIORITY

---

### Issue 6: Partial Message Detection Missing
**File:** `packages/vscode-extension/src/chat/chat-client.ts`
**Lines:** 203-234 (handleMessage)
**Severity:** MEDIUM
**Risk:** Incomplete responses shown as final answers

**Changes Required:**
Add timeout for incomplete streams:
```typescript
private handleMessage(data: string): void {
  try {
    const response: ChatResponse = JSON.parse(data);
    
    // CHECK: if done=false, set timeout for completion
    if (!response.done) {
      const timeoutId = setTimeout(() => {
        this.errorHandlers.forEach(h => 
          h(new Error('Stream timeout: response incomplete'))
        );
      }, 10000); // 10s to complete stream
      
      this.pendingStreamTimeouts.set(response.id, timeoutId);
    } else {
      // Clear timeout on completion
      const timeoutId = this.pendingStreamTimeouts.get(response.id);
      if (timeoutId) clearTimeout(timeoutId);
      this.pendingStreamTimeouts.delete(response.id);
    }
    
    // ... rest of handler
  } catch (err) {
    // ...
  }
}
```

**Effort:** 1 hour
**Status:** 🟡 HIGH PRIORITY

---

### Issue 7: No Session Validation (401/403)
**File:** `packages/vscode-extension/src/chat/chat-client.ts`
**Severity:** MEDIUM
**Risk:** Invalid sessions retry forever instead of giving clear error

**Changes Required:**
Detect 401/403 responses and stop reconnecting:
```typescript
private handleError(event: Event): void {
  // Check if error is authentication-related
  if (this.lastHttpStatus === 401 || this.lastHttpStatus === 403) {
    this.autoReconnectEnabled = false;
    this.status = {
      connected: false,
      connecting: false,
      reconnecting: false,
      lastError: 'Session expired. Please restart VS Code.',
    };
    this.notifyConnectionHandlers();
    return;
  }
  
  // For other errors, proceed with normal reconnect
  this.attemptReconnect();
}
```

**Effort:** 1 hour
**Status:** 🟡 HIGH PRIORITY

---

## MEDIUM-PRIORITY ISSUES (Future)

### Issue 8: No User Feedback During Reconnect
**File:** `packages/vscode-extension/src/panels/ChatPanel.ts` + `chat-status.ts`
**Severity:** LOW
**Risk:** User assumes app is broken during reconnect

**Solution:** Show status badge: "Reconnecting..." while `reconnecting: true`

---

### Issue 9: No Structured Error Logging
**File:** `packages/vscode-extension/src/chat/chat-client.ts`
**Severity:** LOW
**Risk:** Debug productivity when errors occur in production

**Solution:** Add structured logging:
```typescript
console.debug('[ChatClient]', {
  event: 'reconnect_attempt',
  attempt: this.reconnectAttempts,
  nextDelayMs: delayMs,
  lastError: this.status.lastError,
});
```

---

## TEST COVERAGE IMPLEMENTATION (Parallel Path)

### New Test Files to Create:

1. **`packages/vscode-extension/src/chat/chat-client.test.ts`** (new)
   - Connection lifecycle tests
   - Message sending tests
   - Batch queue tests
   - Partial message tests

2. **`packages/vscode-extension/src/chat/ChatPanel.test.ts`** (new)
   - HTTP timeout test
   - Error sanitization test
   - WebSocket delegation test

3. **`packages/vscode-extension/src/chat/integration.test.ts`** (new)
   - Full round-trip WebSocket → UI
   - Error recovery scenarios
   - Concurrent operation tests

**Effort:** 14-16 hours total (see test-plan-vscode-chat.md)

---

## IMPLEMENTATION TIMELINE

### Sprint 1 (48 hours)
- [ ] Add HTTP timeout (15 min)
- [ ] Sanitize errors (15 min)
- [ ] Fix batch re-queue (15 min)
- [ ] ChatPanel refactor to use chat-engine (2 hours)
- [ ] Add 429 handling (1-2 hours)
- [ ] Unit tests for above (2-3 hours)

**Subtotal:** ~8 hours
**Blocking for Staging:** ✅ All 5 fixes complete

### Sprint 2 (40 hours)
- [ ] Partial message detection (1 hour + tests)
- [ ] Session validation (401/403) (1 hour + tests)
- [ ] Integration tests (6-8 hours)
- [ ] E2E manual scenarios (2 hours)
- [ ] User feedback UI (status badge) (1-2 hours)
- [ ] Error logging + metrics (1-2 hours)

**Subtotal:** ~14 hours
**Blocking for Production:** ✅ All items complete

---

## CODE REVIEW CHECKLIST

Before merging:
- [ ] All error handlers have try/catch blocks
- [ ] No direct `process.env` reads (use WorfGate credentials)
- [ ] Error messages don't contain PII/secrets (sanitized)
- [ ] All promises have `.catch()` handlers
- [ ] Connection state transitions are atomic
- [ ] Message queue never silently loses items
- [ ] Timeouts are bounded (30s max for HTTP)
- [ ] Tests cover >80% of error paths
- [ ] No infinite loops in reconnect logic
- [ ] Type safety: no `any` in error handlers

---

## FILES TO MODIFY

Priority order:

1. **packages/vscode-extension/src/panels/ChatPanel.ts**
   - Add HTTP timeout (line 188-199)
   - Sanitize error display (line 106-111)
   - Refactor to use chat-engine (lines 172-224)

2. **packages/vscode-extension/src/chat/chat-client.ts**
   - Fix batch re-queue (line 196-198)
   - Add partial message detection (line 203-234)
   - Add session validation (line 130-134)
   - Add 429 handling (new)

3. **packages/vscode-extension/src/chat/chat-engine.ts**
   - Add 429 retry logic (new)
   - Update error messages (line 536-539, 515-517)
   - Add metrics collection (new)

4. **NEW:** `packages/vscode-extension/src/chat/chat-client.test.ts`
   - Unit tests (20-30 tests)

5. **NEW:** `packages/vscode-extension/src/chat/ChatPanel.test.ts`
   - Integration tests (10-15 tests)

---

## VERIFICATION COMMANDS

After implementing fixes, run:

```bash
# Type check
pnpm --filter @story-agent/vscode-extension run build

# Run new tests
pnpm --filter @story-agent/vscode-extension run test:unit

# Manual E2E (see test-plan-vscode-chat.md Scenario 1-4)
pnpm dev

# Check for errors/warnings in console
```

---

## GO/NO-GO GATE

**Ready for Staging if:**
- [ ] All 5 blocking issues fixed + tested
- [ ] HTTP timeout working (manual test)
- [ ] ChatPanel uses WebSocket (verified via profiler)
- [ ] No errors logged during reconnect
- [ ] Low-priority messages never lost (test 3.3 passes)
- [ ] Error sanitization verified (test covers secrets)

**Estimated Date:** 2026-07-24 (2 sprints from 2026-07-10)

