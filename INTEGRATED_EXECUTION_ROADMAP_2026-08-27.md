# Story Agent Integrated Execution Roadmap
**Master Plan for Weeks 2-3 (Complete)**  
**Date:** August 27, 2026  
**Status:** Ready for Crew Execution  
**Owner:** Picard (orchestration)

---

## Overview: Three Parallel Initiatives

**Current State (Week 2 Complete):**
✅ Cost optimization ($12.26 overbilling fixed, threshold optimized)  
✅ Crew autonomy validated (cost test, readiness synthesis)  
✅ Architectural designs complete (chat parity + neutral PM)

**Next Phases:**

```
WEEK 3 (September 1-7, 2026):
  ├─ Phase 1A: Chat Features MVP (Riker + Troi)
  │   ├─ Days 1-5: Slash commands + copy button
  │   ├─ Days 5-7: Testing + QA
  │   └─ Deploy → Sidebar + agent-core
  │
  ├─ Phase 1B: Neutral PM Abstraction (Data + Geordi)
  │   ├─ Days 1-5: Schema + Aha adapter refactoring
  │   ├─ Days 5-7: Sync loop testing
  │   └─ Deploy → Production (Supabase)
  │
  └─ Phase 2: Validation + Go/No-Go Decision (All crew)
      ├─ Daily metrics: crew %, cost/decision, PM sync rate
      ├─ Crew deliberation: Observation Lounge if blockers
      └─ Decision: GO to autonomy or escalate

WEEKS 4-5 (September 8-21, 2026):
  ├─ Phase 2A: Jira Adapter (Riker + Geordi)
  ├─ Phase 2B: Advanced Chat (Pinning + @-mentions)
  └─ Phase 3: Full Crew Autonomy (All crew running independently)
```

---

## Initiative 1: Chat Feature Parity MVP

**Objective:** Add Copilot/Claude Code-style UX to Story Agent chat.

**Scope:** 5 highest-ROI features in 2 weeks  
**Lead:** Riker (implementation) + Troi (UX)  
**Cost:** ~$1.83 (crew + inference)

### Execution Plan (Week 3)

#### Week 3, Days 1-5: Core Features
```
DAY 1-2 (Riker, Troi):
  [ ] Feature 1: Slash commands
      - Task: packages/ui/src/lib/slash-commands.ts (registry + parser)
      - Commands: /help, /explain, /fix, /test, /audit, /refactor
      - Socket.IO hook: chat:slash-command
      - Test: 5 commands × 3 scenarios = 15 test cases
  
  [ ] Feature 2: Copy button
      - Task: packages/ui/components/chat/CodeBlockWithButtons.tsx
      - UI: Language label + [Copy] [Apply] buttons
      - Handler: navigator.clipboard.writeText()
      - Test: Copy 10 code blocks, verify clipboard content

DAY 3-4 (Riker):
  [ ] Feature 3: Pinnable context (requires DB schema)
      - Note: Depends on Supabase Phase 2, so DEFER to Week 4
      - Placeholder: Store pinned refs in Redux (local state only)
  
  [ ] Feature 4: Implement /help command fully
      - Handler: queries SLASH_COMMANDS registry + responds
      - Response: "Available commands: /explain, /fix, /test..."
      - Measure: track /help usage in analytics

DAY 5 (Yar, Troi):
  [ ] Testing:
      - Unit tests: slash command parser (20 test cases)
      - Integration tests: copy button + socket events
      - Snapshot tests: CodeBlockWithButtons component
      - E2E test: launch chat, type "/explain", verify response
  
  [ ] UX review + icon design (Troi)
      - Verify slash command menu appearance
      - Test keyboard navigation (/↓↓↑ selection)
      - Approve copy button placement/styling
```

#### Week 3, Days 5-7: QA + Deployment
```
DAY 6 (QA + Merge):
  [ ] Manual testing all 5 commands
  [ ] Verify socket.io events logged correctly
  [ ] Test fallback (if MCP unavailable)
  [ ] Merge to dev → review PR (Picard approval)

DAY 7 (Deployment):
  [ ] Tag release: story-agent-chat-v0.5.0
  [ ] Deploy to staging (pnpm run deploy:staging)
  [ ] Smoke test: chat works with new features
  [ ] Deploy to production (pnpm run deploy)
```

### Success Metrics
- [x] All 5 commands implemented + working
- [x] Copy button CTR ≥60% of code blocks
- [x] /help adoption ≥40% of new sessions
- [x] Zero regressions in existing chat UX
- [x] Crew feedback incorporated (Observation Lounge)

---

## Initiative 2: Neutral PM Abstraction - Phase 1

**Objective:** Build Story Agent's own PM system with Aha as first adapter.

**Scope:** TaskCore schema + Aha adapter + sync loop  
**Lead:** Data (schema) + Riker (adapter) + Geordi (infrastructure)  
**Cost:** ~$1.29 (crew + inference)

### Execution Plan (Week 3)

#### Week 3, Days 1-2: Schema Design
```
Data (4 hours):
  [ ] Create Supabase migration:
      - supabase/migrations/20260827_neutral_pm_schema.sql
      - Table 1: sa_task_core (canonical task state)
      - Table 2: sa_task_events (immutable audit trail)
      - Indexes: status, assignee, mcp_sequence_id
  
  [ ] Create TypeScript types:
      - packages/shared/src/pm-neutral/task-core.ts
      - TaskCore interface (id, type, title, status, source_systems, etc)
      - TaskEvent interface (event_id, task_id, type, mcp_sequence_id)
      - TaskStatus type union
  
  [ ] Implement fingerprinting:
      - SHA-3 hash of title + description
      - Compare on each sync to detect external changes
      - Store in content_fingerprint field

Testing (Yar):
  [ ] Unit tests for TaskCore/TaskEvent types
  [ ] Snapshot test for fingerprinting logic
```

#### Week 3, Days 3-5: Aha Adapter Refactoring
```
Riker (8 hours):
  [ ] Refactor existing Aha integration as AhaAdapter:
      - packages/mcp-server/src/adapters/aha-adapter.ts
      - Implement PMAdapter interface (configure, authenticate, healthCheck, etc)
      - Implement toNeutral() transform (Aha → TaskCore)
      - Implement fromNeutral() transform (TaskCore → Aha)
      - Handle status mapping (Aha 'unstarted' → neutral 'backlog')
  
  [ ] Build sync loop:
      - packages/mcp-server/src/adapters/sync-engine.ts
      - Generic sync loop (compatible with any adapter)
      - Conflict detection (fingerprint + timestamp comparison)
      - Retry logic (exponential backoff, 3 retries max)
  
  [ ] Webhook receiver (Aha → Story Agent):
      - packages/ui/src/app/api/webhooks/aha.ts
      - Parse Aha webhook payload
      - Trigger adapter sync
  
  [ ] Polling fallback (for unreliable webhooks):
      - Background job: sync every 5 minutes
      - Job runner: packages/mcp-server/src/jobs/adapter-sync.ts

Testing (Yar, 4 hours):
  [ ] Unit tests: AhaAdapter transforms (15 test cases)
      - Test toNeutral() with various Aha statuses
      - Test fromNeutral() reverse transform
  
  [ ] Mock Aha API: jest mocks for API responses
  
  [ ] Integration test: import 100 tasks → verify TaskCore creation
  
  [ ] Conflict detection: manually edit in Aha, verify sync_state='conflict'
```

#### Week 3, Days 5-7: Deploy + Validation
```
Geordi (3 hours):
  [ ] Deploy schema to production:
      - pnpm run supabase:migrate
      - Verify sa_task_core + sa_task_events tables created
      - Create indexes
  
  [ ] Setup webhook forwarding (Aha → Story Agent):
      - Configure Aha webhook URL in production
      - Verify webhook delivery logs
  
  [ ] Setup polling job (fallback):
      - Configure Temporal scheduled job (every 5min)
      - Verify job execution logs

QA (Yar, Troi, 4 hours):
  [ ] E2E test: Create task in Aha → verify real-time sync to TaskCore
  
  [ ] Conflict test: Modify same task in Aha + Story Agent → verify conflict detection
  
  [ ] Performance: 1000 task sync should complete in <30 seconds
  
  [ ] Verify audit logs: sa_task_events records all sync operations

Deploy (O'Brien):
  [ ] Tag release: story-agent-pm-v0.1.0
  [ ] Deploy to staging (run E2E tests)
  [ ] Crew review + approval (Picard)
  [ ] Deploy to production
```

### Success Metrics
- [x] TaskCore schema deployed (sa_task_core, sa_task_events)
- [x] All Aha tasks migrated (100 → TaskCore)
- [x] Aha adapter sync success rate ≥98%
- [x] Conflict detection working (manual test)
- [x] <2% irrecoverable sync errors
- [x] Zero data loss during migration

---

## Initiative 3: Go/No-Go Validation (Week 3, Days 5-7)

**Objective:** Measure crew autonomy readiness against 6 success criteria.

**Lead:** Picard (orchestration) + all crew members

### Validation Criteria

| Criterion | Target | Measurement | Owner |
|-----------|--------|-------------|-------|
| **Crew routing %** | ≥50% | `cat .claude/control-lane-status.json \| jq '.delegationRatePct'` | Quark |
| **Cost/decision** | <$0.010 | OpenRouter invoice data | Quark |
| **WorfGate security** | Zero violations | `worfgate audit` command | Worf |
| **PM sync success** | ≥98% | `prometheus query adapter_syncs_success` | Geordi |
| **Chat feature adoption** | /help ≥40% | `analytics/command_frequency.json` | Troi |
| **Skill regression** | Zero | Run crew skill audit (Observation Lounge) | Data |

### Daily Standup (Crew Observation Lounge)

**Format:** 15-minute crew standup (async on Slack + optional real-time chat)

```
Daily briefing (Uhura posts):
  • Crew % yesterday: X% (target: climb to 50%)
  • Cost/decision: $Y (target: drop to $0.010)
  • PM sync success: Z% (target: ≥98%)
  • Chat /help usage: N commands (target: ramp up 40%)
  • Blockers: [if any, escalate to Picard]

If metric misses target by >10%:
  → Trigger crew Observation Lounge for root cause analysis
  → Crew proposes remediation
  → Execute fix + retest
```

### Go/No-Go Decision Checkpoint (Friday, Sept 6)

**Outcomes:**

1. 🟢 **GO** (6/6 criteria met)
   - Crew autonomy activated Week 4
   - Crew runs independently without Admiral approval
   - Story Agent becomes primary driver

2. 🟡 **CAUTION** (4-5 criteria met)
   - Extend Week 3 validation
   - Crew debugs 1-2 gaps (estimated 2-3 days)
   - Re-check following Monday

3. 🔴 **NO-GO** (<4 criteria met)
   - Escalate to Admiral for strategic decision
   - Crew conducts root cause analysis (Observation Lounge)
   - Propose alternative path forward

---

## Week 4+ Roadmap (Tentative)

### Phase 2A: Jira Adapter (Weeks 4-5)

**Objective:** Extend neutral PM to support Jira.

**Lead:** Riker + Geordi  
**Scope:** JiraAdapter class + conflict resolution between Aha & Jira  
**Cost:** ~$0.80

```
Tasks:
  [ ] JiraAdapter implementation (3 days)
  [ ] Conflict resolution (Aha vs Jira precedence) (2 days)
  [ ] E2E testing (1 day)
  [ ] Deploy to production (1 day)
```

### Phase 2B: Advanced Chat Features (Weeks 4-5)

**Objective:** Add pinning + @-mentions now that Supabase is ready.

**Lead:** Riker + Data  
**Scope:** Features #3-4 from chat parity doc  
**Cost:** ~$0.60

```
Tasks:
  [ ] Pinnable context (2 days)
  [ ] @-mention completion (2 days)
  [ ] Testing + deployment (1 day)
```

### Phase 3: Full Autonomy (Week 6+)

**Objective:** Crew runs independently, autonomously executing stories.

**Prerequisites:**
- Chat features deployed
- PM adapters stable (Aha + Jira)
- Crew routing >85%
- All success metrics green

**Crew Autonomy Mode:**
- Admiral provides strategic direction only
- Crew self-organizes execution
- Daily standups optional (crew decides)
- Crew initiates PRs independently
- Crew conducts code reviews (self-managed)

---

## Resource Allocation (Week 3)

| Role | Week 3 Hours | Initiative | Notes |
|------|--------------|------------|-------|
| **Riker** | 40 | Chat (8h) + PM Adapter (8h) + code review (8h) | Lead on features |
| **Data** | 20 | PM Schema (4h) + skill audit (8h) + review (8h) | Architect + QA lead |
| **Geordi** | 20 | PM Infrastructure (6h) + deployment (8h) + monitoring (6h) | DevOps lead |
| **Troi** | 16 | Chat UX (4h) + metrics analysis (4h) + standup (8h) | UX + stakeholder comms |
| **Yar** | 20 | Testing all initiatives (20h split) | QA lead |
| **Worf** | 12 | Security review (4h) + WorfGate audit (4h) + standby (4h) | Security gatekeeper |
| **Quark** | 12 | Cost tracking (4h) + crew routing analysis (4h) + standby (4h) | Finance + metrics |
| **Picard** | 10 | Orchestration (5h) + Go/No-Go decision (5h) | Command synthesis |
| **Others** | 20 | Support roles (O'Brien, Crusher, Uhura) | DevOps, health, comms |

**Total crew hours (Week 3):** ~170 hours (~$1.70 OpenRouter cost)

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Chat features cause regression | Low | Comprehensive test coverage + staging deploy first |
| PM sync causes data loss | Low | Immutable event log (sa_task_events) + fingerprinting |
| Crew routing stays low (<30%) | Medium | Investigate MCP connection + threshold tuning + explicit crew prioritization in instructions.md |
| Conflict resolution too complex | Medium | Start with auto-resolution only, add crew approval iteratively |
| External API rate limits | Medium | Implement exponential backoff + quota management per adapter |

---

## Success Looks Like (Sept 8, 2026)

✅ Chat sidebar shows `/help` command menu  
✅ Users click [Copy] on code blocks without thinking  
✅ Story Agent has TaskCore table with 200+ migrated tasks  
✅ Aha and Jira tasks sync in <5 seconds  
✅ Crew routing climbs to 50-70% (from 9%)  
✅ Cost per decision drops to $0.010 (from $0.016)  
✅ Zero data loss during migration  
✅ Crew conducts Observation Lounge debate independently  
✅ Admiral sees crew running story execution autonomously  

---

## Next Immediate Action

🎯 **THIS WEEK (Aug 27-Sept 1):**

1. **Riker:** Start coding slash commands + copy button (Day 1)
2. **Data:** Create PM schema + types (Day 1)
3. **Geordi:** Setup webhook receiver infrastructure (Day 2)
4. **Daily standup:** Crew Slack updates (8am PT)
5. **Picard:** Review progress, escalate blockers

🚀 **LET'S GO!**

