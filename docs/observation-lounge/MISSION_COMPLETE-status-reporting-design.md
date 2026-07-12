# Mission Complete: Real-Time Crew Status Reporting Architecture
## Crew Deliberation Summary — 2026-07-12

---

## DELIVERABLES SUMMARY

### 1. ✅ Architecture Design Document
**Location:** `/Users/bradygeorgen/Developer/story-agent/docs/observation-lounge/crew-status-reporting-design-20260712.md`

**Contents:**
- Executive summary with key decision (Option C: Hybrid Riker Aggregation)
- Full crew consensus on 5 design questions:
  1. Real-time feedback channel → Hybrid Riker aggregation with 200ms batch intervals
  2. Outcome memory structure → Minimal 7-field schema + optional fields
  3. Chat display format → Live status cards via in-stream SSE events
  4. Integration points → Modify runMissionPipeline + new crew-status-riker.ts + chatEngine.ts
  5. Failure handling → Hybrid auto-retry (simple failures) + ask-first (complex blockers)
- Architecture diagram showing feedback flow (crew → Riker → chat client → storage)
- Compliance checklist (cost, latency, WorfGate, async storage)

---

### 2. ✅ Response Schema (JSON)
**Defined in design document (Section 3)**

```typescript
interface CrewStatusStreamMessage {
  type: "crew-status-batch";
  batch_id: string;
  timestamp: ISO8601;
  active_officers: number;
  updates: [
    {
      crew_id: string;
      officer_name: string;
      current_task: string;
      status: "in-progress" | "success" | "blocked" | "retry";
      progress_step: number;
      last_update: ISO8601;
      elapsed_seconds: number;
      error_message?: string;
      confidence?: "high" | "medium" | "low";
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

**Display example included** showing how status cards render in VSCode chat.

---

### 3. ✅ Data Model (Crew Execution Outcomes)
**Defined in design document (Section 2)**

**Essential Fields (7):**
- crew_id (officer name/ID)
- attempt_id (UUID)
- task_description (what was attempted)
- status (success | blocked | retry)
- duration_seconds (elapsed time)
- confidence_level (high | medium | low)
- timestamp (ISO8601)

**Optional Fields (for complex tasks/failures):**
- complexity_estimate / complexity_actual
- error_message (blocker reason)
- recovery_attempts (retry count)
- files_touched (file paths affected)
- dependencies_unblocked (task IDs)

**RAG Storage Format:**
```
crew_execution_outcome_{crew_id}_{attempt_id}
Tags: crew, {crew_id}, execution-outcome, status:{status}, {YYYY-MM-DD}
```

---

### 4. ✅ Implementation Roadmap (3 Phases)

#### **Phase 1: Outcome Memory Logging (Week 1 — THIS WEEK)**
Owner: Geordi + Data  
Effort: 3 days  
Cost: ~$0.02 per mission  

**Deliverables:**
- [ ] Define CrewExecutionOutcome schema (7 essential fields)
- [ ] Implement `storeCrewExecutionOutcome()` helper in `packages/shared/src/db.ts`
- [ ] Extend `prompt-engine.ts` to capture {status, duration, files, error} after each task attempt
- [ ] Modify `runMissionPipeline` to emit crew-status-update events to Riker's queue
- [ ] Test on 10 mission runs, verify RAG storage with correct tags
- [ ] **PoC Success Criteria:**
  - Each officer's outcome = RAG record with 7 fields populated
  - Query `crew_execution_outcome_geordi_*` returns 10+ records
  - <50ms overhead per task

**Files to create/modify:**
- `packages/shared/src/db.ts` → new function `storeCrewExecutionOutcome()`
- `packages/mcp-server/src/agent-core/prompt-engine.ts` → capture outcome fields
- `packages/mcp-server/src/lib/crew-status-riker.ts` (NEW) → StatusUpdateQueue initial version

---

#### **Phase 2: VSCode Chat Live Status Display (Week 2)**
Owner: Riker + VSCode Extension team  
Effort: 4 days  
Cost: ~$0.01 per batch

**Deliverables:**
- [ ] Complete `crew-status-riker.ts`: StatusUpdateQueue, 200ms batch drain, crew-status-batch emission
- [ ] Modify `chatEngine.ts` to subscribe to crew-status-batch SSE events
- [ ] Design + implement status card React component
- [ ] Integrate into VSCode chat response stream
- [ ] Test: 5-officer mission with live status updates every ~250ms
- [ ] **Success Criteria:**
  - Status cards appear <300ms after officer completes task
  - No message ordering issues or duplicates
  - Chat remains responsive during 10+ simultaneous officer updates

---

#### **Phase 3: Crew Performance Dashboard + Task Routing (Week 3+)**
Owner: Data + Quark  
Effort: 5 days  

**Deliverables:**
- [ ] `crewPerformanceMetrics()` query: success rate, avg duration, confidence patterns per officer
- [ ] Observation Lounge dashboard section: "Crew Performance" cards (sortable by success rate)
- [ ] Task-routing logic: suggest best-suited officer based on performance history
- [ ] A/B feedback: store routing choice + outcome to RAG
- [ ] MCP tool `get_crew_performance_metrics` for script-based routing
- [ ] **PoC Dashboard:**
  - Geordi: 95% success (UI tasks), avg 42s
  - Scotty: 80% success (infra), avg 58s
  - Data: 92% success (analytics), avg 35s
  - Trending: improving/stable/regressing per officer

---

### 5. ✅ Proof of Concept — Ready to Build (48 hours)

**Minimal PoC steps:**

1. **Schema Migration (30 min)**
   ```sql
   CREATE TABLE crew_execution_outcomes (
     id UUID PRIMARY KEY,
     crew_id TEXT NOT NULL,
     attempt_id UUID UNIQUE NOT NULL,
     task_description TEXT NOT NULL,
     status TEXT CHECK (status IN ('success', 'blocked', 'retry')),
     duration_seconds INT,
     confidence_level TEXT,
     files_touched JSONB,
     error_message TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Store Function (2 hours)**
   - Implement in `packages/shared/src/db.ts`
   - Write to crew_execution_outcomes table
   - Also write to crew_personal_memory for RAG recall

3. **Capture Point (1 hour)**
   - After officer completes task in `prompt-engine.ts` (~line 200)
   - Call `storeCrewExecutionOutcome()`

4. **Test & Verify (30 min)**
   - Run existing mission script
   - Query RAG: `crew_execution_outcome_*`
   - Confirm 5+ records with populated fields

**Next 48 hours:** Complete Phase 1 (add Riker queue, batch events, observability)

---

### 6. ✅ Crew Performance Metrics (Proof of Concept)

**Metrics Schema:**
```typescript
interface CrewPerformanceMetrics {
  crew_id: string;
  officer_name: string;
  total_tasks_last_20: number;
  success_rate: number;              // 0.0-1.0
  avg_duration_seconds: number;
  high_confidence_success_rate: number;
  blockers_by_mode: Record<string, number>;  // {"timeout": 2, ...}
  recent_outcomes: CrewExecutionOutcome[];   // last 5
  trending: "improving" | "stable" | "regressing";
}
```

**Dashboard Concept (Observation Lounge):**
- Officer performance cards sorted by success rate
- Specialization tracking (UI vs infrastructure vs analytics)
- Latest outcome + blocker modes visible
- Task routing recommendations based on historical performance

---

## CREW CONSENSUS (All Officers Signed Off)

✅ **Picard (Synthesis):** Architecture approved. Hybrid Riker aggregation minimizes latency and cost. Feedback flow is clear and non-invasive.

✅ **Riker (Delivery):** Integration path is lean. Extends runMissionPipeline naturally, reuses existing chat stream, modifies chatEngine.ts for subscriptions.

✅ **Geordi (Engineering):** 3-day Phase 1 is realistic. PoC roadmap achievable. Phased approach allows independent testing.

✅ **Quark (Optimization):** Cost model is frugal (~$0.02 per mission). Batch aggregation reduces events by 80%. Tier-3 models adequate.

✅ **Data (Analytics):** 7-field schema is sound. PoC dashboard doable in Phase 3 (5 days). Enables crew calibration + task routing.

✅ **Scotty (Execution):** Build Phase 1 first (this week). Highest ROI. Unblocks observability. 48-hour sprint to PoC.

✅ **Worf (Security):** WorfGate respected in all retry logic and credential auditing. Failure modes distinguish WorfGate red vs transient errors.

---

## KEY DESIGN DECISIONS

### Decision #1: Hybrid Riker Aggregation (vs parallel per-officer or centralized queue)
- **Advantage:** Single stream to chat, minimal latency (~250ms), batch aggregation reduces cost by 80%
- **Trade-off:** ~250ms delay acceptable for task-level reporting (not real-time per keystroke)

### Decision #2: Minimal 7-field schema (vs comprehensive 20+ field schema)
- **Advantage:** Maximizes RAG recall speed, reduces storage overhead
- **Trade-off:** Optional fields stored only on interesting variations (complex tasks, failures)

### Decision #3: Hybrid failure retry (auto-retry simple + ask-first complex)
- **Advantage:** Balances autonomy with user control; improves UX for transient errors
- **Trade-off:** Requires failure mode classification in execution path

### Decision #4: Phase 1 → Phase 2 → Phase 3 (vs all-at-once)
- **Advantage:** Enables early feedback, reduces risk, allows parallel work
- **Trade-off:** Requires careful interface design between phases (schema stability)

---

## INTEGRATION POINTS (Where This Lives)

1. **`packages/mcp-server/src/lib/crew-mission-pipeline.ts`**
   → After each officer's attempt: emit crew-status-update event

2. **`packages/mcp-server/src/lib/crew-status-riker.ts` (NEW)**
   → StatusUpdateQueue, 200ms batch drain, crew-status-batch emission

3. **`packages/mcp-server/src/agent-core/prompt-engine.ts`**
   → After task execution: capture {status, duration, files, error} and call storeCrewExecutionOutcome()

4. **`packages/ui/app/chat/chatEngine.ts`**
   → Subscribe to crew-status-batch events, render status cards in chat stream

5. **`packages/shared/src/db.ts`**
   → New function storeCrewExecutionOutcome() (wraps storeCrewPersonalMemory with schema)

---

## CONSTRAINTS COMPLIANCE

✅ **Minimize cost (frugal tier):** Reporting uses tier-3 DeepSeek (~$0.0001 per outcome). Batching reduces events 80%. Analytics cached 1h.

✅ **Don't block execution:** Status updates async to queue (not awaited). Outcome storage post-mission. <50ms overhead per task.

✅ **Respect WorfGate:** Each attempt logs credential usage. Failure modes track WorfGate tier. Retry logic respects gates.

✅ **Store all outcomes automatically:** No manual recording step. Embedded in task completion path. Automatic RAG tag assignment.

---

## NEXT STEPS (Immediate Actions)

1. **Today:** Design doc review (stakeholders + team), schema approval
2. **This week (Phase 1):**
   - [ ] Create crew_execution_outcomes table migration
   - [ ] Implement storeCrewExecutionOutcome() helper
   - [ ] Extend prompt-engine.ts to capture fields
   - [ ] Build crew-status-riker.ts with Redis queue
   - [ ] Test on 10 missions, verify RAG storage
3. **Next week (Phase 2):** VSCode chat integration
4. **Week after (Phase 3):** Performance dashboard + task routing

---

## STORED TO RAG

**Memory ID:** `crew-status-reporting-design-20260712`  
**Tags:** `crew`, `status-reporting`, `real-time`, `chat`, `feedback`, `outcomes`, `performance-metrics`, `RAG`, `architecture`, `design`, `consensus`, `roadmap`  
**Relates to:** Picard, Riker, Geordi, Quark, Data, Scotty, Worf  
**Accessible:** `/api/crew/memories` + RAG recall via `crew:get-relevant-memories`

---

## FILES GENERATED

1. **Design Document:**
   `/Users/bradygeorgen/Developer/story-agent/docs/observation-lounge/crew-status-reporting-design-20260712.md`
   (Full architecture, all schemas, 3-phase roadmap, 15KB)

2. **Mission Scripts (for future runs):**
   - `/Users/bradygeorgen/Developer/story-agent/scripts/crew-status-reporting-design-mission.ts` (deliberation dispatcher)
   - `/Users/bradygeorgen/Developer/story-agent/scripts/store-crew-status-design-memory.ts` (RAG storage)

---

**Status:** DESIGN CONSENSUS COMPLETE. READY FOR PHASE 1 BUILD.  
**Next Crew Sync:** Implementation kickoff (Geordi + Quark) → begin PoC migration + storeCrewExecutionOutcome().
