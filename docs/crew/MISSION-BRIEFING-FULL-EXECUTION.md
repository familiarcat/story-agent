# CREW MISSION BRIEFING — Full Execution Directive

**Mission**: Deliberate on 5 prepared investigations and execute navigation hierarchy refactor  
**Scope**: Architecture decisions + immediate implementation  
**Timeline**: 1 lounge session (deliberation) + 1 execution session  
**Cost Budget**: Frugal tier (minimize tokens)

---

## PART A: DELIBERATIONS (Full Crew Lounge)

The crew must deliberate on and decide for these 5 investigations:

### 1. **Redis Pub/Sub Fargate Multi-Task Approval Gates** (CRITICAL)
**File**: `docs/crew/redis-pubsub-timing-investigation.md`

**Decision Needed**: Which solution to implement?
- **Option A**: Increase wait (150ms → 500ms)
- **Option B**: Subscription confirmation protocol  
- **Option C**: Hybrid (confirmation + timeout fallback)
- **Option D**: Rearchitect (Redis SET polling)

**Questions for Crew**:
- What's the actual subscription latency on Fargate?
- Which option minimizes latency while maximizing reliability?
- Should we add observability/instrumentation?

**Owners**: Worf (Infrastructure) + Riker (Reliability)

---

### 2. **React View Provider System for LCARS Theming** (MEDIUM)
**File**: `docs/ui/ui-view-provider-investigation.md` (referenced from prior context)

**Decision Needed**: Which provider pattern?
- Context API + custom hook?
- Compound component pattern?
- Localized vs. global scope?

**Questions for Crew**:
- How to handle component composition reusably?
- CSS strategy (inline vs. CSS-in-JS)?
- Theme switchability at runtime?

**Owners**: Picard (Synthesis) + Riker + Geordi (Engineering)

---

### 3. **Unified VSCode Chat Response Architecture** (MEDIUM)
**File**: `docs/design/unified-chat-response-architecture.md`

**Decision Needed**: Which implementation approach?
- **Option A**: Strict protocol (all agents must comply)
- **Option B**: Adapter layer (wrapper for legacy)
- **Option C**: Hybrid (new strict, legacy wrapped)

**Questions for Crew**:
- WebSocket vs. SSE for streaming?
- First reference implementation (which agent)?
- Migration timeline for all agents?

**Owners**: Picard + Riker + Quark (Cost Optimization)

---

### 4. **Integration Test Setup (ESM/CommonJS)** (LOW)
**File**: Mentioned in `TEST_FAILURE_REPORT.md`

**Issue**: `db.integration.test.ts` has vitest import error

**Decision Needed**: 
- Quick fix or proper long-term solution?
- Should shared package be ESM-first?

**Owners**: Geordi (Engineering)

---

### 5. **Navigation Hierarchy Refactor** (EXECUTION - NOT DELIBERATION)
**File**: `docs/crew/navigation-hierarchy-refactor.md`

**Observations to Execute**:
1. Remove crew names from top-level headers (OBSERVATIONS • QUARK → OBSERVATIONS)
2. Reorder navigation: PLAN → BUILD → OBSERVE (was BUILD → PLAN → OBSERVE)
3. Maintain crew attribution in lower hierarchy sections

**No decision needed** — just execute these two clear directives.

---

## PART B: EXECUTION (After Deliberation)

### Navigation Refactor (IMMEDIATE EXECUTION)

**Files to Modify**:
```
packages/ui/src/
├─ components/domains.ts            (reorder DOMAIN_GROUPS)
├─ components/NavBar.tsx            (menu order)
├─ app/page.tsx                     (domain card order)
├─ app/cost/page.tsx               (remove "• QUARK")
├─ app/learnings/page.tsx          (remove "• CREW")
├─ app/crew/observations/page.tsx  (clean header)
└─ app/observation-lounge/page.tsx (clean header)
```

**Implementation**:
1. Reorder `DOMAIN_GROUPS` array in `domains.ts` (PLAN first)
2. Remove crew names from 7 page headers
3. Update breadcrumbs + consistency throughout
4. Test all pages render correctly
5. Commit + push

**Effort**: ~1 hour (Geordi + Riker review)

---

## PART C: STORAGE & COMMUNICATION

### After Deliberation
Store decisions to RAG:
- Which Redis solution (A/B/C/D) and why
- View provider pattern selected and rationale
- Chat protocol approach and timeline
- Integration test fix decision

### After Execution
Store to RAG:
- Navigation refactor completion status
- Screenshots of new order
- Any issues encountered + resolutions

---

## SUCCESS CRITERIA

### Deliberations ✅
- [ ] All 4 investigations discussed thoroughly
- [ ] Clear decisions documented with rationale
- [ ] Trade-offs acknowledged
- [ ] Implementation strategy decided
- [ ] Stored to RAG for future reference

### Execution ✅
- [ ] Navigation reordered PLAN → BUILD → OBSERVE
- [ ] Crew names removed from page headers
- [ ] Crew names preserved in body sections
- [ ] All pages render correctly
- [ ] No broken links/navigation
- [ ] Committed and pushed to main

---

## CREW ROLES & ASSIGNMENTS

| Officer | Role | Investigations |
|---------|------|-----------------|
| **Picard** | Synthesis | Chat protocol (3), View provider (2) → overall coherence |
| **Riker** | Reliability + IA | Redis (1), View provider (2), Nav refactor execution |
| **Geordi** | Engineering | View provider (2), Nav refactor execution (5), Tests (4) |
| **Quark** | Optimization | Chat protocol (3), Cost implications of all options |
| **Worf** | Infrastructure | Redis pub/sub (1), Fargate implications |
| **Data** | Analysis | Metrics/observability needed for each decision |
| **Scotty** | Execution Lead | Nav refactor lead + progress tracking |

---

## MISSION PARAMETERS

**Mode**: FRUGAL (minimize tokens, be concise)  
**Output Format**: Decisions + rationale (one paragraph each)  
**Storage**: Automatically to RAG  
**Timeline**: 1 session (lounge) + 1 session (execution)  
**Quality Gate**: All decisions stored + rationale clear

---

## WHAT COMES AFTER

Once crew completes:
1. **Implementation**: Crew codes solutions based on decisions
2. **Testing**: Run test suite, verify no regressions
3. **Deployment**: Merge to main, push, deploy via pipeline
4. **Observability**: Monitor metrics identified in deliberation
5. **Learning**: Store outcomes to RAG for future decisions

---

**Status**: READY FOR CREW ENGAGEMENT  
**Created**: 2026-07-12  
**Priority**: ALL observations executed  
**Dogfood**: Crew decides + executes (not Anthropic)
