# Section 31 Week 1 — Operational Readiness Sprint
**2026-07-10 16:00 PT → 2026-07-11 EOD (48-hour execution window)**

---

## Sprint Goal
Deliver all operational glue by EOD Thursday 2026-07-11 to unlock launch on Friday 2026-07-12:
- Rollback scripts + live monitoring dashboard (O'Brien)
- Token validation meter + error taxonomy + fallback testing (Yar)
- Tester comms + dashboard UI + synthetic test spec (Troi)
- Cost baseline + cost filters + anomaly alerts (Quark)

---

## Workstream: O'Brien (DevOps Lead)
**Deliverable:** Rollback script + Dogfood monitoring dashboard

### Task 1.1: Write scripts/rollback_dogfood.sh
**Acceptance Criteria:**
- Toggles `storyAgent.hijack.enabled` to false in VSCode settings
- Triggers extension reload (via VSCode IPC or settings.json watcher)
- Completes in <5 minutes end-to-end
- Idempotent (can run multiple times safely)
- Tested: Crew routing ON → rollback → Copilot default → crew routing ON

**Subtasks:**
- [ ] Write rollback shell script (30 min)
- [ ] Test on local VSCode extension (30 min)
- [ ] Measure execution time (15 min)
- [ ] Document rollback SLA + trigger criteria (15 min)

**Owner:** O'Brien | **Target:** EOD 2026-07-10 | **Est. Effort:** 1.5h

### Task 1.2: Build /dogfood-dashboard (Web UI)
**Acceptance Criteria:**
- Real-time metrics: opt-out %, error %, latency p99, cost/user
- Updates every 30 seconds
- Data source: Troi's telemetry collectors + cost tracking API
- Manual rollback button (calls rollback_dogfood.sh via MCP or API)
- Tester roster visible (on/off status per person)

**Subtasks:**
- [ ] Design dashboard layout + wireframe (30 min, coordinate with Troi)
- [ ] Build React component for metrics panel (1 hour)
- [ ] Wire telemetry API (GET /api/telemetry/dogfood) (30 min)
- [ ] Wire cost API (GET /api/cost?cohort=dogfood) (30 min)
- [ ] Add rollback button + confirmation (30 min)
- [ ] Test data refresh cycle (15 min)

**Dependencies:** Troi must define telemetry schema + cost API contract first | **Owner:** O'Brien | **Target:** EOD 2026-07-11 | **Est. Effort:** 3.5h

---

## Workstream: Yar (QA/Testing Lead)
**Deliverable:** Token validation meter + error taxonomy + fallback pre-flight test

### Task 2.1: Implement Token Validation Meter
**Acceptance Criteria:**
- Every OpenRouter request is checksummed (request_id + tokens_used + model)
- Checksum compared against billing API (Quark's cost tracking)
- Fidelity % calculated: (matching / total) × 100
- Alert fires if fidelity drops below 99.5%
- Logs mismatch details (request_id, expected tokens, actual tokens, delta %)

**Subtasks:**
- [ ] Add checksum generation to agent-core (line TBD in crew-mission-pipeline.ts) (30 min)
- [ ] Wire checksum verification against /api/cost billing endpoint (1 hour)
- [ ] Calculate fidelity % and expose via GET /api/validation/fidelity (30 min)
- [ ] Alert rule: fidelity <99.5% → Slack #section-31-dogfood (30 min)
- [ ] Test: 100 requests, verify checksums match (15 min)

**Owner:** Yar | **Target:** EOD 2026-07-11 | **Est. Effort:** 2.5h

### Task 2.2: Define Error Taxonomy & Classify in Telemetry
**Acceptance Criteria:**
- Error taxonomy: Crew Infra Down | Token Validation Fail | User-Facing Regression | Transient Network
- Classification logic in telemetry pipeline (detect via response code + latency + error message)
- Each error tagged with category + severity (critical / warning / info)
- Dashboard/logs show error breakdown by category

**Subtasks:**
- [ ] Write error classification function (classify_error(response, latency, message) → category) (45 min)
- [ ] Integrate into nativeChatProvider.ts error handler (30 min)
- [ ] Log categorized errors to telemetry sink (30 min)
- [ ] Test: simulate crew down, verify Crew Infra Down tagged correctly (30 min)
- [ ] Test: simulate token mismatch, verify Token Validation Fail tagged (15 min)

**Owner:** Yar | **Target:** EOD 2026-07-11 | **Est. Effort:** 2.5h

### Task 2.3: Pre-Flight: Auto-Fallback Test
**Acceptance Criteria:**
- Simulate :3103 down for 5 minutes
- After 3 failed requests in 5 min window, extension auto-fallbacks to Copilot
- User sees 1 error message, then chat works on Copilot
- No data loss (request history preserved)
- Fallback reverses when :3103 comes back up (after 3 successful requests)

**Subtasks:**
- [ ] Implement fallback state machine in nativeChatProvider.ts (1 hour)
- [ ] Test: kill :3103 mock, trigger 3 failures, verify fallback (30 min)
- [ ] Test: restore :3103, trigger 3 successes, verify recovery (15 min)
- [ ] Document fallback SLA + trigger thresholds (15 min)

**Owner:** Yar | **Target:** EOD 2026-07-11 | **Est. Effort:** 2h

**Blocker Risk:** O'Brien's rollback script needs coordination with this fallback logic (both control crew routing).

---

## Workstream: Troi (Product/UX Lead)
**Deliverable:** Tester comms + Dashboard UI + Synthetic test spec

### Task 3.1: Send Tester Onboarding Comms (HIGH PRIORITY — TODAY)
**Acceptance Criteria:**
- Email to all 10 testers with:
  - VSCode extension version + setup instructions
  - Expectations: crew routing, daily drills, rollback SLAs
  - How to report issues (#section-31-dogfood Slack)
  - Standup schedule (9am PT daily)
  - Sentiment feedback buttons in chat
- Subject: "Section 31 Week 1 Dogfood — You're Invited"

**Subtasks:**
- [ ] Draft + review message with Picard (30 min)
- [ ] Collect tester email list from O'Brien (10 min)
- [ ] Send (5 min)

**Owner:** Troi | **Target:** EOD 2026-07-10 (TODAY) | **Est. Effort:** 45 min

### Task 3.2: Build /dogfood-dashboard UI (Metrics Panel)
**Acceptance Criteria:**
- Real-time sentiment breakdown (thumbs up / neutral / thumbs down %)
- Opt-out %, error %, latency p99 gauges (red/yellow/green zones)
- Cost per feature (ask / agent / inline_chat / review)
- Tester roster with online status + sentiment reaction count

**Subtasks:**
- [ ] Design layout + color scheme (coordinate with O'Brien) (30 min)
- [ ] Build React gauge components (1 hour)
- [ ] Wire sentiment API (GET /api/sentiment/dogfood) (30 min)
- [ ] Add tester roster table (30 min)
- [ ] Polish + responsive design (30 min)

**Dependencies:** O'Brien must define telemetry + cost API schemas | **Owner:** Troi | **Target:** EOD 2026-07-11 | **Est. Effort:** 3.5h

### Task 3.3: Design Synthetic Test Suite Spec
**Acceptance Criteria:**
- Spec for 24/7 monitoring tests covering:
  - Ask chat (basic Q&A)
  - Agent mode (multi-turn agentic)
  - Inline chat (quick fix suggestions)
  - Review panel (code review)
- Test frequency: every 5 minutes
- Pass criteria: response latency <2s, no errors, sentiment OK
- Failure action: log alert + escalate to Picard if 2 consecutive failures

**Subtasks:**
- [ ] Define test scenarios per feature (30 min)
- [ ] Design test harness (mock testers, track latency + errors) (45 min)
- [ ] Write failure detection + alerting logic (30 min)
- [ ] Document test spec + runbook (30 min)

**Note:** Spec can be handed to crew for implementation post-launch. Doesn't block go-live if not fully automated by EOD Thursday.

**Owner:** Troi | **Target:** EOD 2026-07-11 | **Est. Effort:** 2h | **Priority:** Medium (spec required, implementation can slip)

---

## Workstream: Quark (Finance Lead)
**Deliverable:** Cost baseline + cost filters + anomaly alerts

### Task 4.1: Establish Copilot Baseline Assumption
**Acceptance Criteria:**
- Document Copilot cost estimate: $/user/day
- Source: Copilot pricing sheet or historical VSCode usage data
- Assumption: e.g., "Copilot = $20/user/month ≈ $0.67/user/day at 10 chats/day × $0.02/chat"
- Recorded in: docs/section-31/cost-baseline.md

**Subtasks:**
- [ ] Research Copilot pricing (30 min)
- [ ] Estimate chat frequency + cost per request (30 min)
- [ ] Document assumption + cite sources (15 min)
- [ ] Get Picard + O'Brien sign-off on reasonableness (15 min)

**Owner:** Quark | **Target:** EOD 2026-07-10 | **Est. Effort:** 1.5h

### Task 4.2: Build Cost Dashboard Filter for Dogfood Cohort
**Acceptance Criteria:**
- New API endpoint: GET /api/cost?cohort=dogfood
- Returns: daily cost aggregate + per-feature breakdown + per-user detail
- Data source: cost tracking API filtered by tester roster IDs
- Dashboard access: O'Brien's /dogfood-dashboard + Quark's cost page

**Subtasks:**
- [ ] Add cohort filter to cost API (30 min)
- [ ] Test: 10-user rollup + per-feature breakdown (30 min)
- [ ] Wire to dashboard (15 min)
- [ ] Document cost schema for O'Brien (15 min)

**Owner:** Quark | **Target:** EOD 2026-07-11 | **Est. Effort:** 1.5h

### Task 4.3: Implement Cost Anomaly Alerting (>2σ deviation)
**Acceptance Criteria:**
- Daily cost roll-up per tester (baseline = rolling 7-day mean)
- Alert fires if any tester's daily cost > baseline + 2σ (>20% deviation)
- Alert includes: tester name, expected cost, actual cost, delta %, suspected cause (new feature used? long session?)
- Sent to #section-31-dogfood Slack

**Subtasks:**
- [ ] Calculate rolling mean + std dev per tester (30 min)
- [ ] Implement anomaly detection (cost > mean + 2σ) (30 min)
- [ ] Wire alert to Slack (15 min)
- [ ] Test: spike a user's cost, verify alert fires (15 min)

**Owner:** Quark | **Target:** EOD 2026-07-11 | **Est. Effort:** 1.5h

---

## Dependency Graph

```
Task 1.2 (O'Brien Dashboard)
  ├── requires Task 3.2 telemetry schema (Troi)
  └── requires Task 4.2 cost API (Quark)

Task 2.1 (Yar Token Validation)
  └── requires Quark cost API ready

Task 2.3 (Yar Fallback Test)
  └── requires Task 1.1 rollback script ready

Task 3.2 (Troi Dashboard)
  └── requires Tasks 1.2, 2.1, 4.2 (all data sources)
```

**Critical Path:** 
1. Quark delivers cost API (Task 4.2) by mid-day 2026-07-11
2. Yar delivers token validation (Task 2.1) by mid-day 2026-07-11
3. O'Brien builds dashboard (Task 1.2) using both APIs by EOD 2026-07-11

---

## Daily Standup Format (Starting 2026-07-11 09:00 PT)

**Participants:** O'Brien (lead), Yar, Troi, Quark, Picard

**Agenda (15 min):**
1. **Task status:** Which tasks completed overnight? (5 min)
2. **Blockers:** Any dependencies blocking progress? (5 min)
3. **Readiness pulse:** On track for Operational Readiness gate? (3 min)
4. **Go/no-go:** If we're off track, escalate now. (2 min)

**Escalation:** If any task misses by >4 hours, Picard calls a 30-min Observation Lounge sync to replan.

---

## Success Criteria (Gate Sign-Off by EOD 2026-07-11)

| Owner | Deliverable | Sign-Off Condition |
|-------|-------------|-------------------|
| **O'Brien** | Rollback script + dashboard live | Scripts tested <5min SLA + dashboard shows real-time metrics + manual rollback works |
| **Yar** | Token validation + error taxonomy | Meter reports 99.99%+ fidelity + errors classified + fallback pre-flight passes |
| **Troi** | Comms sent + dashboard UI + test spec | Testers onboarded + dashboard live + synthetic test spec reviewed by Picard |
| **Quark** | Cost baseline + filters + alerts | Baseline documented + cost API scoped to dogfood cohort + anomaly alerts tested |

**Picard's Gate Decision:** If all four sign off by EOD Thursday, LAUNCH Friday 2026-07-12. If any fail, SLIP to Monday 2026-07-15.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| O'Brien + Yar dependencies (rollback ↔ fallback) | Daily standup coordination + shared state machine spec by EOD 2026-07-10 |
| Telemetry schema delays | Quark + Troi define schema by mid-day 2026-07-11 (async to other builds) |
| Cost API scope creep | Quark scopes to read-only filter, no new instrumentation required |
| Synthetic tests too complex | Spec only (implementation deferred to crew post-launch) |

---

## Execution Readiness

**Go/No-Go to start sprint:** PROCEED (all crew committed, no known blockers, critical path clear)

**Handoff to crew:** Assign tasks to respective officers, daily standup at 09:00 PT 2026-07-11.

---

*Document: Section 31 Week 1 Operational Readiness Sprint Plan*  
*Approved by: Picard (on behalf of O'Brien, Yar, Troi, Quark)*  
*Date: 2026-07-10 16:30 PT*
