# UI Sync Missions: Phase 1-2 Autonomous Crew Execution

**Status:** ACTIVE ✓  
**Timeline:** 7 days (Phase 1: 3 days, Phase 2: 4 days)  
**Execution Model:** Autonomous (OpenRouter crews, RAG-coordinated)  

---

## Quick Start for Crew

### For Phase 1 Teams (Data, Riker, Quark)

**Read your mission brief:**
- **Data (Architecture):** [`ui-sync-phase1-autonomous-execution.md`](ui-sync-phase1-autonomous-execution.md) → Section "Team 1: Commander Data"
- **Riker (Full-Stack):** [`ui-sync-phase1-autonomous-execution.md`](ui-sync-phase1-autonomous-execution.md) → Section "Team 2: Commander Riker"
- **Quark (Finance):** [`ui-sync-phase1-autonomous-execution.md`](ui-sync-phase1-autonomous-execution.md) → Section "Team 3: Quark"

**Execute immediately:**
1. Read your section (15 min)
2. Begin coding
3. Post daily standup to RAG: `ui-sync-phase1-standup-{your-team}`
4. If blocked, escalate to RAG: `ui-sync-phase1-blocker-{your-team}`
5. When complete, store signal to RAG: `ui-sync-phase1-{your-team}-complete`

**Gate check:** Day 3, all teams confirm completion criteria met

---

### For Phase 2 Teams (Geordi, Worf, O'Brien)

**Status:** PENDING (activate after Phase 1 GREEN)

**Read your mission brief:**
- **Geordi (Infrastructure):** [`ui-sync-phase2-websocket-infrastructure.md`](ui-sync-phase2-websocket-infrastructure.md) → Section "Team 4: Geordi La Forge"
- **Worf (Security):** [`ui-sync-phase2-websocket-infrastructure.md`](ui-sync-phase2-websocket-infrastructure.md) → Section "Team 5: Lt. Worf"
- **O'Brien (DevOps):** [`ui-sync-phase2-websocket-infrastructure.md`](ui-sync-phase2-websocket-infrastructure.md) → Section "Team 6: Chief O'Brien"

**Begin when Phase 1 GREEN:**
1. Phase 1 completes (T+3)
2. You receive activation signal: `ui-sync-phase2-kickoff`
3. Read your section (15 min)
4. Begin coding
5. Follow same RAG coordination (daily standups, blocker escalation)
6. Gate check: Day 4

---

## Master Documents

### Orchestration (Overall Strategy)
[**`ui-sync-orchestration.md`**](ui-sync-orchestration.md)
- 7-day timeline (Phase 1 + Phase 2)
- Team autonomy model + decision authority
- RAG coordination protocol
- Success metrics + business value
- Risk mitigation + next steps

### Phase 1 Detailed Brief
[**`ui-sync-phase1-autonomous-execution.md`**](ui-sync-phase1-autonomous-execution.md)
- Complete Phase 1 mission specification
- All 3 team requirements (Data, Riker, Quark)
- Success criteria + deliverables
- RAG coordination + completion signals
- Execution protocol (daily standups, blockers, gates)

### Phase 2 Detailed Brief
[**`ui-sync-phase2-websocket-infrastructure.md`**](ui-sync-phase2-websocket-infrastructure.md)
- Complete Phase 2 mission specification
- All 3 team requirements (Geordi, Worf, O'Brien)
- Success criteria + deliverables
- RAG coordination + completion signals
- Execution protocol (daily standups, blockers, gates)

---

## Execution Timeline at a Glance

```
Day 0-2: Phase 1 Development
  │ Data:   Build Zustand store + middleware (no dependencies)
  │ Quark:  Build cost model (no dependencies)
  │ Riker:  Waiting for Data... [polls every 10 min]
  │
  └─→ Daily standups to RAG: ui-sync-phase1-standup-{team}

Day 2-3: Phase 1 Integration & Testing
  │ Data:   Finalize + tests + JSDoc
  │ Riker:  ChatPanel integration (Data delivered store)
  │ Quark:  Finalize report
  │
  └─→ Prepare for gate check

Day 3: PHASE 1 GATE CHECK ✓
  │ All teams confirm: "Ready for Phase 2"
  │ Store completion signals: ui-sync-phase1-{team}-complete
  │ Result: GREEN → Phase 2 teams activate!

Day 3-4: Phase 2 Development
  │ Geordi: Build real WebSocket (no dependencies)
  │ Worf:   Build JWT auth + audit (no dependencies)
  │ O'Brien: Waiting for Geordi + Worf... [polls every 10 min]
  │
  └─→ Daily standups to RAG: ui-sync-phase2-standup-{team}

Day 4-5: Phase 2 Integration & Testing
  │ Geordi: Finalize + stress tests + metrics
  │ Worf:   Finalize + security tests
  │ O'Brien: Integration + Docker + rollback tests
  │
  └─→ Prepare for gate check

Day 4: PHASE 2 GATE CHECK ✓
  │ All teams confirm: "Ready for staging"
  │ Store completion signals: ui-sync-phase2-{team}-complete
  │ Result: GREEN → Ready for production deployment!

Day 5+: Production Readiness
  │ Merge to dev → staging → canary → main
  │ 10-50 test users → 6,000 canary users → full rollout
```

---

## RAG Coordination Protocol

### Daily Standups (Async)

**Tag:** `ui-sync-phase{1|2}-standup-{team-name}`

**Content:** (5 min write, ~100 words)
```
Team: {Data | Riker | Quark | Geordi | Worf | O'Brien}
Status: {In Progress | Complete}

Completed Today:
- {Bullet 1}
- {Bullet 2}
- {Bullet 3}

Blockers: {None | Description}

Next 24h: {Plan for tomorrow}

Risks: {Identified risks + mitigation}
```

**Example:**
```
Team: Data
Status: In Progress

Completed Today:
- Zustand store core (4 slices) compiling
- Middleware stack (3 of 4 working)
- Mock WebSocket sync function drafted

Blockers: None

Next 24h:
- Finish withDevTools middleware
- Write unit tests (target >3)
- Add JSDoc to all exports

Risks: DevTools integration may require extra typing work
Mitigation: Fall back to simple middleware if complex
```

### Blocker Escalation (Critical Path)

**Tag:** `ui-sync-phase{1|2}-blocker-{team-name}`

**Content:** (Escalate when blocking progress)
```
Team: {Name}
Issue: {What is blocked}
Root: {Why blocked}
Proposed Solution: {Your proposal}
Impact: {Impact on deadline}
Request: {What you need from others}
```

**Example:**
```
Team: Riker
Issue: ChatPanel.tsx has circular import with useStoryStore
Root: ChatPanel → ChatEngine → useStoryStore, but useStoryStore imports types from components
Proposed Solution: Move useStoryStore hook to packages/ui/src/hooks/use-story-store.ts
Impact: Low (1-2 hour fix), no deadline impact
Request: Data team review new hook location + update exports
```

### Completion Signals (Gate Verification)

**Phase 1 Completion:**
```
Tag: ui-sync-phase1-{team-name}-complete
Content: Full completion report (see mission brief "RAG Completion Signal" section)
```

**Phase 2 Completion:**
```
Tag: ui-sync-phase2-{team-name}-complete
Content: Full completion report (see mission brief "RAG Completion Signal" section)
```

---

## Success Criteria Checklists

### Phase 1 Gate (All must be TRUE)

**Team 1 (Data):**
- [ ] `tsc --noEmit` produces 0 errors
- [ ] All 4 slices independently selectable
- [ ] Middleware composes without errors
- [ ] Mock sync batches at 300ms
- [ ] Conflict detection works
- [ ] >3 tests pass
- [ ] JSDoc on 100% of exports
- [ ] <100ms local latency verified
- [ ] Ready for git

**Team 2 (Riker):**
- [ ] `tsc --noEmit` produces 0 errors
- [ ] ChatPanel uses Zustand store
- [ ] Immediate sync on user actions works
- [ ] Batch sync (300ms) works
- [ ] Conflicts logged + stored
- [ ] Error recovery (graceful fallback) works
- [ ] >5 tests pass
- [ ] JSDoc on 100% of exports
- [ ] Ready for git

**Team 3 (Quark):**
- [ ] Token model documented
- [ ] Per-user costs calculated ($0 Phase 1, $0.0002/hr Phase 2)
- [ ] Batching savings quantified (70%)
- [ ] Throttle algorithm documented
- [ ] Section 31 budget verified COMPLIANT
- [ ] Report stored to RAG
- [ ] Ready for git

### Phase 2 Gate (All must be TRUE)

**Team 4 (Geordi):**
- [ ] WebSocket running on port 3106
- [ ] Connection pooling (max 1,000)
- [ ] Message replay on reconnect
- [ ] <100ms connection setup
- [ ] <500ms P99 latency
- [ ] >1,000 msg/sec throughput
- [ ] Health endpoint responding
- [ ] >10 integration + stress tests pass
- [ ] JSDoc 100%
- [ ] Ready for git

**Team 5 (Worf):**
- [ ] JWT signing + verification working
- [ ] Rate limiting (10 req/sec per user)
- [ ] Injection detection active
- [ ] Audit logging to file + RAG
- [ ] All audit entries signed
- [ ] <10ms auth overhead
- [ ] >10 security tests pass
- [ ] JSDoc 100%
- [ ] Ready for git

**Team 6 (O'Brien):**
- [ ] Real WebSocket integrated
- [ ] VSCode extension uses real sync
- [ ] Docker compose up works
- [ ] Local dev setup script works
- [ ] Extension configuration added
- [ ] Fallback to mock on WebSocket failure
- [ ] Rollback tests pass
- [ ] E2E test (chat → sync → response) passes
- [ ] <100ms round-trip latency
- [ ] JSDoc 100%
- [ ] Ready for git

---

## Deliverables by Team

### Phase 1

**Data:**
- `packages/ui/src/stores/use-story-store.ts`
- `packages/ui/src/stores/use-story-store.test.ts`

**Riker:**
- `packages/vscode-extension/src/chat/chat-engine.ts` (updated)
- `packages/vscode-extension/src/chat/chat-engine.test.ts`

**Quark:**
- `docs/phase1-cost-analysis.md`

### Phase 2

**Geordi:**
- `packages/mcp-server/src/lib/chat-websocket-sync.ts`

**Worf:**
- `packages/shared/src/worfgate-chat-validator.ts` (extended)

**O'Brien:**
- `docker-compose.dev.yml`
- `scripts/dev-setup-phase2.sh`
- `packages/vscode-extension/package.json` (updated with sync config)

---

## Key Points for Crew

1. **You have 100% autonomy** in your domain. Make all decisions.
2. **Coordinate only via RAG** (daily standups, blocker escalation).
3. **No meetings.** All async.
4. **No human in loop** until gate checks (Day 3 for Phase 1, Day 4 for Phase 2).
5. **Store all learnings to RAG** (decisions, discoveries, risks).
6. **All code compiles** (tsc --noEmit) before committing.
7. **All tests pass** before committing.
8. **JSDoc on every export** before committing.

---

## Questions?

**For Phase 1 questions:** Check [`ui-sync-phase1-autonomous-execution.md`](ui-sync-phase1-autonomous-execution.md)

**For Phase 2 questions:** Check [`ui-sync-phase2-websocket-infrastructure.md`](ui-sync-phase2-websocket-infrastructure.md)

**For overall strategy:** Check [`ui-sync-orchestration.md`](ui-sync-orchestration.md)

---

## Timeline Summary

| Phase | Duration | Teams | Deadline | Gate |
|-------|----------|-------|----------|------|
| Phase 1 | 3 days | Data, Riker, Quark | Day 3 | All teams confirm completion |
| Phase 2 | 4 days | Geordi, Worf, O'Brien | Day 4 | All teams confirm completion |
| Total | 7 days | All 6 | Day 7 | Ready for staging |

---

## Cost Tracking

| Phase | Cost | Budget | Status |
|-------|------|--------|--------|
| Phase 1 | ~$1 | $1,000 | ✓ COMPLIANT |
| Phase 2 | ~$13 | $1,000 | ✓ COMPLIANT |
| **Total** | **~$14** | **$1,000** | **✓ COMPLIANT** |

Section 31 remaining: ~$985/week for other crew operations.

---

**BEGIN NOW**

Teams 1-3: Read your brief. Start immediately. Coordinate via RAG.  
Teams 4-6: Await Phase 1 GREEN. Read your brief. Activate immediately.

All crews: Deliver excellence. Document decisions. Learn continuously.

**Let the crew work autonomously. We monitor via RAG. Report completion at each gate.**
