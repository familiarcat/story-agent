# Approval Tier Separation: WorfGate vs Admiral Authority

**Owner:** Worf & Picard (Governance + Authorization)  
**Task:** Clarify and document the separation of WorfGate (crew) and Admiral (business) approval gates  
**Date:** 2026-07-16  
**Status:** ✅ Clarification #4 — Complete

---

## Executive Summary

The `milestone_push` process requires **two independent approval gates**, each with distinct authority and purpose:

1. **WorfGate Confirm** (Crew Governance) — Verify technical correctness, no conflicts, crew alignment
2. **Admiral Approval** (Business Authority) — Final business decision; release is official

Both gates must pass for milestone execution. If one fails, the process aborts and can be retried.

---

## Current State: WorfGate Only

Today, all Aha writes (story status, release updates) pass through **WorfGate**:

```
Crew Decision
  ↓
WorfGate Confirm (Dry-run + audit)
  ↓
Aha API Call (if confirmed)
  ↓
RAG Memory
```

**WorfGate Responsibility:**
- Verify Aha API call is syntactically correct
- Ensure no conflicts (automation races, missing data)
- Immutable audit trail (always logged)
- Dry-run preview (crew sees what will happen)

**Question for Milestone Push:**
- Is WorfGate enough, or does business decision require Admiral approval?
- **Answer:** Both. WorfGate is TECHNICAL; Admiral is BUSINESS.

---

## Proposed 2-Tier Approval Model

```
┌────────────────────────────────────────────────────────────────┐
│                    MILESTONE_PUSH APPROVAL FLOW                │
└────────────────────────────────────────────────────────────────┘

Phase 1: Validation (Riker)
├─ Audit Aha automation rules
├─ Verify all stories are "Complete"
├─ Check release eligibility
└─ Report findings to crew

Phase 2: Crew Deliberation (Observation Lounge)
├─ Picard: Should we proceed?
├─ Data: Any schema/data issues?
├─ Riker: State machine is sound?
├─ Worf: WorfGate conflicts?
└─ Unanimous: ✓ Ready for gates

Phase 3: WorfGate Confirm Gate
├─ Scope: Technical governance
├─ Gate Owner: Worf
├─ Prompt: "Confirm milestone_push: [summary]? (Y/N)"
│  Summary includes:
│    - Release name + date
│    - Story count
│    - API calls to execute
│    - Branch deletions (24h window)
│    - Cost (API calls + compute)
├─ Outcome: Confirmed / Vetoed / Escalated
├─ If Confirmed:
│    ✓ Proceed to Admiral Gate
│    ✓ Record WorfGate timestamp + signature
├─ If Vetoed:
│    ✗ Abort + log reason to RAG
│    ✗ Crew reviews & fixes issues
└─ If Escalated:
    → Admiral makes decision (rare)

         ↓ [WorfGate Confirmed]
         
Phase 3b: Admiral Approval Gate
├─ Scope: Business decision
├─ Gate Owner: Admiral (Sovereign Factory)
├─ Prompt: "APPROVE release closure: [Release Name]? 
│           - Approve
│           - Veto (with reason)
│           - Ask Questions (defer)"
│  Context shown:
│    - Release overview (stories, sprints)
│    - Crew recommendation (Observation Lounge synthesis)
│    - Risk assessment
│    - Cost/impact summary
├─ Outcome: Approved / Vetoed / Deferred
├─ If Approved:
│    ✓ Record Admiral timestamp + signature
│    ✓ Proceed to Phase 4 (execution)
├─ If Vetoed:
│    ✗ Abort + log reason to RAG
│    ✗ Crew addresses feedback
│    ✗ Re-submit with modifications
└─ If Deferred:
    ⏸ Hold for Admiral availability
    ⏸ No expiry; can proceed anytime

         ↓ [Both gates approved]
         
Phase 4: Execution (Riker)
├─ Call Aha APIs (story + release updates)
├─ Create ShipmentRecords (Supabase)
├─ Schedule branch deletions (24h)
├─ Generate release notes (Uhura)
├─ Index to RAG (crew learnings)
├─ Post Slack notification
└─ Complete

         ↓ [Success]
         
Release Status: COMPLETED (read-only)
Crew Status: ARCHIVED (in cold storage, RAG indexed)
```

---

## Gate 1: WorfGate Confirm (Crew Governance)

### Responsibility

**Owner:** Worf  
**Gate Type:** Technical governance (defensive)  
**Authority:** Can VETO but NOT APPROVE (gate, not decision-maker)

### Scope

WorfGate validates:
1. **Syntax & API Correctness** — Aha/GitHub APIs will succeed
2. **Automation Conflicts** — No race conditions with Aha rules
3. **Data Integrity** — All stories are in expected state
4. **Cost Attribution** — API calls + compute are budgeted
5. **Audit Trail Readiness** — Logging is configured

### Prompt Design

**WorfGate Dry-Run Prompt (Interactive CLI + VS Code Extension):**

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                   ⚔️  WORFGATE CONFIRM GATE                   ║
║              Crew Governance: Technical Validation            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Release: S1 · wk 29 (RELEASE-2026-07-16)
Status: ACTIVE → COMPLETED
Stories: 12 (all Complete)

Planned Actions:
─────────────────────────────────────────────────────────────

1. Update 12 stories → status: "Shipped" (w/ ShipmentRecord)
2. Update 1 release → status: "Completed" (read-only)
3. Create 12 ShipmentRecords (Supabase)
4. Schedule branch deletions (12 branches, 24h window)
5. Index crew learnings (RAG vector store)
6. Post Slack notification (#crew-progress)

Aha Automation Audit:
─────────────────────────────────────────────────────────────

✓ auto-shipped-on-pr-merge: clear (no conflicts)
✓ auto-close-after-30-shipped: clear (fires later)
✓ All in-flight PRs: merged
✓ Aha API health: responding

Cost Attribution:
─────────────────────────────────────────────────────────────

Aha API Calls:      12 story updates + 1 release update = $0.12
GitHub API Calls:   12 branch queries = $0.03
Supabase:           12 inserts = $0.05
RAG Indexing:       12 vectors = $0.08
─────────────────────────────────────────────────────────────
Total Estimated:    $0.28
Budget Available:   $100.00/month (milestone pushes)

Crew Approval Chain:
─────────────────────────────────────────────────────────────

Data (Schema):        ✓ Approved
Riker (Execution):    ✓ Approved
Picard (Captain):     ✓ Approved
Observation Lounge:   ✓ Consensus

═════════════════════════════════════════════════════════════════

Worf's Gate Decision:  [C]onfirm / [V]eto / [E]scalate
(Default: abort if no response in 15 minutes)

Enter your decision (or details if veto/escalate):
> _
```

### Veto Reasons (If Worf Vetoes)

```
Common veto reasons (Worf selects + adds detail):

[ ] Aha automation conflict detected → Run validateAhaAutomationState again
[ ] In-flight PRs still exist → Merge PRs first
[ ] Aha API unresponsive → Retry after 5 minutes
[ ] Supabase migration pending → Complete schema changes first
[ ] Cost budget exceeded → Request budget increase
[ ] Crew consensus not unanimous → Full Observation Lounge debate
[ ] Other (describe): _________________________________

Escalation:
[ ] Escalate to Admiral for override decision
    Reason: _________________________________
    (Rare; only if technical issue has business exception)
```

### Escalation (To Admiral)

If WorfGate has a technical concern but sees business urgency:
```
Worf's Escalation to Admiral:
"⚠️  Technical concern: [detail]
     Business case: [why proceed anyway?]
     Risk: [what could go wrong]
     Admiral override? Y/N"
```

Admiral can override WorfGate (rare, logged to RAG).

### Output (WorfGate Confirm Success)

If WorfGate confirms:
```
2026-07-16T15:30:00Z | WorfGate | CONFIRMED
Signature: worf_20260716_153000_abc123def456
Dry-run summary saved to: /tmp/milestone-dry-run-20260716.log
Next: Awaiting Admiral approval
```

Stored in Supabase `sa_milestone_approvals` table:
```typescript
{
  releaseId: "RELEASE-2026-07-16",
  gate: "worfgate",
  status: "confirmed",
  approvedBy: "worf",
  approvedAt: "2026-07-16T15:30:00Z",
  dryRunSummary: {...},
  signature: "worf_20260716_153000_abc123def456",
}
```

---

## Gate 2: Admiral Approval (Business Authority)

### Responsibility

**Owner:** Admiral (Sovereign Factory — ultimate business authority)  
**Gate Type:** Business decision (final authority)  
**Authority:** Can APPROVE or VETO (decision-maker, not defender)

### Scope

Admiral approves:
1. **Release Readiness** — Is the crew's work shippable?
2. **Business Impact** — Does this align with product goals?
3. **Timing** — Is now the right time to close this release?
4. **Risk Acceptance** — Understand and accept any rollback risks

### Prompt Design

**Admiral Approval Prompt (Web UI + Slack Modal):**

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              👨‍⚖️  ADMIRAL APPROVAL GATE                        ║
║              Business Decision: Release Closure               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Release: S1 · wk 29
Period: 2026-06-30 to 2026-07-16 (16 days)
Status: Ready for closure → COMPLETED

Crew Recommendation:
─────────────────────────────────────────────────────────────
🖖 Captain Picard: "APPROVE. The release is ready. 
                    All stories are shipped and validated."

Technical Summary:
─────────────────────────────────────────────────────────────
Stories:            12 features completed
All Shipped:        ✓ Yes (verified by crew)
Code Review Pass:   ✓ All PRs merged
Aha Automation:     ✓ No conflicts detected
Crew Learnings:     ✓ Indexed to RAG + documented

Business Impact:
─────────────────────────────────────────────────────────────
Release Velocity:   +15% vs last sprint (11 stories)
Quality Metrics:    0 critical bugs, 2 minor (tracked)
User Feedback:      Positive (3 beta user testimonials)
Market Fit:         High (feature 3 was top customer request)

Risk Assessment:
─────────────────────────────────────────────────────────────
Risk 1: One story has optional follow-up feature
  → ACCEPTED: Can ship as Phase 2 (next sprint)
  
Risk 2: Branch deletion window (24h) for developer recovery
  → ACCEPTED: Developer notified; git recovery steps provided
  
Risk 3: Rollback within 24h (rare; documented path)
  → ACCEPTED: Admiral override available if needed

Milestone Approval Chain:
─────────────────────────────────────────────────────────────
WorfGate (Crew):      ✓ Confirmed (2026-07-16T15:30:00Z)
Admiral (Business):   ⏳ AWAITING (2026-07-16T15:31:00Z)

═════════════════════════════════════════════════════════════════

Admiral's Decision:

[✓ APPROVE]  Release is ready. Proceed to execution.
             (Releases all stories; marks release completed)

[✗ VETO]     Hold / address concerns, then resubmit.
             Reason: __________________________________

[❓ ASK]     Need clarification before deciding.
             Question: __________________________________

═════════════════════════════════════════════════════════════════

Decision by: [Admiral's Name]
Decision at: [Timestamp, auto-filled]
Signature:   [Admiral's credentials]
```

### Veto Reasons (If Admiral Vetoes)

```
Admiral's Veto Options:

[ ] Business timing: Not ready to ship (market timing, etc.)
    → Defer release (no penalty); retry next week
    
[ ] Quality concern: Crew recommendation disagrees with my review
    → Request additional crew review (in comments)
    
[ ] Scope mismatch: Stories don't match expected feature set
    → Request scope clarification from Riker
    
[ ] Budget/resource: Cannot support deployment at this time
    → Defer; plan for next window
    
[ ] Other (describe): _________________________________

Follow-up:
- Crew will address concerns
- Resubmit when ready (no time limit)
- Notification sent to crew Slack channel
```

### Deferral (If Admiral Asks Questions)

```
Admiral's Question:
"Can we confirm story STORY-126 (Notifications) is production-ready?
 I saw a concern in one user test."

Crew Response Channel:
- Picard or Riker posts detailed reply in Aha release comments
- Includes: test results, customer feedback, risk acceptance
- Admiral re-reads and makes final decision (approve/veto/defer)

Timeline:
- Question raised: 2026-07-16T15:35:00Z
- Crew response target: 30 minutes
- Admiral final decision: same day (or escalate)
```

### Output (Admiral Approval Success)

If Admiral approves:
```
2026-07-16T15:45:00Z | Admiral | APPROVED
Signature: admiral_20260716_154500_xyz789uvw012
Decision recorded: Proceeding to Phase 4 execution
```

Stored in Supabase `sa_milestone_approvals` table:
```typescript
{
  releaseId: "RELEASE-2026-07-16",
  gate: "admiral",
  status: "approved",
  approvedBy: "admiral",
  approvedAt: "2026-07-16T15:45:00Z",
  signature: "admiral_20260716_154500_xyz789uvw012",
  decisionContext: {
    crewRecommendation: "APPROVE",
    riskAcceptance: ["optional-follow-up", "branch-deletion-window"],
  },
}
```

---

## Gate Sequencing & Timeouts

### Sequential Flow (Both Must Pass)

```
Time  |  Gate             | Status      | Duration
──────┼──────────────────┼─────────────┼────────────────
T+0   | WorfGate Submit  | In Progress | ← Worf decides (15min timeout)
T+5   | WorfGate Confirm | ✓ OK        | Confirmed
T+5   | Admiral Submit   | In Progress | ← Admiral decides (30min timeout)
T+15  | Admiral Approve  | ✓ OK        | Approved
T+15  | Phase 4 Execute  | In Progress | ← Execution (30min window)
T+25  | Phase 4 Complete | ✓ Done      | Release closed
```

### Timeout Behavior

**WorfGate Timeout (15 minutes):**
- If Worf doesn't confirm within 15min, process ABORTS
- Reason: Worf is defensive; rapid decision needed
- Retry: Crew re-submits after Worf reviews

**Admiral Timeout (30 minutes):**
- If Admiral doesn't approve within 30min, process HOLDS
- Reason: Admiral may be in meeting; doesn't auto-fail
- Retry: Admiral can approve anytime (no expiry)
- Escalation: If critical, Riker can escalate to Picard to accelerate

**Execution Timeout (30 minutes):**
- If Phase 4 doesn't complete within 30min, process ABORTS
- Reason: API/network issues; can retry later
- Retry: After 5min cooldown, re-submit to both gates

### Replay & Idempotency

All gates are **idempotent**:
- If Phase 4 fails midway, retry the gate flow
- WorfGate re-confirms dry-run (findings may change)
- Admiral re-approves (if conditions unchanged)
- Phase 4 resumes from last checkpoint (via Supabase transaction)

---

## Approval Data Model

### Supabase Table: sa_milestone_approvals

```sql
CREATE TABLE sa_milestone_approvals (
  id BIGSERIAL PRIMARY KEY,
  release_id TEXT NOT NULL,
  milestone_push_id TEXT NOT NULL,
  gate TEXT NOT NULL, -- 'worfgate' | 'admiral'
  status TEXT NOT NULL, -- 'pending' | 'confirmed' | 'approved' | 'vetoed' | 'escalated' | 'deferred'
  
  -- Gate Metadata
  approved_by TEXT NOT NULL, -- crew_id (e.g., 'worf', 'admiral')
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  signature TEXT NOT NULL, -- Immutable audit trail
  
  -- Context (gate-specific)
  decision_context JSONB, -- Gate-specific data
  veto_reason TEXT, -- If status = 'vetoed'
  escalation_reason TEXT, -- If status = 'escalated'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexing
  UNIQUE(release_id, gate),
  INDEX(milestone_push_id),
  INDEX(approved_by),
  INDEX(status)
);
```

### TypeScript DTO

```typescript
export interface MilestoneApproval {
  id: number;
  releaseId: string;
  milestonePushId: string;
  gate: 'worfgate' | 'admiral';
  status: 'pending' | 'confirmed' | 'approved' | 'vetoed' | 'escalated' | 'deferred';
  
  approvedBy: CrewId;
  approvedAt: Date;
  signature: string;
  
  decisionContext?: {
    dryRunSummary?: any; // WorfGate
    riskAcceptance?: string[]; // Admiral
    crewRecommendation?: 'approve' | 'hold';
  };
  
  vetoReason?: string;
  escalationReason?: string;
}

export interface MilestoneApprovalChain {
  releaseId: string;
  worfgate: MilestoneApproval | null;
  admiral: MilestoneApproval | null;
  allApproved: boolean; // true if both gates passed
  readyForExecution: boolean; // true if both passed + no expiry
}
```

---

## Test Cases (Worf + Picard Validation)

```typescript
describe('Approval Gate Separation', () => {
  
  it('should require both gates to pass for execution', async () => {
    const release = await createTestRelease();
    
    // WorfGate confirms
    await worfgateConfirm(release.id);
    
    // Admiral hasn't approved yet
    let canExecute = await canExecuteMilestonePush(release.id);
    assert(!canExecute, 'Should not execute without Admiral approval');
    
    // Admiral approves
    await admiralApprove(release.id);
    
    canExecute = await canExecuteMilestonePush(release.id);
    assert(canExecute, 'Should execute with both gates approved');
  });

  it('should abort if WorfGate vetoes', async () => {
    const release = await createTestRelease();
    
    await worfgateVeto(release.id, 'Aha automation conflict');
    
    const approvals = await getMilestoneApprovals(release.id);
    assert(approvals.worfgate.status === 'vetoed');
    
    let canExecute = await canExecuteMilestonePush(release.id);
    assert(!canExecute);
  });

  it('should not auto-fail if Admiral takes > 30min', async () => {
    const release = await createTestRelease();
    
    await worfgateConfirm(release.id);
    // 45 minutes pass...
    
    const approvals = await getMilestoneApprovals(release.id);
    assert(approvals.admiral.status === 'pending', 'Should not auto-fail');
    
    // Admiral can still approve
    await admiralApprove(release.id);
    let canExecute = await canExecuteMilestonePush(release.id);
    assert(canExecute);
  });

  it('should escalate WorfGate to Admiral for override', async () => {
    const release = await createTestRelease();
    
    // WorfGate escalates (technical concern but business justification)
    await worfgateEscalate(release.id, {
      concern: 'Aha API throttling risk',
      businessJustification: 'Critical release deadline',
    });
    
    const approvals = await getMilestoneApprovals(release.id);
    assert(approvals.worfgate.status === 'escalated');
    
    // Admiral can override
    await admiralApproveOverride(release.id, { overrideWorfgate: true });
    
    let canExecute = await canExecuteMilestonePush(release.id);
    assert(canExecute);
  });

  it('should maintain immutable audit trail', async () => {
    const release = await createTestRelease();
    
    await worfgateConfirm(release.id);
    await admiralApprove(release.id);
    
    const approvals = await getMilestoneApprovals(release.id);
    
    // Both signatures must be present
    assert(approvals.worfgate.signature !== null);
    assert(approvals.admiral.signature !== null);
    
    // Signatures cannot be modified
    expect(() => modifySignature(approvals.worfgate)).toThrow();
  });

  it('should handle deferral (Admiral asks questions)', async () => {
    const release = await createTestRelease();
    
    await worfgateConfirm(release.id);
    await admiralDefer(release.id, { question: 'Confirm story STORY-126 is ready?' });
    
    const approvals = await getMilestoneApprovals(release.id);
    assert(approvals.admiral.status === 'deferred');
    
    // Crew responds to question
    await postCrewResponse(release.id, { response: 'Confirmed; all tests pass' });
    
    // Admiral can now approve
    await admiralApprove(release.id);
    let canExecute = await canExecuteMilestonePush(release.id);
    assert(canExecute);
  });

});
```

---

## Implementation Checklist

### Phase 1: Design & Validation (Week 1)
- [x] Define gate separation (this document)
- [ ] Design prompts (CLI + web UI)
- [ ] Create approval data model (Supabase schema)

### Phase 1: Execution (Week 2-3)
- [ ] **Worf:** Implement WorfGate confirm gate logic
- [ ] **Picard:** Integrate Admiral approval into web UI
- [ ] **Riker:** Call both gates in `milestone_push` Phase 3

### Phase 1: Testing (Week 4)
- [ ] Test gate sequencing (both pass, single veto, etc.)
- [ ] Test timeout behavior (15min WorfGate, 30min Admiral)
- [ ] Test escalation paths (WorfGate → Admiral override)
- [ ] Test audit trail (immutable signatures)

---

## Approval & Sign-Off

**Worf's Security Review:** ✅ Approved
- Gate separation is clear and auditable
- Signatures are immutable (WorfGate architecture)
- Admiral override path is properly gated

**Picard's Authorization:** ✅ Approved
- Admiral approval requirement respects business authority
- Crew governance (WorfGate) is preserved
- Both gates work independently without conflicts

**Riker's Execution Plan:** ✅ Approved
- Gate sequencing integrates cleanly into Phase 3-4
- Prompt design is clear for interactive execution
- Retry logic is straightforward

**Data's Schema Review:** ✅ Approved
- Supabase `sa_milestone_approvals` table is minimal and well-scoped
- DTO is comprehensive for tracking both gates
- Audit trail is immutable

---

## Next Actions

1. **Worf:** Implement `worfgateConfirmGate()` in `packages/mcp-server/src/agent-core/worfgate-confirm.ts`
2. **Picard & Uhura:** Design admiral approval modal (web UI + Slack modal)
3. **Riker:** Integrate both gates into `milestone_push` Phase 3
4. **Data:** Create Supabase migration for `sa_milestone_approvals` table
5. **All:** Reference this document during Phase 1 testing

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-16 | Worf & Picard | Initial approval gate separation design |

**RAG Tag:** `milestone-push-clarification-approval-gates`  
**Related:** [Riker's Story Lifecycle](story-lifecycle-3tier.md) | [Geordi's Release Lifecycle](aha-release-lifecycle.md) | [Data's Aha Automation Audit](aha-workflow-rules.md)
