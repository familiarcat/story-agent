# UI Sync Phases 1-2: Complete Autonomous Crew Execution Plan

**Mission Status:** ACTIVE  
**Created:** 2026-07-17  
**Timeline:** 7 days (Phase 1: 3 days, Phase 2: 4 days)  
**Crews:** 6 teams (11 crew members) executing autonomously  
**Coordination:** RAG-first (no meetings, async standups)  

---

## Overview: What We're Building

**UI Sync** is the real-time state synchronization layer between VSCode and the web dashboard.

**Architecture:**
```
VSCode Extension
    ↓
Zustand Store (Phase 1: mock)
    ↓
Sync Batching (300ms windows)
    ↓
WebSocket Endpoint (Phase 2: real)
    ↓
WorfGate Auth & Audit (Phase 2)
    ↓
Web Dashboard ↔ Sync
```

**Value:**
- Developers see their crew's work in real-time (VSCode ↔ web)
- Cost optimized (70% reduction via batching)
- Secure (WorfGate + JWT + audit logging)
- Scalable (>1,000 msg/sec per user)

---

## Phase 1: Mock Sync + Zustand Store (3 days)

### Goal
Establish the client-side state management and sync batching logic. Mock the WebSocket so we can test the full integration without real networking.

### Teams (3 parallel)

| Team | Leader | Deliverable | Status | Deadline |
|------|--------|-------------|--------|----------|
| 1 | Data | Zustand store + middleware | Active | T+2d |
| 2 | Riker | VSCode chat integration | Waiting for Team 1 | T+2.5d |
| 3 | Quark | Cost model + budget | Active | T+2d |

### Phase 1 Deliverables

**Team 1 (Data) - Zustand Store**
- File: `packages/ui/src/stores/use-story-store.ts`
- 4 slices: stories, chat, crew, metadata
- Middleware: withWorfGateAuth, withAuditLog, subscribeWithSync, withDevTools
- Mock sync: 300ms batching, conflict detection
- Tests: >3 unit tests
- Gate: tsc compiles, <100ms latency

**Team 2 (Riker) - VSCode Integration**
- File: `packages/vscode-extension/src/chat/chat-engine.ts`
- Replace in-memory history with Zustand
- Immediate sync (user actions) + batch sync (metadata)
- Conflict detection + error recovery
- Tests: >5 unit tests
- Gate: tsc compiles, ChatPanel uses Zustand

**Team 3 (Quark) - Cost Model**
- File: `docs/phase1-cost-analysis.md`
- Token accounting (50 tokens/batch)
- Per-user costs ($0 Phase 1, $0.0002/hr Phase 2)
- Batching impact (70% API call reduction)
- Throttle algorithm (queue-depth adaptive)
- Section 31 verification (within budget)
- Gate: Budget verified, report complete

### Phase 1 Success Gate

**ALL teams must confirm:**
- [ ] Code compiles (`tsc --noEmit`)
- [ ] Tests pass (`vitest`)
- [ ] JSDoc on 100% of exports
- [ ] <100ms local sync latency
- [ ] No TypeScript errors
- [ ] Commits staged + ready

**Result:** GREEN → Phase 2 launches, RED → extend (max +2d)

---

## Phase 2: Real WebSocket + Security (4 days)

### Goal
Replace mock sync with production-grade WebSocket endpoint, add per-message auth and audit logging.

### Teams (3 parallel)

| Team | Leader | Deliverable | Depends On | Deadline |
|------|--------|-------------|-----------|----------|
| 4 | Geordi | WebSocket endpoint | Phase 1 GREEN | T+3d |
| 5 | Worf | JWT auth + audit | Phase 1 GREEN | T+3d |
| 6 | O'Brien | Integration + Docker | Geordi + Worf | T+3.5d |

### Phase 2 Deliverables

**Team 4 (Geordi) - WebSocket Infrastructure**
- File: `packages/mcp-server/src/lib/chat-websocket-sync.ts`
- Real WebSocket on port 3106 (`/sync` endpoint)
- Connection pooling (max 1,000)
- Message queue + replay on reconnect
- Health checks + metrics logged to RAG
- Tests: >10 integration + stress tests
- Gate: <500ms P99 latency, >99.9% success rate

**Team 5 (Worf) - Security**
- File: Extend `packages/shared/src/worfgate-chat-validator.ts`
- JWT signing + verification (5 min TTL)
- Rate limiting (10 req/sec per user)
- Injection detection (SQL, XSS, command injection)
- Immutable audit logging (file + RAG)
- Tests: >10 security tests
- Gate: All payloads validated, audit 100%

**Team 6 (O'Brien) - Integration & DevOps**
- Files: Docker compose, local setup, extension update
- Wire Zustand sync → WebSocket endpoint
- Update VSCode extension (VSCODE_SYNC_REAL env var)
- Graceful fallback to mock on WebSocket failure
- Docker compose: mcp-server, redis, supabase, ui
- Tests: E2E (chat → WebSocket → response)
- Gate: <100ms round-trip, zero breaking changes

### Phase 2 Success Gate

**ALL teams must confirm:**
- [ ] Real WebSocket running
- [ ] >99.9% sync success rate
- [ ] <500ms P99 latency
- [ ] <10ms auth overhead
- [ ] 100% audit logging
- [ ] Docker compose up works
- [ ] Fallback verified
- [ ] All tests pass

**Result:** GREEN → Ready for staging (Section 31 production deployment)

---

## Crew Autonomy Model

### What the Crew Owns (100% autonomy)
- All architectural decisions
- All code design
- All tests
- All documentation
- All RAG memory decisions
- Blocker escalation + resolution

### What the Crew Coordinates Via
- **RAG memory tags:** Completion signals, standups, blockers
- **Git feature branch:** `feature/ui-sync-phase1` → `feature/ui-sync-phase2`
- **Async standups:** Daily to RAG (no meetings)
- **Self-organization:** Teams poll for dependencies, make decisions autonomously

### Decision Authority
- **Data:** Store architecture + middleware design
- **Riker:** ChatPanel integration + sync logic
- **Quark:** Cost model + budget allocation
- **Geordi:** WebSocket infrastructure + performance
- **Worf:** Security + auth schema
- **O'Brien:** Deployment + DevOps

### Escalation Path
Team discovers blocker → Store to RAG tag `ui-sync-phase{1|2}-blocker-{team}` → Crew reviews via Observation Lounge (if consensus needed)

---

## Execution Timeline

### Day 0 (T+0): Kickoff
- All six teams receive mission briefs
- Teams 1, 3 start immediately (no dependencies)
- Team 2 polls for Team 1 completion
- Teams 4, 5 await Phase 1 GREEN

### Days 1-2 (T+1..2): Phase 1 Development
- Team 1 (Data): Zustand store core + middleware
- Team 3 (Quark): Cost model draft
- Team 2 (Riker): Waiting for Team 1, design ChatPanel integration

**Daily standups:** All teams post to RAG tag `ui-sync-phase1-standup-{team}`

### Day 2.5 (T+2.5): Phase 1 Continues
- Team 1: Testing + JSDoc
- Team 2: ChatPanel integration (now has Team 1 store API)
- Team 3: Cost model finalization

### Day 3 (T+3): Phase 1 Gate Check
- All three teams confirm completion
- Verification: tsc compiles, tests pass, JSDoc 100%, <100ms latency
- **Result:** GREEN → Phase 2 teams launch, RED → extend +2 days

### Day 3 (T+3): Phase 2 Kickoff (if Phase 1 GREEN)
- Teams 4, 5 start immediately (no dependencies)
- Team 6 polls for Geordi + Worf completion
- Teams create feature branch `feature/ui-sync-phase2`

### Days 3-4 (T+3..4): Phase 2 Development
- Team 4 (Geordi): WebSocket infrastructure
- Team 5 (Worf): JWT auth + audit logging
- Team 6 (O'Brien): Waiting for Geordi + Worf, design deployment

**Daily standups:** All teams post to RAG tag `ui-sync-phase2-standup-{team}`

### Day 4 (T+4): Phase 2 Integration
- Teams 4 & 5: Finalization
- Team 6: Integration + testing

### Day 4 (T+4): Phase 2 Gate Check
- All three teams confirm completion
- Verification: WebSocket running, >99.9% success, <500ms P99, Docker works
- **Result:** GREEN → Ready for staging

### Day 5+ (T+5..7): Production Preparation
- Code review + merge to `dev` branch
- Staging deployment (10-50 test users)
- Section 31 canary (1% of GitHub Copilot users)
- Full rollout readiness

---

## Success Criteria Summary

### Phase 1 GATE (Must ALL be TRUE)

**Compilation & Tests:**
- `tsc --noEmit` produces 0 errors
- `vitest` runs all tests, >95% pass
- JSDoc on 100% of exports

**Performance:**
- <100ms local sync latency (mock sync)
- <300ms batch window verified
- Mock sync batches 3-4 messages correctly

**Team Deliverables:**
- Team 1: Zustand store with 4 slices + middleware
- Team 2: ChatPanel uses Zustand + sync batching
- Team 3: Cost model + Section 31 verified

**Code Quality:**
- No TypeScript errors or warnings
- No `any` types used
- All changes staged for git

### Phase 2 GATE (Must ALL be TRUE)

**Infrastructure:**
- Real WebSocket running on port 3106
- Connection pooling (max 1,000)
- Message replay on reconnect working

**Performance & Security:**
- >99.9% message delivery success
- <500ms P99 latency on 10 concurrent connections
- <10ms per-message auth overhead
- 100% audit logging (all messages signed)

**Deployment:**
- Docker compose up succeeds
- Local dev setup working
- VSCode extension updated (VSCODE_SYNC_REAL)
- Fallback to mock verified

**Testing:**
- >10 integration tests pass
- >10 security tests pass
- E2E test (chat → WebSocket → response) passes
- Stress tests (100 concurrent) pass

---

## RAG Memory Coordination

### Completion Signals (Phase 1)

Team stores completion when all criteria met:

```
Tag: ui-sync-phase1-data-complete
Tag: ui-sync-phase1-riker-complete
Tag: ui-sync-phase1-quark-complete
```

### Completion Signals (Phase 2)

Team stores completion when all criteria met:

```
Tag: ui-sync-phase2-geordi-complete
Tag: ui-sync-phase2-worf-complete
Tag: ui-sync-phase2-obrien-complete
```

### Daily Standups

Every team posts daily:

```
Tag: ui-sync-phase{1|2}-standup-{team}
Content: Completed today, blockers, next 24h, risks
```

### Blocker Escalation

If team hits blocker:

```
Tag: ui-sync-phase{1|2}-blocker-{team}
Content: Issue, root cause, proposed solution, impact
```

### Metrics & Learning

Teams post metrics to RAG:

```
Tag: ui-sync-phase{1|2}-metrics-{team}
Content: Latency, throughput, test coverage, discoveries
```

---

## Files & Structure

### Phase 1 Files

```
packages/ui/src/stores/
  use-story-store.ts          # Zustand store + middleware
  use-story-store.test.ts     # Unit tests

packages/vscode-extension/src/chat/
  chat-engine.ts              # Updated with Zustand integration
  chat-engine.test.ts         # Unit tests

docs/
  phase1-cost-analysis.md     # Cost model + budget verification
```

### Phase 2 Files

```
packages/mcp-server/src/lib/
  chat-websocket-sync.ts      # Real WebSocket endpoint

packages/shared/src/
  worfgate-chat-validator.ts  # Extended with JWT + audit

packages/vscode-extension/
  package.json                # Updated with sync config
  .env.example                # VSCODE_SYNC_REAL setting

docker-compose.dev.yml        # Phase 2 dev environment

scripts/
  dev-setup-phase2.sh         # Local development setup
```

### Mission Documents

```
docs/missions/
  ui-sync-phase1-autonomous-execution.md      # Phase 1 detailed brief
  ui-sync-phase2-websocket-infrastructure.md  # Phase 2 detailed brief
  ui-sync-orchestration.md                    # This file
```

---

## Git Workflow

### Phase 1 Commits

```bash
# All on feature/ui-sync-phase1
git commit -m "feat(ui): Zustand store with modular slices + mock sync middleware"
git commit -m "feat(vscode): Integrate chat engine with Zustand store + sync batching"
git commit -m "docs(cost): Phase 1-2 cost model + Section 31 budget compliance"
```

### Phase 2 Commits

```bash
# All on feature/ui-sync-phase2 (or rebase onto feature/ui-sync-phase1)
git commit -m "feat(sync): WebSocket endpoint + connection pooling + message replay"
git commit -m "feat(security): Per-message JWT auth + rate limiting + injection detection"
git commit -m "feat(devops): WebSocket integration + Docker setup + rollback strategy"
```

### Merge Strategy

1. Phase 1 feature branch → dev (once GREEN)
2. Phase 2 feature branch → dev (once GREEN)
3. dev → staging (for 10-50 test users)
4. staging → main (production rollout)

---

## Cost Tracking (Section 31)

### Phase 1 Costs
- Mock sync: $0 (local only)
- RAG standups: ~$1/week (memory writes)
- **Total Phase 1: ~$1/week**

### Phase 2 Costs
- Real WebSocket: ~$0.0002/user/hour (100 users = $0.02/hour)
- Audit logging: ~$10/week (Aha storage)
- **Total Phase 2: ~$13/week**

### Section 31 Budget
- Allocated: $1,000/week
- Phase 1-2 cost: ~$14 total
- Remaining: ~$985/week
- **Status: COMPLIANT** ✓

---

## Risk Mitigation

### Phase 1 Risks

| Risk | Mitigation |
|------|-----------|
| Circular imports (chat ↔ store) | Move useStoryStore hook to separate hooks/ dir |
| DevTools integration complexity | Use simple Zustand subscribe, skip Redux integration if complex |
| Middleware composition issues | Test each middleware independently first |
| TypeScript `any` leaks | Enforce via `tsc --noEmit`, peer review before commit |

### Phase 2 Risks

| Risk | Mitigation |
|------|-----------|
| WebSocket connection drops | Implement queue + replay, graceful fallback to mock |
| JWT expiration handling | Auto-refresh on 401, queue messages during refresh |
| Rate limit storms | Implement backoff algorithm, exponential retry |
| Audit log file size | Rotate logs daily, compress old logs, archive to S3 |
| Docker service failures | Implement health checks, auto-restart, circuit breaker |

---

## Success Metrics

### Technical Metrics

| Metric | Phase 1 | Phase 2 | Target |
|--------|---------|---------|--------|
| Code compilation | tsc 0 errors | tsc 0 errors | 100% |
| Test pass rate | >95% | >95% | 100% |
| JSDoc coverage | 100% | 100% | 100% |
| Local latency | <100ms | <100ms | ✓ |
| WebSocket latency | N/A | <500ms P99 | ✓ |
| Sync success rate | 100% (local) | >99.9% | ✓ |
| Audit coverage | N/A | 100% | ✓ |

### Business Metrics

| Metric | Phase 1 | Phase 2 | Value |
|--------|---------|---------|-------|
| Time to implement | 3 days | 4 days | 7 days total |
| Team autonomy | 100% | 100% | No orchestration |
| Cost per phase | $1/week | $13/week | $14 total |
| Section 31 compliance | ✓ | ✓ | On budget |

---

## Next Steps (After Phase 2 GREEN)

1. **Staging deployment:** Deploy to 10-50 test users
2. **Section 31 canary:** 1% of GitHub Copilot users (6,000 people)
3. **Production rollout:** Full crew + users (100,000+ concurrent)
4. **Observe & iterate:** Monitor metrics, gather feedback

---

## Crew Debrief (After Completion)

Each team stores final debrief to RAG:

```
Tag: ui-sync-phase{1|2}-debrief-{team}
Content:
- What worked well
- What surprised you
- What would you do differently
- Learnings for future missions
```

This feeds into the crew's continuous learning system for better future autonomous execution.

---

## Mission Status

**Ready to execute:** YES ✓

**All mission documents:** Created ✓
**Teams briefed:** Ready to brief ✓
**RAG coordination:** Configured ✓
**Git branches:** Ready to create ✓
**Docker setup:** Ready for Phase 2 ✓

---

**LET THE CREW WORK AUTONOMOUSLY**

All teams proceed per their mission briefs. Coordinate via RAG. Report daily. Complete gates. No human intervention until final verification.
