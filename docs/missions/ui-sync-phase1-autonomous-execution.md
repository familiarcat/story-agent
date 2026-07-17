# UI Sync Phase 1: Autonomous Crew Execution Mission

**Status:** ACTIVE (Begin Immediately)  
**Timeline:** T+3 days to completion gate  
**Execution Mode:** Autonomous (OpenRouter crew, no human in loop until gate)  
**Created:** 2026-07-17  

## Executive Summary

Execute Phase 1 of the UI Sync architecture. Three crews work in **parallel** with full autonomy. Coordinate asynchronously via RAG memory. All code goes to feature branch `feature/ui-sync-phase1`. **No human orchestration—crew self-organizes.**

### Teams & Leaders
- **Team 1 (Data):** Zustand store architecture → packages/ui/src/stores/use-story-store.ts
- **Team 2 (Riker):** VSCode chat integration → packages/vscode-extension/src/chat/chat-engine.ts
- **Team 3 (Quark):** Cost model report → docs/phase1-cost-analysis.md

### Timeline
- **T+0 (Now):** All teams kickoff
- **T+2 days:** Data + Quark deliver (Riker depends on Data)
- **T+2.5 days:** Riker delivers (after Data)
- **T+3 days:** Gate check (all teams report completion)
- **Gate GREEN:** Phase 2 teams launch (Geordi/Worf/O'Brien)

---

## Team 1: Commander Data — Zustand Store Architecture

**Deliverable:** `packages/ui/src/stores/use-story-store.ts` + `.test.ts`  
**Deadline:** T+2 days  
**Role:** Establish the store foundation (blocks Riker and Phase 2 teams)  

### Requirements (Priority Order)

#### 1. Zustand Store with 4 Modular Slices

Create a Zustand store with full TypeScript typing and modular slice pattern:

```typescript
// Store structure (pseudo):
interface StoryStoreState {
  stories: {
    items: Story[];
    selectedId: string | null;
    changeLog: StoryChange[];
  };
  chat: {
    history: ChatMessage[];
    syncQueue: SyncMessage[];
    batchStatus: 'idle' | 'pending' | 'syncing';
    conflicts: ConflictRecord[];
  };
  crew: {
    status: 'online' | 'offline' | 'busy';
    selectedMemberId: string | null;
  };
  metadata: {
    theme: 'light' | 'dark';
    layout: 'docked' | 'floating';
    syncSettings: { batchWindowMs: number; enableConflictLogging: boolean };
    lastConflict?: ConflictRecord;
  };
}
```

Each slice must be independently selectable and updatable.

#### 2. Middleware Stack (Composable)

Implement composable middleware functions:

- **`withWorfGateAuth`:** Inject WorfGate credentials (read-only at Phase 1, no auth calls)
- **`withAuditLog`:** Immutable changelog of all state mutations for RAG recall
- **`subscribeWithSync`:** Triggers batch sync when store state changes
- **`withDevTools`:** Redux DevTools for debugging state mutations

Middleware must compose without errors:
```typescript
const store = createStoryStore()
  .use(withWorfGateAuth())
  .use(withAuditLog())
  .use(subscribeWithSync())
  .use(withDevTools());
```

#### 3. Sync Mechanics

- **Immediate sync:** User sends chat message → call `mockWebSocketSync()` immediately
- **Batch sync (300ms):** User clicks story/crew selector → batch window → flush at 300ms
- **Conflict detection:** When two updates collide, log + store in `metadata.conflicts`
- **Replay queue:** Unsent messages in `chat.syncQueue` for reconnect replay

#### 4. Type Safety (CRITICAL—NO any types)

- Full TypeScript interfaces for all slices
- Discriminated unions for all state changes
- Generic middleware helper types (no `any` or `unknown` escapes)
- Full coverage via `tsc --noEmit`

#### 5. Mock WebSocket (Phase 1 only)

Implement `mockWebSocketSync()` function:

```typescript
async function mockWebSocketSync(
  messages: SyncMessage[]
): Promise<{ status: 'pending' | 'synced' | 'conflict'; timestamp: number }> {
  // Log the sync event (no real network call)
  console.log(`[MockSync] Batching ${messages.length} messages at ${new Date().toISOString()}`);
  
  // Simulate 300ms batch window
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return mock status (randomly inject conflict for testing)
  return {
    status: Math.random() > 0.95 ? 'conflict' : 'synced',
    timestamp: Date.now(),
  };
}
```

#### 6. Documentation & Tests

- **JSDoc:** Every exported function must have full JSDoc with `@param`, `@returns`, `@example`
- **Factory:** Export `createStoryStore()` factory function
- **Test skeleton:** `use-story-store.test.ts` with >3 test cases:
  - Store creation and slice access
  - Middleware composition
  - Mock sync batching behavior
- **Mock middleware tests:** Verify `withAuditLog` records changes, `subscribeWithSync` batches correctly

### Success Criteria (All must be TRUE for gate)

- [ ] `tsc --noEmit` produces 0 errors
- [ ] All 4 slices independently selectable via `store.getState().{slice}`
- [ ] Middleware composes without errors
- [ ] Mock sync batches correctly (300ms window verified)
- [ ] Conflict detection logs to metadata
- [ ] >3 test cases pass
- [ ] JSDoc on 100% of exports
- [ ] <100ms local sync latency (measure in mock)
- [ ] Files staged and ready for git

### Git Deliverable

```bash
# Branch: feature/ui-sync-phase1
# Commit:
git commit -m "feat(ui): Zustand store with modular slices + mock sync middleware

- Create 4-slice Zustand store (stories, chat, crew, metadata)
- Implement composable middleware (WorfGateAuth, AuditLog, SyncSubscribe, DevTools)
- Mock WebSocket sync with 300ms batching + conflict detection
- Full TypeScript coverage (0 errors, no any types)
- >3 unit tests + test skeleton
- <100ms local sync latency verified"
```

### RAG Completion Signal

When all criteria met, store to RAG:

```
Tag: ui-sync-phase1-data-complete
Content:
- Store API summary (all exported functions)
- Middleware type signatures
- Test results (pass count)
- Latency benchmark (<100ms confirmed)
- Risk assessment (none identified / list any issues)
- Ready for: Riker integration (Team 2)
```

**Impact:** UNBLOCKS Team 2 (Riker) to start VSCode integration.

---

## Team 2: Commander Riker — VSCode Chat Integration

**Deliverable:** `packages/vscode-extension/src/chat/chat-engine.ts` + `.test.ts`  
**Dependency:** Waits for Team 1 (Data) to complete  
**Deadline:** T+2.5 days (T+0.5 days after Data)  
**Role:** Integrate VSCode chat with Zustand store + sync batching  

### Requirements (Priority Order)

#### 1. Replace In-Memory Chat History

Update `ChatEngine` to use Zustand store instead of internal memory:

- Read chat history from: `store.getState().chat.history`
- Append messages via: `store.setState({ chat: { ...prev, history: [...prev.history, msg] } })`
- Keep existing `ChatPanel.ts` integration (zero breaking changes to panel)

#### 2. Sync Trigger Logic

Implement two sync patterns:

**Pattern 1: Immediate Sync (User Actions)**
```
User sends message
  → Call mockWebSocketSync([{type: 'chat', message}])
  → Log result
  → Update store with sync status badge
```

**Pattern 2: Batch Sync (Metadata)**
```
User clicks story selector / crew selector
  → Add to 300ms batch window
  → At 300ms timeout: call mockWebSocketSync(batch)
  → Log result + conflicts
```

Handle response:
- If `status === 'synced'`: update `chat.batchStatus = 'idle'`
- If `status === 'conflict'`: update `metadata.lastConflict = {type, timestamp, data}`
- If `status === 'pending'`: retry at next 300ms window

#### 3. Conflict Detection

- **Log:** `[Sync] Conflict detected: ${conflictType} at T+${elapsedMs}`
- **Store:** `metadata.conflicts.push({type, timestamp, resolved})`
- **Never block user:** Display conflict as note in chat panel (informational only)
- **Resolved:** Conflicts auto-resolve when next sync succeeds

#### 4. Error Handling & Graceful Degradation

- **Sync fails:** Queue to `chat.syncQueue`, retry at next 300ms window
- **Zustand unavailable:** Fall back to in-memory chat (log warning to console)
- **UI feedback:** Display "Sync failed, will retry" message in chat panel
- **Partial delivery:** Dedup messages in `chat.syncQueue` (don't double-send)

#### 5. Message Sync Queue

- Keep unsent messages in `chat.syncQueue` during sync failures
- On reconnect: replay queue messages
- Handle partial delivery: check timestamps to avoid duplicates
- Clear queue when all messages synced

#### 6. ChatPanel Integration

- Import and use `useStoryStore` hook from Team 1's store
- Bind panel message input → `chatEngine.sendMessage(msg)`
- Display sync status as badge: "(pending)" | "(synced)" | "(error)"
- Zero breaking changes to existing ChatPanel behavior

#### 7. Unit Tests (vitest)

Create >5 test cases with >80% coverage on critical paths:

- **Test 1:** Message send and store update
- **Test 2:** Sync batching (300ms window)
- **Test 3:** Conflict detection and logging
- **Test 4:** Error recovery (graceful fallback)
- **Test 5:** ChatPanel integration

Mock Zustand store in tests:
```typescript
const mockStore = {
  getState: () => ({chat: {history: [], syncQueue: []}}),
  setState: vi.fn(),
};
```

### Success Criteria (All must be TRUE for gate)

- [ ] `tsc --noEmit` produces 0 errors
- [ ] ChatPanel uses Zustand store (state reads/writes verified)
- [ ] Immediate sync triggers on user actions
- [ ] Batch sync triggers with 300ms window
- [ ] Conflicts logged + stored in metadata
- [ ] Error recovery works (graceful fallback)
- [ ] >5 test cases pass
- [ ] JSDoc on 100% of exports
- [ ] Files staged and ready for git

### Git Deliverable

```bash
# Branch: feature/ui-sync-phase1
# Commit:
git commit -m "feat(vscode): Integrate chat engine with Zustand store + sync batching

- Replace in-memory chat history with Zustand store
- Implement immediate sync (user actions) + batch sync (metadata)
- Add conflict detection and error recovery
- Integrate with ChatPanel (sync status badge)
- >5 unit tests with mock Zustand store
- Zero breaking changes to existing behavior"
```

### Dependencies & Coordination

**Before starting:**
1. Poll RAG every 10 min for tag: `ui-sync-phase1-data-complete`
2. If not present after 30 min, store to RAG: `Riker: Waiting on Data to complete store architecture`
3. When Data signals complete, proceed immediately

### RAG Completion Signal

When all criteria met, store to RAG:

```
Tag: ui-sync-phase1-riker-complete
Content:
- ChatPanel integration summary
- Sync behavior (immediate + batch)
- Conflict handling (logged + stored)
- Test results (pass count, coverage %)
- Error recovery verification
- Risk assessment (none identified / list any issues)
- Ready for: Phase 2 infrastructure (Teams 4-6)
```

**Impact:** UNBLOCKS Phase 2 teams (Geordi/Worf/O'Brien) to implement real WebSocket.

---

## Team 3: Quark — Phase 1-2 Cost Model & Section 31 Budget Compliance

**Deliverable:** `docs/phase1-cost-analysis.md`  
**Dependency:** None (work independently)  
**Deadline:** T+2 days (parallel with Teams 1-2)  
**Role:** Cost accounting + Section 31 budget verification  

### Requirements (Priority Order)

#### 1. Token Model for Phase 1

Estimate token consumption per sync operation:

**Per-message estimates:**
- Zustand state serialization: ~50 tokens/batch
- Chat history (3 messages): ~20 tokens
- Metadata update: ~10 tokens
- Mock sync: 0 tokens (local only, no network)

**Average workload:**
- 2-3 messages per 300ms batch
- 1 sync token per batch (not per message)
- User active for 1 hour: ~30 tokens/hour

**Phase 1 (Mock, no real network):**
- Total token cost: **0 tokens** (all local, no API calls)
- Cost: **$0**

#### 2. Cost Per User

Calculate per-user cost during different phases:

**Phase 1 (Mock WebSocket):**
- User cost: $0/user/hour (no real network calls)
- 100 concurrent users: $0/hour

**Phase 2 (Real WebSocket + Aha logging):**
- Aha audit logging overhead: ~50 tokens/user/hour
- Token cost: ~$0.0002/user/hour (using OpenRouter tier-3 pricing)
- 100 concurrent users: $0.02/hour real cost
- 730 hours/month (30 days): $14.60/month per 100 users

#### 3. Batching Impact Analysis

Quantify the savings from 300ms batching vs no batching:

**Without batching:**
- 1 sync per message
- 100 users × 2 messages/second = 200 messages/sec
- ~1 token per message = 200 tokens/sec
- Cost: 200 × $0.000006 = $0.0012/sec = $43.2/hour

**With 300ms batching (Phase 1-2):**
- 1 sync per batch (3-4 messages)
- 100 users × 2 messages/sec ÷ 3.5 messages/batch = ~57 batches/sec
- ~50 tokens per batch = 2,850 tokens/sec (more complex batching overhead)
- Cost: 2,850 × $0.000006 = $0.0171/sec = $61.56/hour

**Conclusion:** Batching INCREASES token count BUT reduces actual wall-clock API calls by ~70% (57 vs 200 calls/sec), which translates to:
- **API call reduction:** 70%
- **Latency improvement:** ~85% (fewer network round-trips)
- **Cost per call:** Slightly higher (richer payloads) but far fewer calls

#### 4. Adaptive Throttle Algorithm

Define dynamic batch window adjustment based on queue depth:

```
Monitor sync queue every 10s:

if queue_depth <= 10:
  batch_window = 300ms        // Normal operation
  
elif queue_depth 11-20:
  batch_window = 500ms        // Slight slowdown
  
elif queue_depth 21-50:
  batch_window = 750ms        // Moderate backpressure
  
elif queue_depth > 50:
  batch_window = 1000ms       // Heavy backpressure (defensive)
  
if queue_cleared:
  batch_window = 300ms        // Reset to normal
```

**Logging:**
- Every throttle state change → log to RAG for historical analysis
- Tag: `ui-sync-throttle-{timestamp}`
- Content: `{queue_depth, batch_window_ms, reason}`

#### 5. Section 31 Budget Verification

Verify Phase 1-2 fit within Section 31 budget:

**Current allocation:**
- $1,000/week for 100 active users
- Assumes ~$14/week operational overhead (crew runs, Aha logging, etc.)

**Phase 1 overhead (Week 1):**
- Mock sync: $0 (local only)
- Logging: ~$1 (RAG memory write for standups)
- **Phase 1 Total: ~$1/week**

**Phase 2 overhead (Week 2-3):**
- Real WebSocket: ~$0.0002/user/hour × 100 users × 168 hours = $3.36/week
- Aha audit logging: ~$10/week (assume 50 crew operations per week)
- **Phase 2 Total: ~$13.36/week**

**Budget after Phase 1-2:**
- Starting: $1,000/week
- Phase 1-2 cost: $14.36 total
- Remaining: $985.64/week for other crew operations
- **Verdict: FITS COMFORTABLY** ✓

#### 6. Report Format (Markdown)

Create `docs/phase1-cost-analysis.md` with sections:

1. **Token Accounting Model**
   - Per-operation estimates (chat, metadata, batch)
   - Phase 1 vs Phase 2 token consumption
   - Rationale for estimates

2. **Per-User Cost Estimates**
   - Phase 1: $0/user/hour (mock)
   - Phase 2: $0.0002/user/hour (real WebSocket)
   - 100 users: $0 Phase 1, $0.02/hour Phase 2

3. **Batching Impact Analysis**
   - Without batching: 43.2/hour (inefficient)
   - With batching: 61.56/hour (fewer API calls, higher density)
   - Overall savings: 70% fewer API calls, 85% latency improvement

4. **Adaptive Throttle Algorithm**
   - Queue monitoring interval: 10s
   - Thresholds: 10, 20, 50 messages
   - State transitions: normal → mild → moderate → defensive → reset
   - Logging strategy: every state change to RAG

5. **Section 31 Budget Compliance**
   - Current: $1,000/week
   - Phase 1: ~$1/week
   - Phase 2: ~$13/week
   - Remaining: ~$985/week
   - Conclusion: Phase 1-2 FIT within budget ✓

6. **Appendix: Assumptions & Sensitivity**
   - Assume 2 messages/user/sec average
   - Assume 50 tokens/batch serialization cost
   - Sensitivity: if 2x more users → $0.04/hour Phase 2 (still fits budget)

### Success Criteria (All must be TRUE for gate)

- [ ] Token model documented with per-operation estimates
- [ ] Per-user costs calculated ($0 Phase 1, $0.0002/hr Phase 2)
- [ ] Batching savings quantified (API call reduction: 70%)
- [ ] Throttle algorithm pseudocode provided with thresholds
- [ ] Section 31 budget verified within limits
- [ ] Report stored to RAG + ready for git

### Git Deliverable

```bash
# Branch: feature/ui-sync-phase1
# Commit:
git commit -m "docs(cost): Phase 1-2 cost model + Section 31 budget compliance

- Token accounting model (50 tokens/batch estimate)
- Per-user costs: Phase 1 $0, Phase 2 $0.0002/hour
- Batching impact: 70% API call reduction
- Adaptive throttle algorithm (queue-depth based)
- Section 31 budget: $1k/week, Phase 1-2 uses ~$14, remaining ~$985"
```

### RAG Completion Signal

When all criteria met, store to RAG:

```
Tag: ui-sync-phase1-quark-complete
Content:
- Cost model summary (token rates, per-user estimates)
- Batching impact (70% call reduction quantified)
- Throttle algorithm (all thresholds documented)
- Section 31 status: COMPLIANT (budget: $14 of $1k)
- Ready for: Phase 2 cost tracking
```

**Impact:** Cost tracking framework for all future crew operations.

---

## Execution Protocol (Async, RAG-Coordinated)

### Kickoff (T+0, NOW)

1. All three teams receive this mission brief
2. Teams 1 & 3 start immediately (no dependencies)
3. Team 2 polls RAG every 10 min for `ui-sync-phase1-data-complete`
4. Each team stores RAG completion signal when done

### Daily Coordination (Async)

Each team posts daily standup to RAG:

**Tag:** `ui-sync-phase1-standup-{team-name}` (e.g., `ui-sync-phase1-standup-data`)

**Content:**
```
TEAM: {Data | Riker | Quark}
STATUS: {In Progress | Complete}
TODAY: {Completed today, 2-3 bullets}
BLOCKERS: {None | Description of blocker(s)}
NEXT: {Tomorrow's plan}
RISKS: {Identified risks + mitigation}
```

Example:
```
TEAM: Data
STATUS: In Progress
TODAY: 
- Zustand store core structure complete (4 slices)
- Middleware stack compiling (withWorfGateAuth, withAuditLog)
- Mock sync function drafted (300ms batching logic)
BLOCKERS: None
NEXT: Finish middleware composition tests + JSDoc
RISKS: DevTools integration may require extra typing work
```

### Blocker Escalation

If team hits blocker:

**Tag:** `ui-sync-phase1-blocker-{team-name}` (e.g., `ui-sync-phase1-blocker-riker`)

**Content:**
```
TEAM: {Name}
ISSUE: {What is blocked}
ROOT: {Why is it blocked}
PROPOSED: {Proposed solution}
IMPACT: {Impact on deadline if not resolved}
REQUEST: {What is needed from other teams}
```

Example:
```
TEAM: Riker
ISSUE: ChatPanel.tsx has circular import with useStoryStore
ROOT: ChatPanel imports ChatEngine, ChatEngine imports useStoryStore from stores/, but stores/ needs types from components/
PROPOSED: Move useStoryStore hook to hooks/ directory, update imports
IMPACT: Low (1-2 hour fix), no deadline impact
REQUEST: Data team review new hook location
```

### Gate Check (T+3 days)

All three teams confirm completion:

**Phase 1 Success Checklist:**

**Team 1 (Data):**
- [ ] `tsc --noEmit` produces 0 errors
- [ ] All 4 slices independently selectable
- [ ] Middleware composes
- [ ] Mock sync batches correctly (300ms)
- [ ] Conflict detection works
- [ ] >3 tests pass
- [ ] JSDoc on 100% of exports
- [ ] <100ms local latency
- [ ] Ready for git

**Team 2 (Riker):**
- [ ] `tsc --noEmit` produces 0 errors
- [ ] ChatPanel uses Zustand store
- [ ] Immediate sync on actions
- [ ] Batch sync (300ms) works
- [ ] Conflicts logged + stored
- [ ] Error recovery works
- [ ] >5 tests pass
- [ ] JSDoc on 100% of exports
- [ ] Ready for git

**Team 3 (Quark):**
- [ ] Token model documented
- [ ] Per-user costs calculated
- [ ] Batching savings quantified
- [ ] Throttle algorithm defined
- [ ] Section 31 verified compliant
- [ ] Report ready for git

### GATE: GREEN or RED?

**GREEN:** All teams confirm completion + all criteria met
- → Phase 2 teams launch immediately (Geordi/Worf/O'Brien)

**RED:** Any team incomplete or criteria not met
- → Store blocker to RAG with `ui-sync-phase1-blocker-{team}`
- → Request extension (max +2 days)
- → Crew negotiates mitigation

---

## Phase 2: Real WebSocket (Week 2-3)

Once Phase 1 GREEN, the following teams activate:

### Team 4: Geordi La Forge (Infrastructure)

**Deliverable:** `packages/mcp-server/src/lib/chat-websocket-sync.ts`
- Real WebSocket endpoint at `/sync` (port 3106)
- Connection pooling + session tracking
- Message queue + replay on reconnect
- Health checks + metrics

### Team 5: Lt. Worf (Security)

**Deliverable:** Per-message auth schema + audit logging
- JWT signing + verification (WorfGate)
- Rate limiting (10 requests/sec per user)
- Injection detection on sync payloads
- Immutable audit log

### Team 6: Chief O'Brien (DevOps)

**Deliverable:** Integration + deployment
- Wire Zustand sync middleware → Geordi's WebSocket endpoint
- Update VSCode extension to use real WebSocket (replace mock)
- Docker compose config + local dev setup
- Rollback strategy (fallback to mock if WebSocket fails)

### Phase 2 Success Criteria

- >99.9% sync message delivery
- <500ms P99 latency on 10 concurrent connections
- 100% message audit coverage (WorfGate signed)
- Extension hot-reload compatible

---

## Success Criteria Summary

### Phase 1 Final Gate (T+3 days)

**MUST HAVE (All teams):**
- [ ] Code compiles: `tsc --noEmit` (0 errors)
- [ ] All tests pass: `vitest run`
- [ ] JSDoc on 100% of exports
- [ ] <100ms local sync latency (Data benchmark)
- [ ] Commits staged and ready for main

**TEAM 1 (Data) Specifics:**
- [ ] Zustand store with 4 slices
- [ ] Middleware stack composes
- [ ] Mock sync batches at 300ms
- [ ] Conflict detection works

**TEAM 2 (Riker) Specifics:**
- [ ] ChatPanel uses Zustand state
- [ ] Immediate sync on user actions
- [ ] Batch sync on metadata (300ms)
- [ ] Error recovery verified

**TEAM 3 (Quark) Specifics:**
- [ ] Token model documented
- [ ] Section 31 budget: COMPLIANT
- [ ] Batching savings: 70% quantified
- [ ] Throttle algorithm: pseudocode provided

### Phase 1 → Phase 2 Gate

**GREEN (Phase 2 teams launch):**
```
All teams report: "Phase 1 complete and ready for Phase 2"
All code compiles
All tests pass
All RAG completion signals stored
Commits ready for staging
```

**NO-GO conditions:**
- Code does not compile
- Tests fail
- <80% JSDoc coverage
- Any critical blocker unresolved
- >100ms latency (Data)

---

## Deliverable Files

### Team 1 (Data)
```
packages/ui/src/stores/use-story-store.ts       (primary)
packages/ui/src/stores/use-story-store.test.ts  (tests)
```

### Team 2 (Riker)
```
packages/vscode-extension/src/chat/chat-engine.ts       (primary)
packages/vscode-extension/src/chat/chat-engine.test.ts  (tests)
```

### Team 3 (Quark)
```
docs/phase1-cost-analysis.md                    (primary)
```

### Feature Branch

All work goes to: `feature/ui-sync-phase1`

### Commit Structure

Each team makes 1 commit per section above. Example:

```bash
# Data
git commit -m "feat(ui): Zustand store with modular slices + mock sync middleware"

# Riker (after Data)
git commit -m "feat(vscode): Integrate chat engine with Zustand store + sync batching"

# Quark (parallel)
git commit -m "docs(cost): Phase 1-2 cost model + Section 31 budget compliance"
```

---

## Crew Autonomy & Expectations

### Full Autonomy Given

Each team:
- ✓ Makes all architectural decisions
- ✓ Writes all code
- ✓ Writes all tests
- ✓ Documents all decisions
- ✓ Stores all learnings to RAG

### Expectations

- No human intervention until Phase 1 gate check
- Coordinate only via RAG tags (no meetings)
- Daily standups logged to RAG (asynchronous)
- Blockers escalated to RAG with proposed solutions
- Code compiles (tsc) before committing
- Tests pass before committing
- All JSDoc complete before committing

### Decision Authority

- **Data:** Full authority over store architecture, middleware design, type safety
- **Riker:** Full authority over ChatPanel integration, sync logic, error handling
- **Quark:** Full authority over cost model, budget allocations, throttle algorithm

### Escalation Path

Team → RAG blocker tag → Crew consensus via Observation Lounge (if needed)

---

## Success Metrics

**Phase 1 Completion = All teams report:**
1. Code compiles (tsc --noEmit)
2. Tests pass (vitest)
3. JSDoc 100%
4. Commits ready
5. RAG signals stored
6. Zero critical blockers

**Phase 2 Readiness = All teams report:**
1. Phase 1 gate GREEN
2. Ready for Phase 2 kickoff
3. Knowledge transfer complete (RAG + code comments)

---

## BEGIN NOW

All teams: Receive mission brief, start immediately. Coordinate via RAG. Report daily. Complete gate criteria by T+3 days.

**Mission Status:** ACTIVE ✓
