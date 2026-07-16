# CREW DELIBERATION: Milestone Push & Aha Workflow Integration Review
**Date:** 2026-07-16 | **Facilitated By:** Story Agent Crew | **Status:** Comprehensive Review Complete

---

## Executive Summary

The crew has reviewed the proposed milestone push process against the existing Aha workflow and **validates that milestone push logically integrates with existing systems** with **no blocking conflicts**. However, the review surfaces **4 critical clarifications** needed before implementation, and **3 forward-looking design decisions** to prevent future workflow bottlenecks.

**Recommendation: PROCEED with implementation of BALANCED approach, with pre-implementation clarifications on story completion semantics, release state model, and approval tier ownership.**

---

## Current Aha Workflow (Baseline)

### Existing Story Lifecycle
```
CREATED → IN PROGRESS → [crew work] → IN CODE REVIEW → [PR merged] → SHIPPED → [archived]
```

### Current Tools & Responsibilities
- **Riker:** Story creation (`create_feature`), status advancement via `updateAhaStoryStatus`
- **Worf:** WorfGate confirm gate on all Aha writes (dry-run → confirm → audit)
- **O'Brien:** Repository sync (verify PR merged, reconcile GitHub reality)
- **Geordi:** Release/sprint management (assign features to releases)
- **Data:** Epic/feature hierarchy consistency
- **Uhura:** Status change reporting to stakeholders

### Current Status Updates
| Transition | Tool | Owner | Gate |
|-----------|------|-------|------|
| Create → In Progress | `aha:create-feature` | Riker | Worf (WorfGate) |
| In Progress → In Code Review | `update_aha_story_status` | Riker | Worf (WorfGate) |
| In Code Review → Shipped | `update_aha_story_status` | Riker | Worf (WorfGate) |

---

## CREW DELIBERATION: 9 CRITICAL QUESTIONS

### 1. AHA WORKFLOW ALIGNMENT

**Question:** Where does milestone push fit in the current story lifecycle? Are there conflicts with existing statuses/workflows?

#### Crew Analysis:

**Data:** "The story lifecycle is LINEAR: Created → In Progress → In Code Review → Shipped. Milestone push is a RELEASE-LEVEL orchestration, not a story-level operation. It's orthogonal to individual story statuses — a release can't be marked 'Completed' until ALL stories in it are 'Shipped'. This is an INVARIANT, not a conflict."

**Riker:** "The state machine is sound. Milestone push enters at a NEW point: after code review, when stories are already 'Shipped'. The existing `update_aha_story_status` tool handles story-level transitions; milestone push handles release-level finalization. No overlap."

**Worf:** "WorfGate covers both story and release updates identically: confirm gate + immutable audit. Milestone push inherits the same governance. The question is whether milestone push REQUIRES Admiral approval (YES, per design) in ADDITION to Worf's confirm gate. RECOMMENDATION: Milestone push approval is BINDING (Admiral override) — separate from story-level Worf gating."

**Coordination with `update_aha_story_status`:** Milestone push will INVOKE `update_aha_story_status` for each story to mark it "Shipped", but ONLY after validating all stories are already "Complete" or "Shipped". It's a BULK operation using existing tools + approval gates.

**New APIs?** No. Milestone push reuses existing Aha APIs: `updateStoryStatus`, `updateRelease`. No new API calls required. **Decision: Extend, don't create.**

---

### 2. STORY COMPLETION MODEL

**Question:** Currently, when does a story move from "In Progress" → "Complete"? Is "Complete" different from "Shipped"?

#### Crew Analysis:

**Riker:** "Right now, there's a semantic gap. When a PR is merged, we call `updateAhaStoryStatus(ref, 'Shipped')`. So today, 'Shipped' = PR merged. But milestone push introduces 'Complete' — which is a NEW status that presumably means 'ready to ship but not yet archived'."

**O'Brien:** "This is CRITICAL to clarify. Let me trace GitHub reality:
- PR open → story status = 'In Code Review' (or equivalent)
- PR merged → story status = 'Shipped' (today)
- Milestone push → story status = 'Shipped' (same? or updated with archive metadata?)

**Conflict:** If we mark a story 'Shipped' when PR merges, what does it mean for a story to be 'Complete' at milestone time? Are there stories that stay 'In Code Review' (unmerged PRs) that need to be rejected?"

**Data's Model:** "I propose a 3-tier completion model:
1. **Complete** = PR merged to base branch (code is in production-ready state; verified by O'Brien)
2. **Shipped** = Story records final state in Aha + linked to release milestone (crew learnings archived)
3. **Archived** = Release marked 'Completed' in Aha; read-only in dashboard; learnings indexed in RAG"

**Distinction:** Complete ≠ Shipped.
- **Complete:** Developer responsibility (PR merged). Aha status reflects it.
- **Shipped:** Release/crew responsibility (milestone push applies it). It's a RELEASE-LEVEL coordinated update.
- **Archived:** Historical record; no further changes.

**Should milestone push be the ONLY way to mark "Shipped"?** 

**Picard's Assessment:** "Yes, BUT with an escape hatch. Milestone push should be the standard, audited, bulk way to mark stories shipped as a release milestone. However, if a single story is delivered out-of-band (hot fix, manual deploy), a crew member should be able to mark it 'Shipped' via `updateAhaStoryStatus` under Worf's confirm gate — but this should be RARE and LOGGED to RAG."

**Admiral Authority:** "If a story is manually marked 'Shipped' in Aha without milestone push, milestone push should STILL accept it (idempotent). But it should FLAG it in the validation report as 'Out-of-Band Shipped' for auditability."

---

### 3. RELEASE/SPRINT LIFECYCLE

**Question:** When does an Aha release get marked "Completed"? Who marks it?

#### Crew Analysis:

**Geordi:** "Releases = sprints. An Aha release should be marked 'Completed' when:
1. All stories in the release are 'Shipped' (or explicitly skipped/deferred)
2. Crew execution results are archived
3. Admiral approves the release milestone
4. Cost metrics are finalized

This is EXACTLY what milestone push does."

**Current Model:** No explicit "release complete" status in existing workflow. Releases just accumulate stories; there's no formal close ceremony.

**Milestone Push Introduces:** Release closure ceremony: validation → approval → execution → archival.

**Key Decision:**
- **Should milestone push be the ONLY way to mark a release "Completed"?** YES (per design).
- **Rationale:** It enforces auditability, Admiral oversight, and crew learning capture. Manual closure opens gaps.
- **Exception:** A release can be abandoned (Admiral decision) via a separate `release:abandon` tool (future). This is NOT milestone push.

**What happens to stories in a "Completed" release?**

**Troi:** "From a stakeholder perspective, 'Completed' release = shipped features. The stories should remain READABLE and DISCOVERABLE (for reference, learnings, bug traceability), but NOT EDITABLE. Think 'immutable release record.'"

**Dashboard Model:**
- Completed releases appear in a "Released" tab (separate from "Active" releases).
- Stories in a Completed release have a badge (e.g. 🏁 "Shipped in Release X").
- Can generate historical reports: "Show me all stories shipped in 2026 Q3."

**Can you add stories to a completed release?** NO. Completed releases are READ-ONLY. To add stories, create a new release or reopen the completed one (Admiral decision with logging).

---

### 4. CREW EXECUTION STATE & ARCHIVE

**Question:** What does "archive" mean? How should crew learnings be accessible after completion?

#### Crew Analysis:

**Quark:** "Archive = Move from hot path (Supabase active tables) to cold path (Supabase archive table + RAG vector index). 

Current flow:
- Crew execution → `sa_story_executions` (hot)
- Milestone push → migrate to `sa_story_executions_archive` (cold) + snapshot to RAG

Why: Active stories take hot storage budget. Archived stories don't. RAG search index retains full findability."

**RAG Storage Model (Picard's Design):**
```
- Tag: `milestone-push-<release-id>`
- Content: Full crew findings, cost metrics, learnings, risks encountered
- Searchable: "stories about async database migration" → surfaces findings from relevant releases
- Retention: Permanent (3-year default, per firm policy)
```

**Aha Integration (Riker's Proposal):**
Create an Aha release note with:
1. Summary: "Release X shipped on [date] with Y stories"
2. Crew findings: Key learnings, risks, improvements for future releases
3. Cost breakdown: Crew cost vs. estimated Anthropic equivalent
4. RAG link: "Full crew deliberation: https://rag.story-agent.io/?tag=milestone-push-<id>"

**Accessibility After Completion:**

| Source | Accessible? | Use Case |
|--------|-------------|----------|
| Aha Release Notes | Yes (readable) | Quick reference; stakeholder comms |
| Supabase Archive | Yes (queryable) | Analytics, reporting |
| RAG | Yes (vector search) | Finding related learnings from past releases |
| Dashboard UI | Yes (read-only) | Historical release view + crew findings tab |

**Decision:** Archive = Multi-modal. Don't delete crew execution data; just move it to cold path + release notes.

---

### 5. GITHUB BRANCH LIFECYCLE

**Question:** Do all branches get deleted by milestone push? What about release branches?

#### Crew Analysis:

**O'Brien:** "Feature branch lifecycle:
1. Story created → branch created (e.g. `story/STORY-123-user-profile`)
2. PR opened → branch linked
3. PR merged → branch exists in GitHub (can be deleted or kept for history)
4. Milestone push → **DELETE merged branches** (default) or **archive to release/* branch** (optional)

**Risky Operations:**
- Force-deleting branches developers have local checkouts of → Inform via dashboard/Slack
- Deleting unmerged branches → BLOCK; validate first
- Deleting protected branches → BLOCK; WorfGate rejects

**Validation Gate:**
Before deleting, verify:
- Branch is fully merged to base (no commits on feature branch after merge)
- No outstanding PRs on the branch
- Developer is notified (Slack message: 'Feature branch story/STORY-123 will be archived on [date]')

**Release Branches:**
- Milestone push should NOT create release branches (e.g. `release/v1.2.3`). That's a DEPLOYMENT concern, not a release closure.
- **Future:** A separate `release:tag` tool could create `release/*` branches if needed (future work).

**Graceful Skip:**
If O'Brien detects a branch can't be safely deleted, he logs it, alerts Admiral, and CONTINUES with other branches. Partial success is OK (with audit trail)."

**Decision:**
- Delete merged feature branches (default).
- Do NOT create release branches.
- Do NOT touch release management (version tagging, release notes).
- Partial branch deletions are OK with audit trail.
- Notify developers via Slack.

---

### 6. APPROVAL & AUTHORITY MODEL

**Question:** Who approves story status changes? Should milestone push REQUIRE Admiral approval?

#### Crew Analysis:

**Worf:** "Current model:
- Story status changes go through WorfGate: confirm gate (dry-run → confirm → audit).
- Any crew member can propose; Worf confirms (binds the change).
- No Admiral oversight today.

**Milestone push adds Admiral tier:**
- Phase 1 (Validation): Crew auto-validates (no human gate).
- Phase 2 (Approval): Picard recommends (advisory); Admiral APPROVES (binding).
- Phase 3 (Execution): Crew executes (Worf gates each write).

**Rationale:** Release milestone is OUTWARD-FACING (shipped to customers, stakeholders). Admiral = business authority. So yes, Admiral approval is REQUIRED."

**What if Aha and GitHub get out of sync?**

**O'Brien:** "Scenario: We mark stories 'Shipped' in Aha, then GitHub API fails and branches don't delete.

**Mitigation (from design):**
- Phase 3 has circuit breaker: 30s timeout, 2 retries per step, halt on unrecoverable failure.
- If Aha write succeeds but GitHub deletion fails → HALT, alert Admiral, provide rollback script.
- Rollback available within 24h: reverses Aha updates, re-creates branches.

**Key:** Milestone push is TRANSACTIONAL at the validation level (all-or-nothing approval), but STEPS are idempotent (can retry safely)."

**Should approval gate include Aha workflow validation?**

**Riker's Proposal:** "Yes. Phase 1 validation should confirm:
- All stories in release have status ∈ {'Complete', 'Shipped', 'Deferred'}
- No stories in 'In Code Review' or 'In Progress' (reject unless Admiral overrides)
- Release status is 'Active' (not already 'Completed')

This prevents invalid state transitions (e.g. marking In Progress stories Shipped)."

**Override Mechanism:**
Admiral can `--override --reason="..."` to bypass validation (e.g., "Story was manually shipped; deferred is acceptable for this release"). Logged to audit trail + RAG.

---

### 7. OBSERVABILITY & TRACEABILITY

**Question:** How should milestone push results appear in Aha? Should Aha have a "Milestone Push" status?

#### Crew Analysis:

**Uhura:** "Observability model:

**In Aha Timeline/Activity:**
- Release marked 'Completed' at [timestamp]
- Crew recorded [N] stories shipped, [M] branches archived
- Release notes: 'Milestone Push [release-id] completed by Admiral [name] on [date]'
- Summary link: → RAG record (`milestone-push-<release-id>`)

**Custom Fields (Aha):**
- Milestone Pushed: Yes/No
- Milestone Date: [ISO 8601]
- Crew Cost: $[X.XX]
- Branches Archived: [count]

**Separate 'Milestone Push' Status?** No. The release status 'Completed' is sufficient. Individual stories stay 'Shipped'. No separate status needed; it adds noise.

**Aha Reports:**
- Dashboard widget: "Releases by status" (Active, Completed, Archived)
- Historical report: Filter by 'shipped in milestone' + date range
- Cost report: Crew cost aggregated by release + sprint"

**Historical Record:**

Picard:** "After milestone push, PRESERVE:
1. Aha release record (permanent; read-only after completion)
2. Story records (permanent; links to PRs + crew findings)
3. Supabase archive table (permanent; queryable)
4. RAG record (permanent; vector searchable)

IMMUTABILITY: A Completed release cannot be re-opened or modified (Admiral gate only)."

---

### 8. CONFLICTS & DEPENDENCIES

**Question:** Are there existing Aha workflows/automations that might conflict?

#### Crew Analysis:

**Data:** "Current Aha automation assumptions (from crew-story-lifecycle.ts):
- Story created in Aha → No auto-action (Riker creates via `create_feature`)
- PR opened → Story status manually updated to 'In Code Review' (Riker calls `updateAhaStoryStatus`)
- PR merged → Story status manually updated to 'Shipped' (Riker calls `updateAhaStoryStatus`)

QUESTION: Are there Aha workflow rules (auto-close, auto-complete, timed transitions) that might interfere?

**Assessment:** No conflicting automations detected. Aha workflow rules are EXPLICIT (crew controls them via API). No surprise auto-transitions.

**Risk:** If an Aha admin later adds auto-transitions (e.g., 'Auto-complete stories 30 days after PR merge'), that could RACE with milestone push.

**Mitigation:** Maintain a canonical list of Aha workflow rules in code + docs. Crew verifies before each milestone push."

**Aha's Native Release Management:**

**Geordi:** "Aha has release phases: 'Planning' → 'Scheduled' → 'Released' → 'Done'. These are orthogonal to our story statuses. Milestone push doesn't touch these (different data model). We control story + release status via API; phase transitions are separate."

**If human manually deletes branch before milestone push:**

**O'Brien:** "Scenario: Dev deletes `story/STORY-123` locally AND on GitHub before milestone push runs.

**Handling:**
- Phase 1 validation: Check branch exists on GitHub
- If missing: FLAG in report ('Branch already deleted') but DON'T BLOCK
- Phase 3: Try to delete; GitHub returns 404; catch exception, log, continue
- Result: Milestone push succeeds, just skips the already-deleted branch

IDEMPOTENT: Second run of same milestone push won't try to delete again."

---

### 9. FUTURE EXTENSIBILITY

**Question:** Should milestone push support partial releases? Rollback? Downstream actions?

#### Crew Analysis:

**Picard's Future Vision:**

1. **Partial Releases:** OUT OF SCOPE for Phase 1. Today: all-or-nothing. Future: Flag stories as 'deferred' and ship subset (requires epic/story grouping logic).

2. **Rollback:** IN SCOPE (Phase 1 design includes it). Within 24h, Admiral can `milestone:rollback <release-id>` to:
   - Re-open stories in Aha (status back to 'Shipped' → 'In Code Review')
   - Restore feature branches (from git history)
   - Log reason to RAG + Aha
   - Note: Beyond 24h, requires manual intervention (git recovery scripts provided)

3. **Downstream Actions (Future):** Could trigger:
   - Deploy to production (DevOps)
   - Send customer notifications (Marketing)
   - Create Jira/Linear tasks for next sprint
   - Trigger analytics dashboards
   - Current design: Milestone push → Release Note → 3rd-party webhooks can watch Aha via APIs

**Recommendation:** Keep Phase 1 focused on release closure. Downstream actions = Phase 2.

---

## SYNTHESIS: CRITICAL CLARIFICATIONS & FORWARD DECISIONS

### 4 Pre-Implementation Clarifications

| Issue | Clarification Needed | Recommendation |
|-------|---------------------|-----------------|
| **1. Story Completion Semantics** | When does a story move from "In Progress" → "Complete" vs "Shipped"? | Adopt Data's 3-tier model: Complete (PR merged) → Shipped (milestone recorded) → Archived (read-only). Update `update_aha_story_status` docs. |
| **2. Release State Model** | Can released stories be edited? Can you re-open a Completed release? | Completed releases are READ-ONLY. Exceptional re-open requires Admiral approval + logging. Document in Aha governance guide. |
| **3. Approval Tiers** | Is Admiral approval separate from Worf's confirm gate? Or combined? | SEPARATE: WorfGate = crew governance (story-level); Admiral = business authority (release-level). Both gates apply. |
| **4. Aha Automation Audit** | Do existing Aha workflow rules conflict with milestone push? | AUDIT: Create a canonical `docs/aha-workflow-rules.md` listing all auto-transitions. Verify before each milestone push. |

### 3 Forward-Looking Design Decisions

| Decision | Rationale | Action |
|----------|-----------|--------|
| **Story Statuses** | Extend existing `update_aha_story_status` tool; no new API. Milestone push uses existing infra. | Riker: No new Aha APIs needed. Reuse existing endpoints. |
| **Release Closure** | Milestone push is the STANDARD way to mark release "Completed" (not the only way). Emergency escape hatch for out-of-band ships via Worf gate + rare logging. | Design: Make milestone push idempotent so it gracefully handles manually-shipped stories. |
| **Branch Management** | Delete merged branches (default); do NOT create release branches (that's deployment concern). Partial success OK with audit trail. | O'Brien: Implement safe deletion with notifications. Don't touch release tagging. |

---

## FINAL CREW RECOMMENDATION

### Is Milestone Push Logically Coherent with Existing Aha Workflow?

**✅ YES, with clear integration points.**

**Coupling Model: LOOSE but MONITORED**

Milestone push is **loosely coupled** to story execution (reads final states; doesn't interfere with day-to-day work). But it's **tightly coupled** to release closure (enforces all-or-nothing gate; no partial ship without Admiral decision).

### Integration Checklist (Pre-Implementation)

- [ ] **Clarify:** Story completion model (3-tier: Complete → Shipped → Archived) documented + implemented
- [ ] **Audit:** Existing Aha workflow rules; document in `docs/aha-workflow-rules.md`
- [ ] **Design:** Release state model (read-only after "Completed"; re-open only via Admiral)
- [ ] **Gate:** Approval tiers (WorfGate for story writes; Admiral for release milestone)
- [ ] **Implement:** Riker's 4-phase state machine (no new Aha APIs; reuse existing endpoints)
- [ ] **Test:** Circuit breaker + partial failure scenarios (O'Brien responsible)
- [ ] **Communicate:** Aha governance docs + crew briefing on new workflow

### Risks to Monitor

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Aha auto-transitions interfere with milestone push | Medium | Audit existing rules; require explicit approve before each milestone |
| Admiral approval process becomes bottleneck | Low | Design: 15-min review window; Slack notifications; async approval token support |
| Out-of-band story ships complicate audit trail | Low | Gracefully handle in validation; flag as "Out-of-Band"; log to RAG |
| Branch deletion race with developer checkouts | Low | Notify developers via Slack 24h before milestone push; provide recovery steps |
| Supabase archive schema requires manual migration | Medium | Data: Finalize schema NOW (before Phase 1 starts); QA in dev environment |

### Success Criteria

✅ Milestone push and existing Aha workflow coexist without conflicts  
✅ Story completion model (3-tier) clearly defined + documented  
✅ Release state transitions (Complete → Completed → Read-Only) enforced  
✅ Admiral approval gate separate from WorfGate  
✅ No new Aha APIs created; existing endpoints sufficient  
✅ Crew sign-off on integration design before Phase 1 execution  

---

## CREW SIGN-OFF

- **Picard:** "The design is coherent. Milestone push cleanly extends the existing workflow without breaking abstraction boundaries. Recommend proceeding with the BALANCED approach and the 4 pre-implementation clarifications."

- **Data:** "Schema design is sound. 3-tier completion model is elegant; minimizes Aha schema changes. Ready to finalize artifact bundling + archive migration."

- **Worf:** "WorfGate governance is preserved. Admiral approval tier is necessary and well-defined. Security audit trail intact."

- **Riker:** "State machine is bulletproof. No gaps with existing story execution workflow. Ready to implement Phase 1."

- **O'Brien:** "GitHub integration is safe. Branch deletion idempotent + notified. Circuit breaker logic handles partial failures."

- **Uhura:** "Dashboard integration clear. Release completion story is compelling for stakeholders. Recommend launching with Slack alerts."

- **Quark:** "Cost attribution model works. Aha API calls are negligible cost; crew cost is the driver. Budget gates enforced."

**Overall:** The crew validates that milestone push logically integrates with Story Agent's existing Aha workflow. No blocking conflicts. Recommend approval to proceed with Phase 1 implementation.

---

**Document Status:** ✅ CREW DELIBERATION COMPLETE  
**RAG Tag:** `milestone-push-aha-integration-review-v1`  
**Next Step:** Admiral review + approval for Phase 1 (Data/Schemas) startup.

