# 📋 SPRINT 1 CREW BRIEFING
## Milestone Push Phase 1 — Week 1-2 (2026-07-17 to 2026-07-30)

**Prepared for:** 🖖 Riker, Geordi, Data, Worf, O'Brien, Uhura, Quark, Picard  
**Status:** Live in Aha ✅  
**Start Date:** 2026-07-17  
**Target Completion:** 2026-08-27 (All 3 phases by end of Sprint 3)

---

## 🎯 WHAT YOU'RE BUILDING

**Milestone Push** is the orchestration engine that enables safe, autonomous releases of code + documentation + configuration to production on a scheduled cadence. Think "GitHub release automation with approval gates + rollback safety."

**Your mission this sprint:** Build the foundational infrastructure (Phases 1-4) that crew members will use every 2 weeks to push milestones.

---

## 📍 YOUR STORY IN AHA

### How to Find Your Feature

1. Go to **Aha** (Story Agent workspace)
2. Project: **PROD** (Story Agent)
3. Release: **PROD-R-8** — "Milestone Push Phase 1 — Sprint 1 (Week 1-2)"
4. Epic: **PROD-E-2** — "Milestone Push Phase 1 Implementation"
5. **Find your feature** (your name is in the title):

| Crew Member | Feature | Aha Ref | Status |
|---|---|---|---|
| **Data** | Artifact Bundling Schema | PROD-30 | ✅ Ready |
| **Worf** | Security Scan Module | PROD-24 | ✅ Ready |
| **Riker** | MCP State Machine | PROD-27 | ✅ Ready |
| **O'Brien** | GitHub Actions Automation | PROD-29 | ✅ Ready |
| **Uhura** | Dashboard UI Components | PROD-26 | ✅ Ready |
| **Quark** | Cost Ledger & Budget Gates | PROD-25 | ✅ Ready |
| **Picard** | Rollback Safety & Recovery | PROD-28 | ✅ Ready |

### What You'll See in Your Story

- **Title:** e.g., "FEATURE 1: Artifact Bundling Schema (Data)"
- **Status:** "Ready" (you start immediately)
- **Assignee:** You
- **Description:** What to build (based on design docs)
- **Acceptance Criteria:** Must-haves for completion
- **Labels:** `milestone-push`, `phase-1`, `crew-autonomous-[yourname]`
- **Links:** Design docs + clarifications phase docs

---

## 🚀 YOUR TASKS THIS WEEK

### Day 1 (2026-07-17)

1. **Open your Aha feature** (see table above)
2. **Read the description** (extracted from design docs)
3. **Review acceptance criteria**
4. **Create your feature branch:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b milestone-push/$(echo "PROD-XX" | tr '[:upper:]' '[:lower:]')-description
   ```
   (Replace PROD-XX with your feature's Aha ref)

5. **Update story status to "In Progress"** in Aha

### Days 2-10 (2026-07-18 to 2026-07-26)

**Implement your feature.** Each feature includes 4-5 requirements (REQ X.1, X.2, etc.):

#### **Data (PROD-30): Artifact Bundling Schema**

**Requirements:**
- REQ 1.1: Supabase schema design
  - Create `sa_artifact_bundles` table (stores versioned artifacts)
  - Create `sa_shipment_records` table (tracks completion→shipped→archived)
  - Add foreign keys + indexes
  - File: `supabase/migrations/<timestamp>_artifact_bundling.sql`

- REQ 1.2: TypeScript type definitions
  - Export `ShipmentRecord` interface from `@story-agent/shared`
  - Export `ArtifactBundle` interface
  - Update `supabase/types.ts`

- REQ 1.3: Migration testing
  - Create test file: `packages/shared/src/db/artifact-bundling.test.ts`
  - Test: schema creates successfully
  - Test: inserts + queries work
  - Test: constraints enforce integrity

- REQ 1.4: Documentation
  - Add to [docs/database/artifact-versioning.md](../../docs/database/artifact-versioning.md)
  - Explain 3-tier lifecycle + how ShipmentRecord tracks it
  - Document schema with ER diagram

**Deliverable:** Merged PR to `dev`, all tests passing, documentation complete

---

#### **Worf (PROD-24): Security Scan Module**

**Requirements:**
- REQ 2.1: Git history scanning
  - Use `git log -p` to scan recent commits for secrets patterns
  - Detect: AWS keys, API tokens, private keys, credentials
  - File: `packages/mcp-server/src/lib/security-scan.ts`
  - Export `scanGitHistoryForSecrets()`

- REQ 2.2: Dependency scanning integration
  - Integrate with OWASP Dependency-Check (npm install)
  - Scan `package-lock.json` + `pnpm-lock.yaml`
  - Flag critical/high vulnerabilities
  - Export `scanDependencies()`

- REQ 2.3: Cryptographic signing
  - Generate cryptographic signature of scan results
  - Use `crypto.sign()` with project's private key
  - Store signature in `sa_scan_results` table
  - Export `signScanResult()`

- REQ 2.4: Test coverage
  - Create `packages/mcp-server/src/lib/security-scan.test.ts`
  - Test: detects known secret patterns
  - Test: handles malformed git history gracefully
  - Test: signing is deterministic + verifiable
  - Test: dependency scan flags known vulnerabilities

**Deliverable:** Merged PR, all tests passing, scan module operational

---

#### **Riker (PROD-27): MCP State Machine**

**Requirements:**
- REQ 3.1: Phase 1 validation logic
  - Parallel checks: Aha automation audit, git history scan, dependency scan, branch validation
  - File: `packages/mcp-server/src/lib/milestone-push-phase1.ts`
  - Export `validatePhase1()`
  - Return: `{ phase: "1", status: "ok"|"blocked", checks: [...], reason?: string }`

- REQ 3.2: Phase 2 approval gates
  - WorfGate check: All crew validations passed
  - Admiral check: Human approval (via `/approve` command or UI button)
  - File: `packages/mcp-server/src/lib/milestone-push-phase2.ts`
  - Export `gatePhase2()` (WorfGate) + `gatePhase2Admiral()` (business decision)
  - Both gates must pass

- REQ 3.3: Phase 3 execution
  - Transactional updates to Aha + GitHub + Supabase
  - File: `packages/mcp-server/src/lib/milestone-push-phase3.ts`
  - Export `executePhase3()`
  - Rollback on any failure

- REQ 3.4: Phase 4 archival
  - Store entire execution result to RAG memory
  - Mark release as read-only in Aha
  - Archive stories to Supabase
  - File: `packages/mcp-server/src/lib/milestone-push-phase4.ts`
  - Export `archivePhase4()`

- REQ 3.5: CLI wrapper
  - Create `packages/mcp-server/scripts/milestone-push.ts`
  - Command: `pnpm milestone:push --release PROD-R-8`
  - Orchestrates Phase 1 → 2 → 3 → 4 in sequence
  - Uses state machine + gates

**Deliverable:** Merged PR, all phases operational, CLI tested end-to-end

---

#### **O'Brien (PROD-29): GitHub Actions Automation**

**Requirements:**
- REQ 4.1: Branch validation workflow
  - File: `.github/workflows/milestone-push-validate.yml`
  - Trigger: PR labeled `milestone-push`
  - Run: lint, build, test, security scan
  - Block merge if any check fails

- REQ 4.2: Merged verification logic
  - File: `.github/workflows/milestone-push-merged.yml`
  - Trigger: PR merged to `dev` with `milestone-push` label
  - Verify: branch is tip of `dev`, no new commits
  - If OK: trigger Phase 3 execution

- REQ 4.3: Safe branch deletion with circuit breaker
  - File: `.github/workflows/milestone-push-cleanup.yml`
  - Trigger: Phase 3 complete
  - Delete source branch + PR
  - Circuit breaker: Stop if branch still has unmerged commits

- REQ 4.4: Rollback hooks and recovery
  - File: `.github/workflows/milestone-push-rollback.yml`
  - Trigger: Manual (on failure)
  - Revert all changes in Phase 3
  - Restore previous release state

**Deliverable:** Merged PR, all workflows tested in `.github/workflows/` directory

---

#### **Uhura (PROD-26): Dashboard UI Components**

**Requirements:**
- REQ 5.1: Release milestone page component
  - File: `packages/ui/app/milestones/[releaseId]/page.tsx`
  - Show: release name, status, start/end dates, story count
  - Show: real-time Phase 1-4 progress bar
  - Show: linked Aha epic + all features

- REQ 5.2: Real-time validation progress UI
  - Component: `packages/ui/components/validation-progress.tsx`
  - Display: Aha scan, git scan, dependency scan, branch check (all running in parallel)
  - Each check shows: ⏳ Running / ✅ Pass / ❌ Fail
  - Real-time updates from server-sent events (SSE)

- REQ 5.3: Approval modal (Admiral decision)
  - Component: `packages/ui/components/admiral-approve-modal.tsx`
  - Show: Phase 1 results + all passing checks
  - Button: "Approve & Execute" (takes you to Phase 3)
  - Button: "Hold (More Info)" (stays in Phase 2)

- REQ 5.4: Shipment summary report
  - Component: `packages/ui/components/shipment-summary.tsx`
  - Show: Phase 4 results (all artifacts shipped + archived)
  - Show: cost breakdown (crew effort + Anthropic)
  - Show: RAG archive link

**Deliverable:** Merged PR, components render correctly, SSE integration working

---

#### **Quark (PROD-25): Cost Ledger & Budget Gates**

**Requirements:**
- REQ 6.1: Supabase cost tracking schema
  - Create `sa_cost_ledger` table (per-story cost tracking)
  - Create `sa_budget_gates` table (soft/hard limits per release)
  - File: `supabase/migrations/<timestamp>_cost_ledger.sql`

- REQ 6.2: Soft/hard budget gate implementation
  - Soft gate: warn if cost exceeds 80% of budget
  - Hard gate: block Phase 3 if cost exceeds 100% of budget
  - File: `packages/mcp-server/src/lib/budget-gates.ts`
  - Export `checkBudgetGates()`

- REQ 6.3: Cost-per-story breakdown
  - Track: crew hours + Anthropic token cost per story
  - File: `packages/mcp-server/src/lib/cost-breakdown.ts`
  - Export `calculateCostBreakdown()`
  - Format: { storyId, crewHours, anthropicCost, totalCost }

- REQ 6.4: ROI reporting
  - Generate report: crew automation savings vs manual effort
  - File: `packages/ui/app/reports/roi.tsx`
  - Chart: cost-per-milestone trend
  - Chart: crew hours vs Anthropic hours (savings analysis)

**Deliverable:** Merged PR, cost tracking working, ROI report live on dashboard

---

#### **Picard (PROD-28): Rollback Safety & Recovery**

**Requirements:**
- REQ 7.1: Edge case documentation
  - Document: partial failures (e.g., Phase 3 succeeds 80%, fails 20%)
  - Document: network failures during Phase 3
  - Document: Aha API rate limits
  - Document: recovery procedures for each edge case
  - File: `docs/milestone-push/edge-cases.md`

- REQ 7.2: 24-hour rollback window design
  - Design: Phase 4 only "final" after 24 hours
  - Design: Admiral can rollback within 24-hour window (rare)
  - Design: database triggers + circuit breakers
  - File: `docs/milestone-push/24hour-rollback-window.md`

- REQ 7.3: Admiral override procedures
  - Document: rare scenarios when Admiral reopens a completed release
  - Document: audit trail + logging requirements
  - Document: crew escalation path
  - File: `docs/milestone-push/admiral-override.md`

- REQ 7.4: Observation Lounge deliberation on safety
  - Run crew mission: `npx tsx scripts/milestone-push-safety-deliberation.ts`
  - Each crew member provides safety feedback on the design
  - Consensus: design is safe for production
  - Output: stored to RAG as `milestone-push-safety-review-[date]`

**Deliverable:** Merged PR + docs, safety deliberation complete + archived

---

### Days 10-14 (2026-07-27 to 2026-07-30)

**Review & polish:**
- Code review: Ask another crew member to review your PR
- Tests: Ensure 100% test coverage for your feature
- Docs: Update relevant docs in `docs/milestone-push/`
- Integration: Test your feature with adjacent features (e.g., Data's schema + Riker's state machine)

### End of Sprint 1 (2026-07-30)

**Definition of Done for Your Feature:**
- [ ] PR merged to `dev`
- [ ] All tests passing
- [ ] 100% test coverage
- [ ] Documentation updated
- [ ] Feature status updated to "Shipped" in Aha
- [ ] Code reviewed by peer
- [ ] Ready for Phase 2 integration

---

## 📖 REFERENCE DOCUMENTS

**Design Docs (Read These):**
- [story-lifecycle-3tier.md](../milestone-push/story-lifecycle-3tier.md) — Story completion model (Riker)
- [aha-release-lifecycle.md](../milestone-push/aha-release-lifecycle.md) — Release state machine (Geordi)
- [aha-workflow-rules.md](../milestone-push/aha-workflow-rules.md) — Aha automation audit (Data)
- [approval-gates.md](../milestone-push/approval-gates.md) — Approval gate design (Worf & Picard)

**Specifications:**
- [CLAUDE.md](../../CLAUDE.md) — Project conventions + control-lane model
- [AGENTS.md](../../AGENTS.md) — Crew coordination protocol

**Tech Stack:**
- **MCP Server:** `packages/mcp-server/` (TypeScript, ESM)
- **Next.js UI:** `packages/ui/` (React 18, App Router)
- **Shared Types:** `packages/shared/` (Zod schemas + TS DTOs)
- **Database:** Supabase Postgres (SQL migrations in `supabase/migrations/`)

---

## 🔄 WORKFLOW

### Daily

1. **Start your day:** Pull latest `dev` + run `pnpm dev` (full stack)
2. **Work on your feature:** Implement one REQ at a time
3. **Test locally:** Run `pnpm --filter @story-agent/<package> run test:unit`
4. **Commit early + often:** Atomic commits, clear messages
5. **Update Aha:** Mark REQ as complete in story comments (or move status to "In Progress")

### Weekly Standup

**Time:** 2026-07-17, 2026-07-24, 2026-07-31 @ 09:00 PST  
**Format:** Async-first (Slack post) + optional 15-min video  
**What to share:**
- What you shipped this week
- What's blocking you
- What you need help with
- Next week's plan

### Communication

- **Technical questions:** Ask in Aha story comments (async)
- **Blocked:** Notify Picard immediately (escalate in Slack)
- **Design clarifications:** Reference design doc + leave a comment
- **Integration issues:** Coordinate with adjacent crew member (both features affected)

---

## 🎯 SUCCESS CRITERIA

By 2026-07-30, your feature is "Done" when:

✅ **Code Complete**
- All REQs implemented
- PR merged to `dev`
- No merge conflicts
- Build passing

✅ **Tests Complete**
- Unit tests for all functions
- Integration tests with adjacent features
- 100% code coverage
- All tests passing

✅ **Documentation Complete**
- Implementation documented in code comments
- Any new APIs documented
- Relevant design docs updated
- README updated (if user-facing)

✅ **Aha Updated**
- Story status = "Shipped"
- All REQs marked complete
- Comments show PR link + merge date

✅ **Ready for Phase 2**
- Feature is stable
- No known bugs
- Ready for integration with other features

---

## ⚠️ COMMON PITFALLS (Avoid These)

❌ **Don't:** Write code without a test  
✅ **Do:** TDD — write test first, then code

❌ **Don't:** Commit to `dev` directly  
✅ **Do:** Push to feature branch, open PR, get review, merge via GitHub

❌ **Don't:** Skip documentation  
✅ **Do:** Document as you build (comments + design docs)

❌ **Don't:** Work solo if blocked  
✅ **Do:** Ask for help in Aha + Slack (blocking = escalate)

❌ **Don't:** Skip testing  
✅ **Do:** Run `pnpm run test:unit` before pushing

---

## 🚀 YOU'VE GOT THIS

The crew is ready. The design is sound. The stories are live. You have 2 weeks to build something great.

**Questions?** Ask in Aha story comments or Slack.  
**Blocked?** Escalate to Picard immediately.  
**Ready to start?** See you at standup 2026-07-17 @ 09:00 PST.

**Make it so.** 🖖

---

*Briefing Prepared: 2026-07-16*  
*Coordinator: Picard (orchestrator)*  
*Crew: Riker, Geordi, Data, Worf, O'Brien, Uhura, Quark*  
*Status: Ready for Phase 1 Execution*
