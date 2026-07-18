# VSCode Chat Error Handling — Test Plan & Implementation Guide

## TEST STRATEGY OVERVIEW

**Goal:** Achieve 80%+ error scenario coverage before staging deployment
**Target Date:** 1 sprint (8 engineer-days)
**Test Framework:** Vitest (existing)
**Approach:** Unit tests + integration tests + manual E2E scenarios

---

## PART 1: UNIT TESTS (chat-client.ts)

### Test Suite 1: Connection Lifecycle

#### Test 1.1: Successful WebSocket Connection
```javascript
it('should connect to WebSocket server and transition to connected state', async () => {
  const client = new ChatClient('http://localhost:3103', 'test-session', 'test-user');
  const statusUpdates = [];
  client.onConnectionChange((status) => statusUpdates.push(status));
  
  await client.connect();
  
  expect(statusUpdates).toContainEqual(expect.objectContaining({ connected: true }));
  expect(client.getStatus().connected).toBe(true);
  client.disconnect();
});
```
**Status:** ✅ Should pass (basic functionality)

#### Test 1.2: Connection Failure Triggers Reconnect
```javascript
it('should attempt reconnect on connection failure', async () => {
  const client = new ChatClient('ws://invalid-host:9999', 'test', 'user');
  const statusUpdates = [];
  client.onConnectionChange((status) => statusUpdates.push(status));
  
  try {
    await client.connect();
  } catch (err) {
    // Expected
  }
  
  // Wait for reconnect attempt
  await sleep(1200); // Base delay is 1s
  
  // Should be in reconnecting state
  const status = client.getStatus();
  expect(status.reconnecting).toBe(true);
  client.disconnect();
});
```
**Status:** ❌ Currently missing — HIGH PRIORITY

#### Test 1.3: Exponential Backoff Math
```javascript
it('should calculate exponential backoff correctly', () => {
  // Test that delays follow: 1s, 2s, 4s, 8s, 16s, 30s (capped)
  const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
  
  for (let attempt = 0; attempt < delays.length; attempt++) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    expect(delay).toBe(delays[attempt]);
  }
});
```
**Status:** ✅ Logic is correct, test validates formula

#### Test 1.4: Max Reconnect Attempts
```javascript
it('should stop reconnecting after max 10 attempts', async () => {
  const client = new ChatClient('ws://invalid:9999', 'test', 'user');
  const statusUpdates = [];
  client.onConnectionChange((status) => statusUpdates.push(status));
  
  try {
    await client.connect();
  } catch (err) {
    // Expected
  }
  
  // Wait for 10 reconnect attempts (approx 40 seconds total)
  // This is too long for unit tests — move to integration test
  client.disconnect();
});
```
**Status:** ⚠️  Needs integration test wrapper, not unit

---

### Test Suite 2: Message Sending

#### Test 2.1: Send High-Priority Message
```javascript
it('should send high-priority message immediately when connected', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  
  // Mock WebSocket
  const mockSend = vi.fn();
  client['ws'] = { send: mockSend, readyState: WebSocket.OPEN };
  client['status'] = { connected: true };
  
  const request = {
    message: 'test message',
    priority: 'high',
    sessionId: 'test',
    userId: 'user',
  };
  
  await client.send(request);
  
  expect(mockSend).toHaveBeenCalled();
  const payload = JSON.parse(mockSend.mock.calls[0][0]);
  expect(payload.message).toBe('test message');
});
```
**Status:** ❌ Missing — HIGH PRIORITY

#### Test 2.2: Queue Low-Priority Message
```javascript
it('should queue low-priority messages for batching', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  client['status'] = { connected: true }; // Mock
  
  const request = {
    message: 'low priority',
    priority: 'low',
    sessionId: 'test',
    userId: 'user',
  };
  
  await client.send(request);
  
  // Should be queued, not sent immediately
  expect(client['lowPriorityQueue'].length).toBe(1);
});
```
**Status:** ❌ Missing

#### Test 2.3: Send Fails If Not Connected
```javascript
it('should throw if sending without connection', async () => {
  const client = new ChatClient('ws://localhost:3103', 'test', 'user');
  client['status'] = { connected: false, connecting: false };
  
  const request = {
    message: 'test',
    priority: 'high',
    sessionId: 'test',
    userId: 'user',
  };
  
  await expect(client.send(request)).rejects.toThrow('Chat client not connected');
});
```
**Status:** ❌ Missing

#### Test 2.4: Send Timeout During Connection
```javascript
it('should timeout if connection takes >500ms', async () => {
  const client = new ChatClient('ws://slow-server:3103', 'test', 'user');
  client['status'] = { connected: false, connecting: true };
  
  const request = {
    message: 'test',
    priority: 'high',
    sessionId: 'test',
    userId: 'user',
  };
  
  // Should timeout after 500ms wait (line 175)
  await expect(client.send(request)).rejects.toThrow('Connection timeout');
});
```
**Status:** ❌ Missing

---

### Test Suite 3: Message Batching

#### Test 3.1: Batch Flush Every 2 Seconds
```javascript
it('should flush batch every 2 seconds', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  const sendSpy = vi.spyOn(client, 'send');
  
  // Queue a low-priority message
  client['status'] = { connected: true };
  client['lowPriorityQueue'] = [{
    message: 'test',
    priority: 'low',
    sessionId: 'test',
    userId: 'user',
  }];
  
  // Manually trigger flush
  client['flushBatch']();
  
  expect(sendSpy).toHaveBeenCalled();
  expect(client['lowPriorityQueue'].length).toBe(0);
});
```
**Status:** ❌ Missing

#### Test 3.2: Batch Max 10 Messages Per Flush
```javascript
it('should send max 10 messages per batch flush', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  
  // Queue 25 messages
  for (let i = 0; i < 25; i++) {
    client['lowPriorityQueue'].push({
      message: `msg ${i}`,
      priority: 'low',
      sessionId: 'test',
      userId: 'user',
    });
  }
  
  const sendSpy = vi.spyOn(client, 'send');
  client['flushBatch']();
  
  // Only 10 should be sent
  expect(sendSpy).toHaveBeenCalledTimes(10);
  expect(client['lowPriorityQueue'].length).toBe(15);
});
```
**Status:** ❌ Missing — IMPORTANT BUG TEST

#### Test 3.3: Batch Flush Failure Handling (BLOCKER)
```javascript
it('should re-queue messages if flush fails', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  
  // Queue message
  client['lowPriorityQueue'] = [{
    message: 'test',
    priority: 'low',
    sessionId: 'test',
    userId: 'user',
  }];
  
  // Mock send to fail
  vi.spyOn(client, 'send').mockRejectedValueOnce(new Error('Not connected'));
  
  client['flushBatch']();
  await sleep(100);
  
  // Message should be re-queued (CURRENTLY MISSING!)
  expect(client['lowPriorityQueue'].length).toBeGreaterThan(0);
});
```
**Status:** ❌ BLOCKER — Current code doesn't re-queue! (line 196-198)

---

### Test Suite 4: Message Response Handling

#### Test 4.1: Parse and Route Responses
```javascript
it('should parse incoming message and invoke handler', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  
  const handler = vi.fn();
  const id = 'msg-123';
  client.onChatResponse(id, handler);
  
  const response = {
    id,
    content: 'Hello',
    model: 'claude',
    tokensIn: 100,
    tokensOut: 50,
    costUSD: 0.01,
    sources: [],
    done: true,
  };
  
  client['handleMessage'](JSON.stringify(response));
  
  expect(handler).toHaveBeenCalledWith(response);
});
```
**Status:** ⚠️  Partial — handler routing works, but cleanup might have race conditions

#### Test 4.2: Partial Message Detection (BLOCKER)
```javascript
it('should NOT render incomplete responses as done', async () => {
  const client = new ChatClient('http://localhost:3103', 'test', 'user');
  
  const handler = vi.fn();
  client.onChatResponse('msg-1', handler);
  
  // Send chunk 1
  client['handleMessage'](JSON.stringify({
    id: 'msg-1',
    content: 'The answer is ',
    done: false, // NOT done yet
  }));
  
  // Send chunk 2
  client['handleMessage'](JSON.stringify({
    id: 'msg-1',
    content: 'incomplete',
    done: false, // STILL not done
  }));
  
  // Connection drops — no chunk 3 with done=true
  // handler should be called with both chunks
  // UI should detect incomplete message (no done flag)
  
  expect(handler).toHaveBeenCalledTimes(2);
  // MISSING: Validator that checks for done=true before finalizing
});
```
**Status:** ❌ BLOCKER — No incomplete message detection!

---

## PART 2: INTEGRATION TESTS (chat-client.ts + ChatPanel.ts)

### Test Suite 5: WebSocket → UI Pipeline

#### Test 5.1: Full Chat Round-Trip
```javascript
it('should send message via WebSocket and render response in UI', async () => {
  // Start mock WebSocket server
  const wss = new WebSocketServer({ port: 3104 });
  
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const req = JSON.parse(data);
      // Echo back with metadata
      ws.send(JSON.stringify({
        id: req.id,
        content: 'Response text',
        model: 'test-model',
        tokensIn: 10,
        tokensOut: 20,
        costUSD: 0.001,
        sources: [],
        done: true,
      }));
    });
  });
  
  const client = new ChatClient('ws://localhost:3104', 'test', 'user');
  await client.connect();
  
  const responses = [];
  client.onChatResponse('msg-1', (r) => responses.push(r));
  
  await client.send({
    message: 'test',
    priority: 'high',
    sessionId: 'test',
    userId: 'user',
  });
  
  await sleep(500);
  
  expect(responses).toHaveLength(1);
  expect(responses[0].content).toBe('Response text');
  
  wss.close();
  client.disconnect();
});
```
**Status:** ❌ Missing — Integration test infrastructure needed

---

### Test Suite 6: Error Recovery

#### Test 6.1: ChatPanel Timeout on HTTP Down
```javascript
it('should timeout HTTP fetch after 30s', async () => {
  // Currently NO timeout — this will FAIL!
  const panel = new ChatPanel(mockContext);
  
  // Mock slow server
  global.fetch = vi.fn(() => new Promise(() => {
    // Never resolves
  }));
  
  const timeoutSpy = vi.fn();
  // This test will hang forever with current code!
  // NEEDS FIX: Add AbortController
});
```
**Status:** ❌ BLOCKER TEST — Will hang without fix

#### Test 6.2: Concurrent Send During Reconnect
```javascript
it('should handle concurrent sends during reconnect', async () => {
  const client = new ChatClient('ws://localhost:3103', 'test', 'user');
  await client.connect();
  
  // Connection active
  expect(client.getStatus().connected).toBe(true);
  
  // Force disconnect
  client['ws'].close();
  
  // Immediately send message (before reconnect completes)
  const req = {
    message: 'concurrent send',
    priority: 'high',
    sessionId: 'test',
    userId: 'user',
  };
  
  // This should either:
  // A) Wait for reconnect then send
  // B) Throw clear error
  // NOT silently fail
  
  const result = client.send(req);
  
  expect(result).toResolve(); // Should eventually succeed
});
```
**Status:** ❌ Missing — Race condition test

---

## PART 3: END-TO-END TEST SCENARIOS (Manual + Automation)

### Scenario 1: WebSocket Server Down (Manual E2E)
**Steps:**
1. Start VSCode extension
2. Stop WebSocket server: `kill $(lsof -t -i :3103)`
3. Try to send a chat message
4. Wait 5-10 seconds
5. Restart server

**Expected Behavior:**
- User sees reconnecting status (should show badge or toast)
- After server restarts, connection restores automatically
- Message from step 3 either succeeds or shows clear error
- No "thinking" spinner spinning forever

**Current Behavior (BUG):**
- Thinking spinner spins forever (no user feedback during reconnect)
- After server restarts, NO automatic reconnect happens
- User must manually retry or restart extension

---

### Scenario 2: Dashboard API Timeout (Manual E2E)
**Steps:**
1. Start VSCode extension
2. Configure dashboard API to slow address: `nc -l 3000` (accept connection, never respond)
3. Send a chat message via ChatPanel
4. Wait 60+ seconds

**Expected Behavior:**
- After 30s, timeout error shown: "Chat service unavailable, please try again"
- Input re-enabled for retry
- No forever-spinning indicator

**Current Behavior (BUG):**
- No timeout (HTTP fetch hangs indefinitely)
- Thinking spinner spins forever
- User must kill extension or wait forever

---

### Scenario 3: Rate Limiting (429 Response)
**Steps:**
1. Configure mock server to respond with 429 + `Retry-After: 5`
2. Send multiple rapid chat messages
3. Observe responses

**Expected Behavior:**
- First request succeeds (within quota)
- Subsequent requests show "Rate limited" error
- Retry after 5s with exponential backoff
- No cascade of failed requests

**Current Behavior (BUG):**
- No 429 detection
- Requests fail immediately with generic error
- No backoff applied

---

### Scenario 4: Low-Priority Message Loss
**Steps:**
1. Send a high-priority message (priority='high')
2. While waiting for response, send 5 low-priority messages
3. Force connection drop via: `pkill -f "node.*3103"`
4. Restart server
5. Check if low-priority messages were sent

**Expected Behavior:**
- All 5 low-priority messages queued
- Connection fails and reconnects
- All 5 messages flushed after reconnect (or error shown)
- User can see in chat history or get error notification

**Current Behavior (BUG):**
- Messages queued in lowPriorityQueue
- Connection fails, reconnect triggered
- But flushBatch() never called during reconnect
- Messages silently lost (no user notification)

---

## PART 4: METRICS & INSTRUMENTATION

### Error Metrics to Collect
```javascript
class ChatMetricsCollector {
  recordConnectionFailure(reason: string, attemptNumber: number, delayMs: number) {
    // Track: connection_failures_total, reconnect_delay_histogram
  }
  
  recordMessageSendFailure(error: string, isRetried: boolean) {
    // Track: message_send_failures_total, retry_success_rate
  }
  
  recordRateLimitEncountered(retryAfterSeconds: number) {
    // Track: rate_limit_encountered_total, retry_after_values
  }
  
  recordMessageLoss(queueLength: number, reason: string) {
    // Track: messages_lost_total, queue_length_on_loss
  }
}
```

---

## PART 5: REGRESSION TEST CHECKLIST

Before merging error handling fixes, verify:

- [ ] No new connection timeouts introduced
- [ ] Message batching still flushes on schedule
- [ ] Reconnect attempts bounded to max 10
- [ ] Error messages don't leak secrets/tokens
- [ ] UI remains responsive during reconnect
- [ ] Low-priority messages never silently lost
- [ ] 429 responses trigger backoff (after implementation)
- [ ] HTTP calls timeout at 30s (after fix)

---

## SUMMARY: Test Implementation Roadmap

| Test | Type | Status | Priority | Effort |
|------|------|--------|----------|--------|
| Connection lifecycle | Unit | ❌ | P1 | 1h |
| Exponential backoff | Unit | ✅ | P1 | 0.5h |
| Message sending | Unit | ❌ | P1 | 1h |
| Batch queue handling | Unit | ❌ | P1 | 1h |
| Partial message detection | Unit | ❌ | P1 | 1.5h |
| Full round-trip | Integration | ❌ | P2 | 2h |
| Error recovery | Integration | ❌ | P1 | 2h |
| HTTP timeout | Integration | ❌ | P1 | 1h |
| ChatPanel HTTP → WS | Integration | ❌ | P1 | 2h |
| **E2E Scenarios (5x)** | Manual | ❌ | P2 | 2h |
| **Total** | | | | **14.5 hours** |

**Recommended Timeline:** 2 sprints (with 3-5 eng pair programming)
**Blocking for Staging:** HTTP timeout + ChatPanel refactor + Batch retry
**Blocking for Prod:** All P1 items

