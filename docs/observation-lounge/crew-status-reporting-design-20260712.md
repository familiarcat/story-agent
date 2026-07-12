# Real-Time Crew Status Reporting Architecture
## Observation Lounge Consensus — 2026-07-12

**Date:** 2026-07-12 | **Synthesized from:** Design questions across 5 integration points | **Cost Model:** Frugal tier (tier-3 DeepSeek for reporting logic)

---

## Executive Summary

The crew currently executes tasks autonomously but users see only a final response. This design introduces **real-time execution feedback** (what officers are doing, success/failure outcomes) **streamed to chat**, then stored as **institutional memory for future task routing and crew calibration**.

**Key decision:** Centralized progress queue (Option C hybrid) — officers report to Riker, Riker batches + streams consolidated view. Single stream to chat, minimal latency, cost-efficient aggregation.

---

## DESIGN QUESTIONS & CREW CONSENSUS

### 1. Real-Time Feedback Channel — DECISION: Option C (Hybrid Riker Aggregation)

**Question:** How should crew members report progress to chat?

**Options Evaluated:**
- **Option A** (Parallel SSE per officer): Each officer opens SSE stream to chat client. Complex multiplexing, race conditions on simultaneous updates, harder for UI to coordinate.
- **Option B** (Centralized queue): Riker aggregates → single stream to client. Simple but becomes a bottleneck if many officers report frequently.
- **Option C** (Hybrid Riker batching): Officers report to Riker via internal queue, Riker batches at 200ms intervals, streams consolidated view. ✅ CHOSEN

**Rationale:**
- **Latency:** ~250ms end-to-end (officer → Riker → stream → client) acceptable for task-level reporting.
- **Cost:** Single stream = one SSE connection; batching reduces event count by ~80%.
- **Complexity:** Riker is the control plane already; extends naturally.
- **Scalability:** Riker's in-memory queue handles 100+ officers reporting simultaneously.

**Implementation:** Riker maintains a `statusUpdateQueue` (Redis or in-memory), drains every 200ms, emits `crew-status-batch` event to chat stream with all updates from that window.

---

### 2. Outcome Memory Structure — MINIMAL SCHEMA (7 fields + optional)

**Question:** What should crew remember about each execution?

**Essential Fields (7):**
```typescript
interface CrewExecutionOutcome {
  crew_id: string;           // "geordi", "scotty", etc.
  attempt_id: string;        // UUID, unique per task attempt
  task_description: string;  // "UI header cleanup on cost/page.tsx"
  status: "success" | "blocked" | "retry";  // outcome
  duration_seconds: number;  // elapsed time
  confidence_level: "high" | "medium" | "low";  // officer's self-assessment
  timestamp: ISO8601;        // when completed
}
```

**Optional Fields (stored if relevant):**
```typescript
  complexity_estimate: number;    // pre-task estimate (1-10)
  complexity_actual: number;      // post-task actual (1-10)
  error_message: string;          // blocker reason if blocked
  recovery_attempts: number;      // how many retries
  files_touched: string[];        // file paths affected
  dependencies_unblocked: string[];  // task IDs this unblocked
```

**RAG Storage Format:**
```
crew_execution_outcome_{crew_id}_{attempt_id}
Tags: crew, {crew_id}, execution-outcome, status:{status}, {YYYY-MM-DD}
Content: JSON above + raw findings from execution
```

**Example Memory Record:**
```
crew_execution_outcome_geordi_abc123def456
Tags: crew, geordi, execution-outcome, status:success, 2026-07-12
{
  "crew_id": "geordi",
  "attempt_id": "abc123def456",
  "task_description": "Refactor UI navigation header component (3 files: cost/page.tsx, learnings/page.tsx, observations/page.tsx)",
  "status": "success",
  "duration_seconds": 45,
  "confidence_level": "high",
  "timestamp": "2026-07-12T14:32:18Z",
  "complexity_estimate": 6,
  "complexity_actual": 5,
  "files_touched": ["packages/ui/app/cost/page.tsx", "packages/ui/app/learnings/page.tsx", "packages/ui/app/observations/page.tsx"],
  "dependencies_unblocked": []
}
```

**Why minimal:** Maximizes recall speed; optional fields stored only on interesting variations (complex tasks, failures). Enables crew to learn: high-confidence officers ≈ 95% success; low-confidence ≈ 60%.

---

### 3. Chat Display Format — Response Schema

**Question:** How should user see status updates in real time?

**Response Schema (One Status Batch):**
```typescript
interface CrewStatusStreamMessage {
  type: "crew-status-batch";
  batch_id: string;           // UUID, correlates batch
  timestamp: ISO8601;
  active_officers: number;    // currently executing
  updates: [
    {
      crew_id: string;
      officer_name: string;   // "Geordi La Forge"
      current_task: string;   // truncated to 60 chars
      status: "in-progress" | "success" | "blocked" | "retry";
      progress_step: number;  // e.g. 2 of 3 files
      last_update: ISO8601;
      elapsed_seconds: number;
      error_message?: string; // if blocked
      confidence?: "high" | "medium" | "low";  // for completed
    }
  ];
  summary: {
    total_tasks: number;
    succeeded: number;
    blocked: number;
    in_progress: number;
    avg_duration: number;
  };
}
```

**Display (VSCode Chat):**
```
🖖 CREW EXECUTING (5 officers active)

🟢 Geordi La Forge  |  UI header cleanup  |  ✓ SUCCESS (45s)
   confidence: high | 3 of 3 files touched

🟡 Scotty  |  Redis pub/sub tuning  |  IN PROGRESS (12s)
   step 2 of 4: benchmarking connections

🟠 Data  |  Analytics schema  |  BLOCKED
   ERROR: missing feature flag enum in aha-events.ts

🟢 Riker  |  Chat response unification  |  ✓ SUCCESS (38s)
   confidence: high | resolved 6 fields

🟢 Crusher  |  Deploy health check  |  ✓ SUCCESS (22s)
   confidence: high | monitoring endpoints verified

─────────────────────────────────────
SUMMARY: 5 tasks, 4 succeeded, 1 blocked, 0 in-progress
Average duration: 36.5s | Batch ID: batch-89a7f2e1
```

**Update Mechanism:** In-stream via SSE events (same WebSocket as chat responses). Each batch arrives as a discrete `crew-status-batch` event, chat UI appends/replaces the status card region. **No polling** — Riker drives updates at 200ms intervals.

---

### 4. Integration Points — DECISION: Modify runMissionPipeline + New Chat Service Handler

**Question:** Where does this live in the codebase?

**Chosen Integration Path:**
1. **At execution layer (runMissionPipeline):** Each officer's task attempt already returns `{status, duration, error, files}`. ✅ Extend to emit internal `crew-status-update` events to Riker's queue.
2. **Riker aggregation layer:** New `crewStatusRiker` service (packages/mcp-server/src/lib/crew-status-riker.ts) maintains the queue, batches, emits.
3. **Chat service integration:** Modify `chatEngine.ts` (VSCode chat) + unified-chat-response handler to subscribe to `crew-status-batch` events and render status cards in-stream.
4. **Storage layer:** After mission completes, `runMissionPipeline` writes each officer's outcome to RAG via `storeCrewPersonalMemory` with the schema above.

**Why NOT:**
- ~~New `/api/crew/status-stream` endpoint~~ — Would duplicate SSE logic; reuse chat's existing streaming.
- ~~VSCode chat engine only~~ — Unified chat response architecture (upcoming) should own this; we're preparing the schema.

**File Changes Needed:**
```
packages/mcp-server/src/lib/crew-mission-pipeline.ts
  → After each officer's attempt: emit crew-status-update to queue

packages/mcp-server/src/lib/crew-status-riker.ts (NEW)
  → StatusUpdateQueue, batch drain, emit crew-status-batch

packages/mcp-server/src/agent-core/prompt-engine.ts
  → When Quark executes a task: emit status update with attempt_id, duration, files

packages/ui/app/chat/chatEngine.ts
  → Subscribe to crew-status-batch, render status card in chat stream

packages/shared/src/db.ts
  → storeCrewExecutionOutcome() helper (wraps storeCrewPersonalMemory with schema)
```

---

### 5. Failure Handling + Retry — DECISION: Option C (Hybrid Auto-Retry)

**Question:** How to balance autonomy vs user control?

**Decision: Hybrid — Simple failures auto-retry, complex blockers ask user**

**Simple Failures (Auto-retry, up to 2 times):**
- Transient network error (timeout, DNS)
- Temporary resource contention (file locked, Redis timeout)
- Recoverable abort (WorfGate yellow, not red)
- **Retry delay:** 3s + exponential backoff

**Complex Blockers (Ask user before retry):**
- Missing environment variable (WorfGate red gate)
- Code syntax error in edited file
- Dependency not found (e.g., missing enum)
- User explicitly rejected the task

**Failure Mode Storage:**
```typescript
{
  ...CrewExecutionOutcome,
  status: "retry",
  recovery_attempts: [
    {
      attempt_number: 1,
      failure_mode: "timeout",
      recovered: true,
      retry_delay_ms: 3000,
      timestamp: "2026-07-12T14:32:10Z"
    }
  ]
}
```

**Retry Logic Entry Point:** In `prompt-engine.ts` task execution wrapper. After officer completes, check error classification; if simple → auto-retry within same mission; if complex → record and escalate to user.

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    CREW EXECUTION LAYER                     │
│  (runMissionPipeline → Picard → Riker → Officers)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Each officer attempt:
                    {status, duration, files, error}
                           │
                           ▼
                ┌────────────────────────┐
                │  crew-status-update   │
                │  (internal event)      │
                └────────────┬───────────┘
                             │
                             ▼
                ┌─────────────────────────────────────┐
                │   Riker Status Queue (Redis/mem)    │
                │   - Drains every 200ms              │
                │   - Aggregates officer updates      │
                │   - Emits crew-status-batch         │
                └────────────┬────────────────────────┘
                             │
                  crew-status-batch event
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ VSCode   │      │   Web    │      │   CLI    │
    │  Chat    │      │  Lounge  │      │  Output  │
    │ Render   │      │ Dashboard│      │  (NDJSON)│
    └──────────┘      └──────────┘      └──────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
         ┌────────────────────────────────────┐
         │  Post-Mission: Store Outcomes      │
         │  - storeCrewExecutionOutcome()     │
         │  - RAG: crew_execution_outcome_*   │
         │  - Tag: crew, {officer}, status    │
         └────────────────────────────────────┘
                             │
                             ▼
         ┌────────────────────────────────────┐
         │  Institutional Memory              │
         │  - Crew performance history        │
         │  - Task routing calibration        │
         │  - Officer confidence patterns     │
         └────────────────────────────────────┘
```

---

## IMPLEMENTATION ROADMAP (3 Phases)

### Phase 1: Outcome Memory Logging (Week 1 — This Week)
**Owner:** Geordi La Forge (Engineering) + Data (Analytics)  
**Effort:** 3 days | **Cost Model:** Frugal tier, ~$0.02 per mission  
**Deliverables:**
- [x] Define CrewExecutionOutcome schema (7 essential fields)
- [ ] Implement `storeCrewExecutionOutcome()` helper in `packages/shared/src/db.ts`
- [ ] Extend `prompt-engine.ts` to capture {status, duration, files, error} after each task attempt
- [ ] Modify `runMissionPipeline` to emit crew-status-update events (no display yet, just logging to Redis queue)
- [ ] Write 10 test executions, verify outcomes stored to RAG with correct tags
- [ ] **Proof of Concept:** One officer's execution outcome (e.g., Geordi UI header cleanup) stored + readable from Observation Lounge

**Success Criteria:**
- Each officer's task attempt creates a RAG memory record with 7 fields populated
- Query RAG: `crew_execution_outcome_geordi_*` returns 10+ records with success rates
- No latency impact on execution (<50ms overhead per task)

---

### Phase 2: VSCode Chat Live Status Display (Week 2)
**Owner:** Riker (Delivery) + VSCode Extension team  
**Effort:** 4 days | **Cost Model:** Frugal tier, ~$0.01 per batch (200ms window)  
**Deliverables:**
- [ ] Implement `crew-status-riker.ts`: StatusUpdateQueue, 200ms batch drain, crew-status-batch event emission
- [ ] Modify `chatEngine.ts` to subscribe to `crew-status-batch` events
- [ ] Design status card React component (show officer name, task, status, progress, error)
- [ ] Integrate card into VSCode chat response stream (SSE-driven re-render)
- [ ] Test: Run a 5-officer mission, observe live status updates in chat every ~250ms
- [ ] **End-to-end test:** User sees officer names, tasks, success/failure in real time

**Success Criteria:**
- Status cards appear in VSCode chat within 300ms of officer completing task
- No message ordering issues (cards don't backlog or duplicate)
- Chat remains responsive during high-frequency updates (10+ officers simultaneously)

---

### Phase 3: Crew Performance Dashboard + Task Routing (Week 3+)
**Owner:** Data (Analytics) + Quark (Optimization)  
**Effort:** 5 days | **Cost Model:** Frugal tier, analytics queries cached 1h  
**Deliverables:**
- [ ] Implement `crewPerformanceMetrics()` query: success rate, avg duration, confidence patterns per officer (last 20 tasks)
- [ ] Add **Observation Lounge** dashboard section: "Crew Performance" cards (one per officer, sortable by success rate, latest outcome)
- [ ] Implement task-routing logic: When user submits new task, query performance metrics and suggest best-suited officer
- [ ] Store suggestion choice + actual outcome as A/B feedback to RAG
- [ ] **Proof of Concept:** Dashboard shows Geordi 95% success (UI tasks), Scotty 80% (infra tasks), routing recommends Geordi for next UI task
- [ ] Add MCP tool `get_crew_performance_metrics` for script-based routing decisions

**Success Criteria:**
- Crew Performance dashboard loads in <500ms (cached metrics)
- Task routing suggestions improve over time (track success rate of routed tasks vs random assignment)
- Observation Lounge surfaces top performers + blockers clearly

---

## PROOF OF CONCEPT — READY TO BUILD

**Minimal PoC (48 hours):**

1. **Schema Migration (30 min):**
   ```sql
   -- Add crew_execution_outcomes table (or extend crew_personal_memory with structured JSON type)
   CREATE TABLE crew_execution_outcomes (
     id UUID PRIMARY KEY,
     crew_id TEXT NOT NULL,
     attempt_id UUID UNIQUE NOT NULL,
     task_description TEXT NOT NULL,
     status TEXT CHECK (status IN ('success', 'blocked', 'retry')),
     duration_seconds INT,
     confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
     files_touched JSONB,
     error_message TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Store Function (2 hours):**
   ```typescript
   // packages/shared/src/db.ts
   export async function storeCrewExecutionOutcome(outcome: CrewExecutionOutcome) {
     // Write to crew_execution_outcomes table
     // Also write to crew_personal_memory for RAG recall
     // Return {id, rag_tag}
   }
   ```

3. **Capture Point (1 hour):**
   ```typescript
   // packages/mcp-server/src/agent-core/prompt-engine.ts — around line 200 (task execution)
   // After officer completes task, call storeCrewExecutionOutcome()
   ```

4. **Test & Verify (30 min):**
   - Run existing mission script (e.g., nav refactor)
   - Query RAG: `crew_execution_outcome_*`
   - Confirm 5+ records with populated fields

**Next 48 hours: Phase 1 full completion** (add Riker queue, batch events, observability logging)

---

## CREW PERFORMANCE METRICS (Proof of Concept)

**Metrics Schema (Post-Phase 1):**
```typescript
interface CrewPerformanceMetrics {
  crew_id: string;
  officer_name: string;
  total_tasks_last_20: number;
  success_rate: number;           // 0.0-1.0, success/(success+blocked+retry)
  avg_duration_seconds: number;
  high_confidence_success_rate: number;  // when confidence="high"
  blockers_by_mode: Record<string, number>;  // {"timeout": 2, "missing_env": 1}
  recent_outcomes: CrewExecutionOutcome[];  // last 5, for context
  trending: "improving" | "stable" | "regressing";  // compared to week-ago average
}
```

**Dashboard Concept (Observation Lounge — new section):**
```
🖖 CREW PERFORMANCE (Last 20 Tasks)

Geordi La Forge  ████████░░ 95%  avg: 42s  🟢 High confidence 97%
  Specialization: UI/frontend
  Latest: ✓ UI header cleanup (45s, high confidence)
  Blocker modes: timeout (1), file_locked (1)

Scotty           ███░░░░░░░ 80%  avg: 58s  🟡 Medium confidence 68%
  Specialization: Infrastructure
  Latest: ⧖ Redis pub/sub tuning (in-progress)
  Blocker modes: missing_env (2), syntax_error (1)

Data             █████████░ 92%  avg: 35s  🟢 High confidence 94%
  Specialization: Analytics
  Latest: ✓ Analytics schema (38s, high confidence)
  Blocker modes: dependency_not_found (1)

[...]
```

---

## CONSTRAINTS & COMPLIANCE

✅ **Minimize cost (frugal tier):**
- Reporting logic uses tier-3 DeepSeek (~$0.0001 per outcome)
- Riker batching reduces event count by 80%
- RAG queries cached 1h (analytics dashboard)

✅ **Don't block execution (async, fire-and-forget):**
- Status updates emitted to queue, not awaited
- Outcome storage post-mission (doesn't delay completion)
- Officer doesn't wait for RAG write before next task

✅ **Respect WorfGate:**
- Each task attempt logs credential usage (WorfGate audit trail)
- Status updates include failure_mode (distinguishes WorfGate red vs transient)
- Retry logic respects WorfGate tier (yellow auto-retry, red escalates)

✅ **Store all outcomes automatically:**
- No manual recording step
- Embedded in task completion path (`prompt-engine.ts`)
- Automatic RAG tag assignment

---

## NEXT STEPS (CREW CONSENSUS)

1. **Immediate (today):** Geordi + Data review schema, define table migration
2. **This week (Phase 1):** Build storeCrewExecutionOutcome + capture in prompt-engine, test on 10 missions
3. **Next week (Phase 2):** Riker implements crew-status-riker.ts + VSCode chat integration
4. **Week after (Phase 3):** Data builds Observation Lounge dashboard + task routing

**Crew Sign-Off:**
- **Picard:** Architecture approved, feedback flow clear, no architectural debt
- **Riker:** Integration path is lean, reuses existing chat stream
- **Geordi:** Roadmap is achievable, 3-day Phase 1 is realistic
- **Quark:** Cost model is frugal, batch aggregation minimizes overhead
- **Data:** Metrics schema is sound, PoC dashboard doable in 5 days
- **Scotty:** Phase 1 should go first, highest ROI
- **Worf:** WorfGate is respected in all retry/credential logic
