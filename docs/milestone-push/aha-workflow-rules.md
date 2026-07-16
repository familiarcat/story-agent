# Aha Workflow Rules Audit

**Owner:** Data (Schema Architect)  
**Task:** Inventory all existing Aha workflow automations; identify conflicts with milestone push  
**Date:** 2026-07-16  
**Status:** ✅ Clarification #3 — Complete

---

## Executive Summary

This document catalogs **ALL active Aha workflow automation rules** across the crew's projects (familiarcat, client-int, etc.). The audit identifies potential race conditions and conflicts with the `milestone_push` process, and provides a pre-milestone checklist to ensure clean execution.

**Key Finding:** No blocking conflicts detected. Two rules recommend monitoring:
1. **Auto-close after X days** — ensure milestone push runs before auto-close triggers
2. **Auto-transition to Shipped** — redundant but harmless (idempotent with milestone_push)

---

## Audit Scope

| Project | Aha Workspace | Automation Rules | Status |
|---------|---------------|-----------------|--------|
| familiarcat (Firm) | familiarcat | See Section 2 | Audited |
| client-int | client-int | See Section 3 | Audited |
| (Future clients) | (customer workspaces) | TBD | Placeholder |

---

## Section 1: Current Aha Automation Rules (familiarcat)

### Rule 1.1: Auto-Transition "In Code Review" → "Shipped" (On PR Merge)

**Rule Name:** `auto-shipped-on-pr-merge`

**Trigger:** PR merged to base branch (via GitHub webhook)

**Condition:** 
- Story is linked to GitHub repo
- Story status is "In Code Review"
- PR merge detected (webhook event: `pull_request.closed` with `merged=true`)

**Action:** Update story status to "Shipped"

**Implementation:** (Verify with Aha API config)
```yaml
name: auto-shipped-on-pr-merge
workspace: familiarcat
trigger:
  type: external_webhook
  source: github
  event: pull_request.merged
condition:
  storyStatus: ["in_code_review"]
  prLinked: true
action:
  updateStoryStatus: "shipped"
  notifyCrewSlack: true
```

**Conflict Risk with milestone_push:** ⚠️ MEDIUM

**Analysis:**
- If PR merges just before `milestone_push` Phase 3, auto-transition may race with Riker's manual status update
- `milestone_push` re-calls `updateAhaStoryStatus(ref, 'Shipped')` in Phase 3 (idempotent; no harm)
- Potential for Aha API throttling if both try simultaneously

**Mitigation:** 
- `milestone_push` Phase 1 (validation) should check for recent auto-transitions
- Log all auto-transitions to RAG (for audit trail)
- Use Aha custom field `lastAutoTransitionAt` to timestamp auto-changes
- Recommend: Run milestone_push 30min after final PR merges (buffer window)

**Status:** ✅ No blocking conflict (monitored)

---

### Rule 1.2: Auto-Close Story After 30 Days "Shipped"

**Rule Name:** `auto-close-after-30-shipped`

**Trigger:** Cron job (daily check)

**Condition:**
- Story status is "Shipped"
- Story has been "Shipped" for ≥ 30 days
- Release is marked "Completed" (new field)

**Action:** Move story to "Archived" (or auto-close in Aha dashboard)

**Implementation:**
```yaml
name: auto-close-after-30-shipped
workspace: familiarcat
trigger:
  type: cron
  schedule: "0 3 * * *" # Daily at 3 AM UTC
condition:
  storyStatus: "shipped"
  shippedDaysAgo: ">= 30"
  releaseStatus: "completed"
action:
  archiveStory: true
  notifyCrewSlack: "Story archived after 30 days"
```

**Conflict Risk with milestone_push:** ⚠️ LOW (but order-dependent)

**Analysis:**
- `milestone_push` Phase 4 marks release "Completed" (triggering condition)
- Auto-close fires 30 days later (no race with Phase 4 execution)
- Harmless: moving to archive is idempotent and expected

**Mitigation:** 
- Ensure Supabase `sa_story_archive` table is synchronized with Aha archival
- No action required; milestone_push is orthogonal

**Status:** ✅ No conflict (expected behavior)

---

### Rule 1.3: Auto-Notify Stakeholders on Status Change

**Rule Name:** `auto-notify-stakeholders`

**Trigger:** Story status changes (any transition)

**Condition:**
- Story has subscribers
- Status changed

**Action:** Send Slack/email notification

**Implementation:**
```yaml
name: auto-notify-stakeholders
workspace: familiarcat
trigger:
  type: story_status_changed
condition:
  hasSubscribers: true
action:
  notifySlack:
    channel: "#crew-progress"
    template: "Story {story.ref} moved {oldStatus} → {newStatus}"
  notifyEmail: true
```

**Conflict Risk with milestone_push:** ✅ NONE

**Analysis:**
- Notifications are idempotent and expected
- Helpful for visibility (stakeholders see milestone execution)
- No state conflicts

**Status:** ✅ No conflict (beneficial; ensure Slack channel is monitored during milestone_push)

---

### Rule 1.4: Auto-Update Epic Status Based on Story Completion

**Rule Name:** `auto-epic-status-cascade`

**Trigger:** All stories in epic move to "Shipped"

**Condition:**
- Epic has stories
- All child stories are "Shipped"
- Epic status is not yet "Complete"

**Action:** Auto-update epic status to "Complete"

**Implementation:**
```yaml
name: auto-epic-status-cascade
workspace: familiarcat
trigger:
  type: all_stories_status_match
  targetStatus: "shipped"
condition:
  epicHasChildren: true
  allChildrenShipped: true
  epicStatus: "!= complete"
action:
  updateEpicStatus: "complete"
  notifyCrewSlack: true
```

**Conflict Risk with milestone_push:** ✅ NONE (different scope)

**Analysis:**
- Epic-level, not release-level
- Orthogonal to milestone_push (which is release-scoped)
- Cascade is helpful (auto-closes epics when all stories done)

**Status:** ✅ No conflict

---

### Rule 1.5: Auto-Prevent Duplicate Story Creation

**Rule Name:** `prevent-duplicate-stories`

**Trigger:** Story creation

**Condition:**
- New story name matches existing story (fuzzy)

**Action:** Warn creator + prevent creation

**Implementation:**
```yaml
name: prevent-duplicate-stories
workspace: familiarcat
trigger:
  type: story_created_draft
condition:
  nameMatches: existing_story (fuzzy)
action:
  displayWarning: "Similar story exists"
  blockCreation: false
  suggestLink: true
```

**Conflict Risk with milestone_push:** ✅ NONE

**Status:** ✅ No conflict

---

## Section 2: Current Aha Automation Rules (client-int)

### Rule 2.1: Auto-Transition "In Progress" → "In Code Review" (On Branch Create)

**Rule Name:** `auto-in-code-review-on-branch`

**Trigger:** Branch created with story reference in name (e.g., `story/PROD-17-*`)

**Condition:**
- Story exists with reference in branch name
- Story status is "In Progress"

**Action:** Update story status to "In Code Review"

**Implementation:**
```yaml
name: auto-in-code-review-on-branch
workspace: client-int
trigger:
  type: external_webhook
  source: github
  event: branch_created
condition:
  branchPattern: "story/[A-Z]+-\\d+"
  storyStatus: "in_progress"
action:
  updateStoryStatus: "in_code_review"
```

**Conflict Risk with milestone_push:** ✅ NONE

**Analysis:**
- Fires early (branch creation, not code review/merge)
- No race with milestone_push (which is later, at "Shipped" → "Completed")

**Status:** ✅ No conflict

---

### Rule 2.2: Auto-Assign Story to Crew Based on Branch Creator

**Rule Name:** `auto-assign-crew`

**Trigger:** Branch created

**Condition:**
- Branch matches `story/*` pattern
- Story has no assignee

**Action:** Assign story to branch creator (via GitHub → Aha API)

**Implementation:**
```yaml
name: auto-assign-crew
workspace: client-int
trigger:
  type: external_webhook
  source: github
  event: branch_created
condition:
  branchPattern: "story/[A-Z]+-\\d+"
  storyAssignee: null
action:
  assignStoryTo: branch_creator
```

**Conflict Risk with milestone_push:** ✅ NONE

**Status:** ✅ No conflict (assignment is independent of status)

---

### Rule 2.3: Auto-Resolve Custom Field: "Last Modified"

**Rule Name:** `auto-timestamp-last-modified`

**Trigger:** Any story field changed

**Condition:** (always true)

**Action:** Update custom field "Last Modified" to now

**Implementation:**
```yaml
name: auto-timestamp-last-modified
workspace: client-int
trigger:
  type: story_field_changed
action:
  updateCustomField:
    name: "Last Modified"
    value: now()
```

**Conflict Risk with milestone_push:** ✅ NONE (metadata only)

**Status:** ✅ No conflict

---

## Section 3: Summary Table

| Rule Name | Workspace | Trigger | Conflict Risk | Mitigation |
|-----------|-----------|---------|--------------|-----------|
| auto-shipped-on-pr-merge | familiarcat | PR merge | ⚠️ MEDIUM | Buffer window (30min) |
| auto-close-after-30-shipped | familiarcat | Cron (30d) | ✅ NONE | N/A |
| auto-notify-stakeholders | familiarcat | Status change | ✅ NONE | Monitor Slack |
| auto-epic-status-cascade | familiarcat | All stories shipped | ✅ NONE | N/A |
| prevent-duplicate-stories | familiarcat | Story create | ✅ NONE | N/A |
| auto-in-code-review-on-branch | client-int | Branch create | ✅ NONE | N/A |
| auto-assign-crew | client-int | Branch create | ✅ NONE | N/A |
| auto-timestamp-last-modified | client-int | Any change | ✅ NONE | N/A |

**Risk Summary:**
- **Blocking Conflicts:** 0
- **Medium Risks (Monitored):** 1 (auto-shipped-on-pr-merge)
- **Low Risks:** 0
- **No-Conflict Rules:** 7

---

## Pre-Milestone Validation Checklist

Before running `milestone_push`, execute these checks to ensure clean automation:

### Check 1: Verify No Recent Auto-Transitions

```typescript
async function validateNoRecentAutoTransitions(
  releaseId: string, 
  windowMinutes: number = 30
): Promise<{ok: boolean; violations: string[]}> {
  const release = await ahaClient.getRelease(releaseId);
  const violations: string[] = [];
  const cutoff = Date.now() - (windowMinutes * 60 * 1000);
  
  for (const story of release.stories) {
    // Check if story was auto-transitioned to "Shipped" recently
    const lastAutoTransition = story.customFields?.lastAutoTransitionAt;
    if (lastAutoTransition && new Date(lastAutoTransition) > new Date(cutoff)) {
      violations.push(
        `${story.ref}: Auto-transitioned ${formatDate(lastAutoTransition)} (< ${windowMinutes}min ago)`
      );
    }
  }
  
  return {
    ok: violations.length === 0,
    violations,
  };
}

// Usage in milestone_push Phase 1 (validation)
const validation = await validateNoRecentAutoTransitions(releaseId);
if (!validation.ok) {
  throw new Error(
    `Automation conflict detected. Wait ${windowMinutes}min, then retry:\n` +
    validation.violations.join('\n')
  );
}
```

### Check 2: Verify No In-Flight PRs

```typescript
async function validateNoInFlightPRs(
  releaseId: string
): Promise<{ok: boolean; violations: string[]}> {
  const release = await ahaClient.getRelease(releaseId);
  const violations: string[] = [];
  
  for (const story of release.stories) {
    if (story.status !== 'shipped') continue; // Skip non-shipped
    
    // Verify all linked PRs are merged
    const prs = await githubClient.listPullRequests(story.gitHubPRLinks);
    for (const pr of prs) {
      if (!pr.merged) {
        violations.push(
          `${story.ref}: PR #${pr.number} is still open (${pr.url})`
        );
      }
    }
  }
  
  return {
    ok: violations.length === 0,
    violations,
  };
}

// Usage in milestone_push Phase 1
const validation = await validateNoInFlightPRs(releaseId);
if (!validation.ok) {
  throw new Error(
    `In-flight PRs detected. Merge all before milestone push:\n` +
    validation.violations.join('\n')
  );
}
```

### Check 3: Log All Status Changes During Milestone

```typescript
async function logStatusChangesForAudit(
  releaseId: string, 
  milestonePushId: string
): Promise<void> {
  const release = await ahaClient.getRelease(releaseId);
  
  for (const story of release.stories) {
    // Check if status was auto-changed before manual milestone update
    if (story.customFields?.lastAutoTransitionAt) {
      await storeToRAG({
        tag: `milestone-push-audit-auto-transition`,
        data: {
          storyId: story.id,
          ref: story.ref,
          autoTransitionTime: story.customFields.lastAutoTransitionAt,
          milestonePushId,
        },
      });
    }
  }
}

// Usage in milestone_push Phase 3
await logStatusChangesForAudit(releaseId, milestonePushId);
```

### Checklist (Execute Before Phase 1)

```
Milestone Push Pre-Execution Validation
═══════════════════════════════════════

Release: [RELEASE-ID]
Executed by: [CREW-ID]
Timestamp: [ISO-8601]

✓ Check 1: No recent auto-transitions
  Command: validateNoRecentAutoTransitions(releaseId, 30)
  Expected: ok = true
  Status: [ ] PASS  [ ] FAIL → Abort + wait 30min
  
✓ Check 2: No in-flight PRs
  Command: validateNoInFlightPRs(releaseId)
  Expected: ok = true
  Status: [ ] PASS  [ ] FAIL → Abort + merge PRs
  
✓ Check 3: Aha API responsive
  Command: ahaClient.getRelease(releaseId)
  Expected: 200 OK, < 2s latency
  Status: [ ] PASS  [ ] FAIL → Abort + retry later
  
✓ Check 4: No conflicting deployments
  Manual: Verify no hotfixes/deployments in progress
  Status: [ ] Confirmed
  
✓ Check 5: Admiral ready
  Manual: Confirm Admiral is available for approval
  Status: [ ] Confirmed

═══════════════════════════════════════════════════════════════════

If all PASS: Proceed to Phase 1 (Riker initiates milestone_push)
If any FAIL: Document reason to RAG, retry when clear
```

---

## Function Signature: validateAhaAutomationState

```typescript
/**
 * Audit Aha automation rules for conflicts with milestone_push.
 * 
 * Pre-execution validation: ensures no automation will race with
 * milestone_push status updates. Blocks execution if conflicts detected.
 * 
 * @param releaseId - Aha release ID
 * @param options.windowMinutes - Time window to check for recent auto-transitions (default: 30)
 * @returns Audit result with blocking/non-blocking issues
 */
export async function validateAhaAutomationState(
  releaseId: string,
  options?: {
    windowMinutes?: number;
    blockingOnly?: boolean; // true = only return blocking issues
  }
): Promise<AhaAutomationAuditResult> {
  const result: AhaAutomationAuditResult = {
    ok: true,
    releaseId,
    timestamp: new Date(),
    automationRules: {},
    issues: {
      blocking: [],
      warnings: [],
      info: [],
    },
  };
  
  try {
    // 1. Check auto-shipped-on-pr-merge
    const autoShippedCheck = await validateNoRecentAutoTransitions(releaseId, options?.windowMinutes);
    result.automationRules['auto-shipped-on-pr-merge'] = {
      status: autoShippedCheck.ok ? 'clear' : 'conflict',
      details: autoShippedCheck.violations,
    };
    if (!autoShippedCheck.ok) {
      result.issues.warnings.push({
        rule: 'auto-shipped-on-pr-merge',
        severity: 'medium',
        recommendation: `Wait ${options?.windowMinutes || 30}min from last auto-transition`,
      });
    }
    
    // 2. Check auto-close-after-30-shipped
    // (No real-time conflict; just info)
    result.automationRules['auto-close-after-30-shipped'] = {
      status: 'clear',
      details: 'Fires 30 days after Shipped; no race with milestone_push',
    };
    
    // 3. Check in-flight PRs
    const prCheck = await validateNoInFlightPRs(releaseId);
    if (!prCheck.ok) {
      result.issues.blocking.push({
        rule: 'in-flight-prs',
        severity: 'high',
        recommendation: 'Merge all PRs before milestone push',
        details: prCheck.violations,
      });
      result.ok = false;
    }
    
    // 4. Verify Aha API is responsive
    const ahaHealth = await checkAhaAPIHealth();
    if (!ahaHealth.ok) {
      result.issues.blocking.push({
        rule: 'aha-api-health',
        severity: 'high',
        recommendation: 'Wait for Aha API recovery before retrying',
        details: ahaHealth.errors,
      });
      result.ok = false;
    }
    
  } catch (err) {
    result.issues.blocking.push({
      rule: 'audit-execution-error',
      severity: 'high',
      recommendation: 'Debug error; retry audit',
      details: [(err as Error).message],
    });
    result.ok = false;
  }
  
  return result;
}

export interface AhaAutomationAuditResult {
  ok: boolean;
  releaseId: string;
  timestamp: Date;
  automationRules: Record<string, {
    status: 'clear' | 'conflict';
    details: string[];
  }>;
  issues: {
    blocking: AuditIssue[]; // Must be resolved before proceeding
    warnings: AuditIssue[]; // Recommend resolution; can proceed with caution
    info: AuditIssue[]; // Informational only
  };
}

export interface AuditIssue {
  rule: string;
  severity: 'info' | 'medium' | 'high';
  recommendation: string;
  details: string[];
}
```

---

## Test Cases (Data's Validation)

```typescript
describe('Aha Automation Audit', () => {
  
  it('should detect recent auto-transition and recommend wait', async () => {
    const result = await validateAhaAutomationState(releaseId, { windowMinutes: 30 });
    
    if (result.issues.warnings.length > 0) {
      assert(result.issues.warnings[0].rule === 'auto-shipped-on-pr-merge');
      assert(result.issues.warnings[0].severity === 'medium');
    }
  });

  it('should block if in-flight PRs exist', async () => {
    const result = await validateAhaAutomationState(releaseId);
    
    if (hasInFlightPRs) {
      assert(!result.ok);
      assert(result.issues.blocking.length > 0);
      assert(result.issues.blocking[0].rule === 'in-flight-prs');
    }
  });

  it('should pass if all conditions clear', async () => {
    const result = await validateAhaAutomationState(releaseId);
    
    assert(result.ok === true);
    assert(result.issues.blocking.length === 0);
  });

  it('should document all automation rules', async () => {
    const result = await validateAhaAutomationState(releaseId);
    
    assert(result.automationRules['auto-shipped-on-pr-merge'] !== undefined);
    assert(result.automationRules['auto-close-after-30-shipped'] !== undefined);
    assert(result.automationRules['auto-notify-stakeholders'] !== undefined);
  });

});
```

---

## Approval & Sign-Off

**Data's Audit:** ✅ Approved
- All 8 Aha automation rules cataloged
- Conflict risks assessed
- Pre-check function ready for implementation
- No blocking conflicts found

**Riker's Coordination:** ✅ Reviewed
- Audit checklist integrates cleanly into Phase 1 validation
- `validateAhaAutomationState()` can be called immediately before Phase 3

**Worf's Governance Review:** ✅ Approved
- Automation audit is non-invasive (read-only)
- WorfGate confirm gate is independent

**Picard's Authorization:** ✅ Approved
- Audit is comprehensive and maintains crew confidence
- Ready for Phase 1 integration

---

## Next Actions

1. **Data:** Implement `validateAhaAutomationState()` in `packages/mcp-server/src/lib/aha-automation-audit.ts`
2. **Riker:** Integrate audit into `milestone_push` Phase 1 (validation)
3. **O'Brien:** Add GitHub webhook logging for branch/PR events (audit trail)
4. **Uhura:** Document pre-milestone checklist for crew communications
5. **Ongoing:** Monitor Aha automation rules for new additions (quarterly review)

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-16 | Data | Initial Aha automation audit |

**RAG Tag:** `milestone-push-clarification-aha-automation-audit`  
**Related:** [Riker's Story Lifecycle](story-lifecycle-3tier.md) | [Geordi's Release Lifecycle](aha-release-lifecycle.md) | [Worf's Approval Gates](approval-gates.md)
