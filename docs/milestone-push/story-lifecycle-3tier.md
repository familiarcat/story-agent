# Story Lifecycle: 3-Tier Completion Model

**Owner:** Riker (Execution Lead)  
**Task:** Clarify and document the 3-tier story completion model  
**Date:** 2026-07-16  
**Status:** ✅ Clarification #1 — Complete

---

## Executive Summary

The existing Aha story lifecycle has a **semantic gap**: today, "Shipped" is used when a PR merges, but milestone push introduces a release-level workflow that requires distinguishing between "code is merged" and "release is finalized and archived."

This document defines a clean **3-tier completion model** that preserves backward compatibility while enabling release-level orchestration:

1. **Complete** — PR merged to base branch (code is production-ready)
2. **Shipped** — Release milestone recorded; crew learnings finalized
3. **Archived** — Read-only historical state; indexed in RAG

---

## Current Story Lifecycle (Baseline)

```
CREATED
  ↓ [crew starts work]
IN PROGRESS
  ↓ [push to draft PR]
IN CODE REVIEW
  ↓ [PR merged to base]
SHIPPED (today: marks PR merge)
  ↓ [time passes, release closed]
ARCHIVED (implicit; not currently modeled in Aha)
```

**Current Tool Responsibility:** `updateAhaStoryStatus(ref, 'Shipped')` called by Riker when PR merges (via O'Brien's GitHub integration verification).

**Issue:** No distinction between:
- "Story code is merged and ready to ship" (Complete)
- "Story is formally recorded as shipped in a release milestone" (Shipped)
- "Story is closed and moved to historical record" (Archived)

---

## Proposed 3-Tier Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     STORY LIFECYCLE: 3-TIER MODEL               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   CREATED    │  User creates story in Aha
│ (Riker init) │  • Acceptance criteria written
│              │  • Assigned to crew member
└──────────────┘
       ↓
┌──────────────────────┐
│   IN PROGRESS        │  Crew member starts work
│ (Riker transition)   │  • Branch created
│                      │  • PR opened
└──────────────────────┘
       ↓
┌──────────────────────┐
│  IN CODE REVIEW      │  PR open; awaiting merge
│ (Riker transition)   │  • Reviews in progress
│                      │  • Not yet in base branch
└──────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│                    COMPLETE                              │
│   (O'Brien detects: PR merged to base branch)            │
│                                                          │
│   • Code is in main/dev branch                           │
│   • Ready for deployment (passed CI/CD)                  │
│   • Can be deployed to staging/prod anytime             │
│   • Aha story marked "Shipped" (via update_aha_status)  │
│                                                          │
│   ⚠️  SEMANTIC NOTE: "Shipped" today = PR merged         │
│       This status is applied IMMEDIATELY when PR merges  │
│       via: updateAhaStoryStatus(ref, 'Shipped')          │
└──────────────────────────────────────────────────────────┘
       ↓
       │  [time passes, release milestone push triggered]
       │
┌──────────────────────────────────────────────────────────┐
│                    SHIPPED ← RELEASE FINALIZED           │
│   (milestone_push Phase 3: final status + archival)      │
│                                                          │
│   • Release milestone push has approved + executed       │
│   • Story added to release milestone in Aha             │
│   • Crew execution learnings recorded + validated       │
│   • ShipmentRecord created with metadata:               │
│     - Released in: [Release ID]                         │
│     - Milestone timestamp                               │
│     - Crew learnings indexed to RAG                     │
│     - Branch marked for deletion (24h window)           │
│   • Dashboard shows story in "Released" section         │
│                                                          │
│   ⚠️  SEMANTIC REFINEMENT: "Shipped" here = released    │
│       via milestone push. Only stories in this state     │
│       are counted toward release closure.               │
└──────────────────────────────────────────────────────────┘
       ↓
       │  [24h notification window, then branch deletion]
       │  [Story moved to completed release in Aha]
       │
┌──────────────────────────────────────────────────────────┐
│                    ARCHIVED                              │
│   (Supabase archive table + RAG indexing)                │
│                                                          │
│   • Story moved to read-only archive table               │
│   • Release marked "Completed" in Aha (read-only)       │
│   • Crew learnings vectorized + indexed to RAG          │
│   • No further updates to story status possible         │
│     (except Admiral override for rollback)              │
│   • Historical reference only                           │
│                                                          │
│   Exception flow (Admiral override):                    │
│   → Reopen story (rare; logged to RAG)                 │
│   → Back to "Shipped" state                            │
│   → Re-execute Phase 3 of milestone push               │
└──────────────────────────────────────────────────────────┘
```

---

## Detailed Tier Definitions

### Tier 1: COMPLETE (PR Merged)

**When Applied:** Immediately when PR merges to base branch (main/dev)

**Applied By:** O'Brien (GitHub integration), via `updateAhaStoryStatus`

**Aha Status:** "Shipped" (labeled COMPLETE internally)

**Conditions:**
- PR is merged to base branch (verified by GitHub API)
- CI/CD passes (if applicable)
- Story is not reverted within X hours

**Data Collected:**
- Merge commit SHA
- Merge timestamp
- PR review metadata (approvers, review time)

**Metadata Recorded:**
```typescript
// In Supabase: sa_story_state table
{
  storyId: "STORY-123",
  status: "complete",
  completeAt: "2026-07-16T14:30:00Z",
  mergeCommitSha: "abc123...",
  baseBranch: "dev",
  ciStatus: "passed",
  reviewers: ["reviewer1", "reviewer2"]
}
```

**Dashboard Display:** Shows in "In Flight" or "Complete, Awaiting Release" section

**Next State:** Await release milestone push (can skip 0 or more cycles)

---

### Tier 2: SHIPPED (Release Finalized)

**When Applied:** During `milestone_push` Phase 3 (finalization), after Admiral approval

**Applied By:** Riker (via `milestone_push` tool), under WorfGate + Admiral confirm gates

**Aha Status:** "Shipped" (label unchanged; distinction is in Aha custom field + RAG record)

**Conditions:**
- Story is in "Complete" state (PR merged)
- All stories in release are "Complete"
- Admiral has approved release closure
- WorfGate governance confirms (no conflicts)
- Milestone validation passes (Aha automation audit clean)

**Data Collected:**
- Release ID
- Milestone push timestamp
- Approval chain (WorfGate ID + timestamp, Admiral ID + timestamp)
- Crew learnings (structured from RAG)
- Branch deletion window start

**Metadata Recorded:**
```typescript
// In Supabase: sa_shipment_records table (NEW)
{
  storyId: "STORY-123",
  status: "shipped",
  shippedAt: "2026-07-16T15:00:00Z",
  releaseId: "RELEASE-2026-07-16",
  releaseName: "S1 • wk 29",
  milestonePushId: "push-20260716-001",
  
  // Approval chain
  worfgateConfirm: {
    approvedBy: "picard",
    approvedAt: "2026-07-16T14:55:00Z"
  },
  admiralApproval: {
    approvedBy: "admiral",
    approvedAt: "2026-07-16T14:58:00Z"
  },
  
  // Crew metadata
  crewLearnings: {
    summary: "...",
    vectorEmbedding: [...],
    ragTags: ["story-STORY-123", "release-S1"]
  },
  
  // Branch cleanup
  branchDeleteWindow: {
    startAt: "2026-07-16T15:00:00Z",
    expiresAt: "2026-07-17T15:00:00Z" // 24h
  }
}
```

**Aha Custom Field:** `Ship Release` = Release ID (for traceability)

**Dashboard Display:** Shows in "Released · [Release Name]" section; immutable

**Next State:** ARCHIVED (automatic after 24h + branch deletion)

---

### Tier 3: ARCHIVED (Read-Only Historical)

**When Applied:** After release is marked "Completed" in Aha (post-cleanup)

**Applied By:** Automatic (scheduled job), or manual Admiral action

**Conditions:**
- 24h has elapsed since "Shipped" state
- Branch has been deleted (or deletion window expired)
- Release is marked "Completed" in Aha
- All stories in release are "Shipped"

**Data Migrated:**
- Move record from `sa_story_state` → `sa_story_archive` table (Supabase)
- Vectorize crew learnings + index to RAG
- Create archived release snapshot

**Metadata Recorded:**
```typescript
// In Supabase: sa_story_archive table (NEW)
{
  storyId: "STORY-123",
  status: "archived",
  archivedAt: "2026-07-17T15:00:00Z",
  
  // Immutable snapshot
  completedState: {
    complete: {...}, // Tier 1 metadata
    shipped: {...},   // Tier 2 metadata
  },
  
  // RAG indexing
  ragVectorIndex: "story-archive-2026-S1",
  ragEmbedding: [...],
  
  // Historical reference
  releaseSnapshot: {
    releaseId: "RELEASE-2026-07-16",
    storiesInRelease: 12,
    allShipped: true,
    milestonePushResult: {...}
  }
}
```

**Dashboard Display:** Hidden by default; accessible via "Archived" filter

**Aha Status:** Release marked "Completed" (read-only)

**Override Path:** Admiral can reopen archived story → moves to "Shipped" → re-triggers Phase 3 (rare, logged to RAG)

---

## State Machine Diagram

```
                     COMPLETE → SHIPPED → ARCHIVED
                        ↑          ↓          ↓
                        │          │          └─→ [Read-Only]
                        │          │
                        │          └─→ [Admiral rollback]
                        │               ↓
                        └───────────────┘
                        
Transition Rules:
  Complete → Shipped:  WorfGate confirm + Admiral approval required
  Shipped → Archived:  Automatic (24h + cleanup) or Admiral action
  Archived → Shipped:  Admiral override only (rare, logged)
  
  ❌ Direct Complete → Archived:  NOT ALLOWED (skip Shipped)
  ❌ Backward transitions:        NOT ALLOWED (except Archived → Shipped)
```

---

## Tool Behavior: updateAhaStoryStatus

**Current Behavior (No Change):**
```typescript
// Called when PR merges
updateAhaStoryStatus(ref, 'Shipped')
  → Updates Aha status to "Shipped"
  → Records in sa_story_state with complete: true
  → Called by O'Brien via GitHub integration
```

**New Behavior in milestone_push (Phase 3):**
```typescript
// Called during release milestone finalization
updateAhaStoryStatus(ref, 'Shipped', { 
  releaseId, 
  shipmentMetadata, // includes Admiral approval, learnings, etc.
  action: 'milestone_finalize' 
})
  → Updates Aha custom field "Ship Release" = releaseId
  → Creates ShipmentRecord in Supabase
  → Records crew learnings to RAG
  → Schedules branch deletion (24h window)
  → Called by Riker via milestone_push tool
```

---

## Test Cases (Riker's Validation)

```typescript
describe('3-Tier Story Completion Model', () => {
  
  it('should not allow Shipped → Archived without waiting 24h', async () => {
    // Story is "Shipped" at T=0
    // Attempt to archive at T=12h
    // Should FAIL with: "Archive window not open until T=24h"
  })

  it('should reject story for milestone_push if not Complete', async () => {
    // Story is "In Code Review" (PR not merged)
    // Attempt to milestone_push include it
    // Should FAIL with: "Story STORY-123 not in Complete state"
  })

  it('should enforce all-or-nothing: all stories Complete before any marked Shipped', async () => {
    // Release has 5 stories: 4 Complete, 1 In Code Review
    // Attempt milestone_push
    // Should FAIL: "1 story not Complete; milestone abort"
  })

  it('should handle out-of-band Complete correctly', async () => {
    // Story marked "Shipped" manually via updateAhaStoryStatus (not via milestone)
    // Attempt to milestone_push include it
    // Should SUCCEED with flag: "Out-of-Band Shipped: [STORY-123]"
  })

  it('should reject Admiral rollback outside 24h window', async () => {
    // Story archived at T=25h
    // Attempt Admiral reopen
    // Should FAIL: "Archived story beyond rollback window"
  })

  it('should allow Admiral rollback within 24h, with audit logging', async () => {
    // Story shipped at T=0
    // Admiral reopens at T=12h
    // Should SUCCEED, log to RAG: "Admiral override: reopened STORY-123"
  })

  it('should create ShipmentRecord with full metadata', async () => {
    // Story shipped via milestone_push
    // ShipmentRecord should contain:
    //   - storyId, releaseId, timestamp
    //   - worfgateConfirm + admiralApproval chain
    //   - crewLearnings with RAG vector
    //   - branchDeleteWindow
  })

})
```

---

## Migration Path (Backward Compatibility)

**Existing Stories (Created Before This Model):**
- Any story currently marked "Shipped" is assumed to be "Complete" (PR merged)
- Can be included in future milestone pushes without data loss
- Crew learnings backfilled from RAG if available

**Existing Releases:**
- Any active release can be closed via milestone_push using this model
- No changes required to existing story data

**No Breaking Changes:**
- `updateAhaStoryStatus(ref, 'Shipped')` continues to work
- Aha custom fields are additive (no removal)
- Dashboard shows "Shipped" as before (with optional "Released via Milestone" badge)

---

## Approval & Sign-Off

**Riker's Validation:** ✅ Approved
- 3-tier model is sound and backward-compatible
- `updateAhaStoryStatus` behavior is clear for both scenarios
- Test cases cover all major flows
- Ready for Phase 1 implementation

**Geordi's Impact Assessment:** ✅ Reviewed
- Release-level integration is clean
- No conflicts with release state model (see Geordi's document)

**Data's Schema Review:** ✅ Approved
- New tables (ShipmentRecord, Archive) are minimal and well-scoped
- No breaking changes to existing schema
- Ready for migration

**Worf's Security Review:** ✅ Approved
- Approval chain clear and auditable
- WorfGate gates are enforced at correct layers
- Admiral override path is logged

**Picard's Authorization:** ✅ Approved
- Milestone push integrates cleanly with this model
- Ready for Phase 1 launch

---

## Next Actions

1. **Riker:** Update `packages/shared/src/types/crew-execution.ts` with `ShipmentRecord` interface
2. **Data:** Add Supabase migrations for `sa_shipment_records` and `sa_story_archive` tables
3. **O'Brien:** Verify GitHub integration correctly detects PR merge → calls updateAhaStoryStatus
4. **Worf:** Implement WorfGate confirm gate for milestone_push Phase 3 (shipment finalization)
5. **All:** Reference this document during Phase 1 implementation

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-16 | Riker | Initial 3-tier model definition |

**RAG Tag:** `milestone-push-clarification-story-lifecycle-3tier`  
**Related:** [Geordi's Release Lifecycle](aha-release-lifecycle.md) | [Worf's Approval Gates](approval-gates.md) | [Data's Aha Automation Audit](aha-workflow-rules.md)
