# Crew Deliberation Master Brief — All Pending Investigations

**Status**: Ready for full crew lounge deliberation  
**Date**: 2026-07-12  
**Prepared for**: Picard (synthesis), Riker (architecture), Geordi (engineering), Quark (optimization), Worf (infrastructure)

---

## Summary: What We Need the Crew to Solve

Four major investigations across infrastructure, architecture, and UX. All have detailed briefs prepared. Crew should deliberate on each, then implementation phase follows.

---

## INVESTIGATION #1: Redis Pub/Sub Fargate Multi-Task Gates
**Brief**: `docs/crew/redis-pubsub-timing-investigation.md`  
**Severity**: HIGH (breaks production Fargate deployments)  
**Test Failure**: `approval-registry.integration.test.ts:24` — subscriber never receives published message

### Questions Pending
1. **Timing root cause**: Is 150ms wait insufficient for subscription setup, or is there a deeper issue?
2. **Measurement**: What's actual subscription latency on Fargate vs. local?
3. **Solution selection**: Evaluate 4 options:
   - **A**: Increase wait time (150ms → 500ms)
   - **B**: Subscription confirmation protocol (wait for Redis SUBSCRIBE response)
   - **C**: Hybrid (confirmation + longer timeout as fallback)
   - **D**: Rearchitect (Redis SET polling instead of pub/sub)
4. **Backwards compatibility**: How to preserve in-process Map fallback for single-instance?
5. **Metrics**: Add observability (subscription latency, message delivery rate)?

### Crew Decisions Needed
- Which solution (A/B/C/D) balances reliability + complexity + latency?
- How much latency is acceptable for approval gates (<5s user wait)?
- Should we add instrumentation? If so, what metrics?

---

## INVESTIGATION #2: React View Provider System (LCARS Theming)
**Brief**: `docs/ui/ui-view-provider-investigation.md` (exists from prior context)  
**Severity**: MEDIUM (scattered presentation logic, hard to maintain)  
**Goal**: Centralize LCARS theming using React Context/Provider patterns

### Questions Pending
1. **Provider architecture**: Context API vs. custom hook vs. compound component?
2. **Scope**: Global theme provider vs. localized component-level?
3. **Color system**: Should `lcars` object be static or reactive to theme changes?
4. **CSS strategy**: Inline styles vs. CSS-in-JS vs. global CSS variables?
5. **Backwards compatibility**: How to migrate existing inline-styled components?
6. **Performance**: Will provider re-renders cause unnecessary component updates?

### Crew Decisions Needed
- Which provider pattern for LCARS design system?
- How to handle component composition (reusable panels, buttons, layouts)?
- Migration strategy for 50+ components using scattered styles?
- Should theme be switchable at runtime (light/dark mode support)?

---

## INVESTIGATION #3: Unified VSCode Chat Response Architecture
**Brief**: `docs/design/unified-chat-response-architecture.md`  
**Severity**: MEDIUM (improves UX, enables future composition)  
**Goal**: Standardized async response format for all VSCode chat agents

### Questions Pending
1. **Protocol enforcement**: Strict (all agents must comply) or gradual (adapter layer)?
2. **Streaming mechanics**: WebSocket vs. Server-Sent Events vs. polling?
3. **Section updates**: Append-only vs. re-render existing sections?
4. **UI rendering**: Markdown + custom components vs. fully custom React?
5. **Backwards compatibility**: How to handle third-party agents?
6. **Implementation order**: Which agent to use as reference implementation first?

### Crew Decisions Needed
- Which implementation option (Strict / Adapter / Hybrid)?
- WebSocket vs. SSE for streaming (latency, complexity, deployment)?
- First reference implementation (story-agent CLI chat)?
- Migration timeline (all agents by Q3? staggered?)?

---

## INVESTIGATION #4: Integration Test Setup (ESM/CommonJS)
**Brief**: Test failure in `packages/shared/src/db.integration.test.ts`  
**Severity**: LOW (blocks integration tests, doesn't affect unit tests)  
**Error**: "Vitest cannot be imported in a CommonJS module using require()"

### Questions Pending
1. **Root cause**: Is shared package built as CommonJS?
2. **Vitest config**: Does `vitest.config.ts` need ESM/CommonJS handling?
3. **Setup file**: Is `test/setup.ts` trying to import vitest incorrectly?
4. **Solution**: Dynamic import() vs. config change vs. both?

### Crew Decisions Needed
- Quick fix vs. proper long-term solution?
- Should shared package be ESM-first?
- Any other integration tests blocked by similar issues?

---

## Consolidated Questions for Crew Deliberation

### A. Reliability & Infrastructure (Worf + Riker)
**Redis Pub/Sub**:
- [ ] What's the actual race condition window?
- [ ] Is Fargate network latency the culprit?
- [ ] Can we measure subscription latency in production?
- [ ] Should approval gates have configurable timeouts per environment?

### B. Architecture & Design Patterns (Picard + Riker)
**View Provider & Chat Response**:
- [ ] Should theme provider be global or per-route?
- [ ] Chat protocol: strict from day 1, or pragmatic migration?
- [ ] How to maintain consistency across 11 crew members' responses?
- [ ] Is there a common pattern between these two (provider-like)?

### C. Implementation & Optimization (Geordi + Quark)
**Cost & Complexity**:
- [ ] Which solution minimizes token usage (Quark's concern)?
- [ ] Which design requires least refactoring (Geordi's concern)?
- [ ] Can we batch these three investigations into one sprint?
- [ ] Should we implement in order (infrastructure → architecture → UI)?

### D. Observability & Debugging (Scotty + Data)
**Instrumentation**:
- [ ] What metrics matter for Redis pub/sub? (latency, delivery rate, timeout rate?)
- [ ] Should chat responses include execution trace?
- [ ] How to expose debug info without cluttering UI?

---

## Proposed Execution Plan (For Crew to Deliberate)

### Phase 1: Investigation (This Lounge Session)
**Duration**: 1 lounge session, all questions discussed in parallel

1. **Worf + Riker**: Evaluate Redis pub/sub options, decide A/B/C/D + instrumentation
2. **Picard + Riker**: Decide on view provider pattern + chat protocol approach
3. **Geordi**: Assess implementation complexity for each decision
4. **Quark**: Cost impact of each option
5. **Scotty**: What observability is needed?

**Output**: Documented decisions + rationale stored to RAG

### Phase 2: Design (1-2 Additional Sessions)
- **Detailed specifications** for chosen approaches
- **Migration paths** for existing code
- **Reference implementations** sketched

### Phase 3: Implementation (Subsequent Sprints)
- Engineer-driven implementation of chosen solutions
- Test validation
- Rollout to users

---

## Success Criteria for This Lounge

✅ **All questions answered** with documented reasoning  
✅ **Clear decisions made** (not left for later)  
✅ **Trade-offs acknowledged** (why we chose X over Y)  
✅ **Implementation order prioritized** (what blocks what?)  
✅ **Risks identified** (what could go wrong?)  
✅ **Stored to RAG** (future sessions can see why decisions were made)  

---

## Context & Constraints

### Architectural Principles
- **Dogfooding**: All solutions should demonstrate crew's own patterns
- **Cost-first**: Favor cheap solutions; optimize only where necessary
- **Observable**: Every decision should be measurable/debuggable
- **Backwards compatible**: Don't break existing functionality

### Timelines
- **Fargate approval gates**: HIGH priority (affects production)
- **Chat response protocol**: MEDIUM priority (enables composition)
- **View provider**: MEDIUM priority (improves maintainability)
- **Integration tests**: LOW priority (nice to have)

### Deployment Context
- **Single-instance dev**: In-process fallback works fine
- **Multi-task Fargate**: Needs cross-task coordination (Redis)
- **VSCode extension**: Shipped to users (backwards compat critical)
- **RAG system**: Crew memory persists decisions for future reference

---

## Crew Roles in This Deliberation

| Role | Primary Question | Decision |
|------|------------------|----------|
| **Picard** | How to synthesize these across crew? | Overall architecture coherence |
| **Riker** | Which is most reliable? | Infrastructure + UX reliability |
| **Geordi** | How to engineer it? | Implementation complexity |
| **Quark** | What's the cost impact? | Token usage, performance |
| **Worf** | What are the risks? | Security, infrastructure resilience |
| **Data** | What metrics matter? | Observability + debugging |

---

## Next Steps (After This Brief Is Reviewed)

1. Crew enters Observation Lounge for full deliberation
2. Each officer deliberates on their role's questions
3. Synthesis layer (Picard) reconciles any conflicts
4. Documented decisions stored to RAG
5. Implementation phase begins per decided priority

**Time estimate**: 1 lounge session, ~$0.08 cost (frugal tier)

---

**Prepared by**: Claude Orchestrator  
**For**: Crew Deliberation — Full Lounge  
**Status**: READY FOR DEBATE
