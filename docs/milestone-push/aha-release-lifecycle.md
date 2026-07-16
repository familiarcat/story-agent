# Release Lifecycle: Read-Only State Model

**Owner:** Geordi (Chief Engineer, Release Management)  
**Task:** Design and document how "Completed" releases behave in Aha  
**Date:** 2026-07-16  
**Status:** ✅ Clarification #2 — Complete

---

## Executive Summary

Today, Aha releases accumulate stories with no formal closure ceremony. Milestone push introduces a **release completion model** that transitions a release to "Completed" (read-only) after all stories are shipped and approved by the Admiral.

This document defines the operational semantics: what "read-only" means, how to implement it in Aha, and the exception flow for Admiral-authorized reopenings.

---

## Current Release Lifecycle (Baseline)

```
CREATED
  ↓ [Riker assigns stories]
ACTIVE (accepting stories)
  ↓ [sprint progress]
ACTIVE (stories ship incrementally)
  ↓ [sprint ends]
[undefined state; release lingers]
```

**Current Tool Responsibility:** Geordi manages release/sprint via Aha API; no formal "done" state.

**Issue:** 
- Releases don't have a closure ceremony
- Stories can be added after sprint "ends"
- No audit trail of what was "official" for a release
- Dashboard shows active releases indefinitely

---

## Proposed Release Lifecycle: 3 States

```
┌──────────────────────────────────────────────────────────────────┐
│                  RELEASE LIFECYCLE: 3 STATES                     │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         CREATED / ACTIVE RELEASE        │
│  (Geordi creates, releases stories in) │
│                                         │
│  • Can add/edit/remove stories          │
│  • Dates can be adjusted                │
│  • Story priority can change            │
│  • Dashboard: "Active Sprint"           │
│                                         │
│  Duration: From creation → 1-3 weeks   │
└─────────────────────────────────────────┘
         ↓
         │ [All stories marked "Shipped"]
         │ [Admiral approves milestone]
         │ [milestone_push Phase 4]
         ↓
┌──────────────────────────────────────────────────────────────┐
│           COMPLETED RELEASE (READ-ONLY)                      │
│   (milestone_push Phase 4: official release finalization)    │
│                                                              │
│   Operational Semantics:                                    │
│   ✓ Can VIEW all stories in release                         │
│   ✓ Can VIEW story status + crew learnings                  │
│   ✓ Can GENERATE release notes                              │
│   ✓ Can REFERENCE for audit/history                         │
│                                                              │
│   ✗ CANNOT add stories                                      │
│   ✗ CANNOT edit story status                                │
│   ✗ CANNOT change story priority                            │
│   ✗ CANNOT change release dates                             │
│   ✗ CANNOT delete stories                                   │
│   ✗ CANNOT edit release metadata (except notes)             │
│                                                              │
│   Dashboard: "Completed Release · [Date]"                   │
│   (Grayed out, historical reference section)               │
│                                                              │
│   Metadata:                                                 │
│   • Milestone push ID                                       │
│   • Completed timestamp                                     │
│   • Admiral approval chain                                  │
│   • Story count + coverage                                  │
│   • Crew learnings archive path (RAG)                       │
│                                                              │
│   Duration: Historical indefinitely                         │
└──────────────────────────────────────────────────────────────┘
         ↓ [exceptions only; rare]
         │ [Admiral explicitly authorizes reopening]
         │ [rare; requires override + RAG logging]
         ↓
┌──────────────────────────────────────────────────────────────┐
│    REOPENED (COMPLETED → ACTIVE, via Admiral Override)       │
│                                                              │
│   • Release moves back to ACTIVE state                      │
│   • Stories become editable again                           │
│   • Admiral decision + timestamp logged to RAG              │
│   • Flag in Aha: "Reopened by Admiral" (timestamp)         │
│                                                              │
│   Use Case (Example):                                       │
│   - Story was shipped in release but has a blocker          │
│   - Need to add a hotfix story to the same release          │
│   - Admiral authorizes reopening                            │
│   - Run Phase 3-4 again (milestone_push re-execute)        │
│                                                              │
│   ⚠️  RARE (logged + audited)                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Detailed State Definitions

### State 1: ACTIVE RELEASE

**When:** Release created and throughout sprint (Geordi manages)

**Aha Status:** "Active" or "In Progress" (implementation depends on Aha config)

**Aha Permissions Model:**
```
Role: Crew (story crew members)
  Can: View release, add stories to release, update story status/priority
  
Role: Geordi (release manager)
  Can: Create release, edit release dates/name, manage story assignments
  Can: Auto-transition to COMPLETED when milestone_push executes
  
Role: Admiral (business)
  Can: View release, request changes (async, via comments)
  Cannot: Modify release/stories directly (governance)
```

**Dashboard UI:**
- Listed under "Active Releases"
- Shows story list with counts (total, complete, shipped)
- Progress bar: # shipped / # total
- Action: "View Details", "Milestone Push" (if eligible)
- Edit enabled: true (add stories, adjust dates)

**Transition to COMPLETED:**
- Triggered by: Riker initiates `milestone_push` tool
- Conditions:
  - All stories in release are "Shipped" (Tier 2)
  - WorfGate confirms (no automation conflicts)
  - Admiral approves
- Action: `updateReleaseStatus(releaseId, 'Completed', {approvedBy: admiral})`

---

### State 2: COMPLETED RELEASE (Read-Only)

**When:** `milestone_push` Phase 4 executes successfully

**Aha Status:** "Completed" (new; custom field may be added)

**Aha Permissions Model (Read-Only Enforcement):**
```
Role: Any crew member
  Can: View release, view stories (for reference)
  Cannot: Add stories, edit story status, modify release dates
  
Role: Geordi
  Can: View release, view stories
  Cannot: Modify anything (locked)
  Can: Unlock via Admiral override (see State 3)
  
Role: Admiral
  Can: View release, request reopening
  Can: Override read-only lock (rare, logs to RAG)
```

**How to Implement Read-Only in Aha:**
- **Option A (Preferred):** Use Aha API `updateRelease` with `locked: true` custom field
- **Option B:** Create Aha automation rule: "If status = Completed, then prevent edits"
- **Option C:** Aha permission group: Create "Completed-Release-Viewers" that excludes edit scope

**Recommendation:** Option A + Option B (defense in depth)

**Metadata (Aha Custom Fields):**
```
Field: Ship Milestone ID (text)
  Value: push-20260716-001 (timestamp + sequence)
  
Field: Ship Timestamp (date)
  Value: 2026-07-16 15:00:00Z
  
Field: Ship Release Notes (long text)
  Value: Crew learnings summary + link to RAG
  
Field: Locked Until (date, optional)
  Value: [Admiral can override; set expiry]
  
Field: Reopened By Admiral (checkbox)
  Value: false (true if reopened; logged)
```

**Dashboard UI:**
- Listed under "Completed Releases" (collapsed by default)
- Shows release name, date, story count, completion timestamp
- "View Details" button (read-only detail page)
- "Release Notes" link (generated from crew learnings)
- "Archive" button (Uhura; moves to static historical section)
- Edit disabled: true (grayed out controls)

**Implications:**
1. **No New Stories:** Cannot add forgotten stories after release closes
2. **No Story Edits:** Cannot adjust acceptance criteria or move to different release
3. **No Date Changes:** Release dates are now historical, immutable
4. **No Priority Shifts:** Story order is locked (for release notes consistency)

**Exception Handling (Admiral Override):**
- Admiral can request Geordi to reopen release (rare)
- Reason: Story has blocker, hotfix needed, business priority change
- Process: Admiral posts reason in Aha comments → Geordi + Picard review → Decision
- If approved: Release moves to REOPENED state (see State 3)
- Logging: Audit trail in RAG (`admiral-release-reopen` tag)

---

### State 3: REOPENED RELEASE (Rare; Admiral Authorization)

**When:** Admiral authorizes reopening a COMPLETED release

**Aha Status:** "Active" again (state machine reversal)

**Process:**
1. Admiral posts comment in Aha release: "REQUEST: Reopen release [reason]"
2. Picard + Geordi review (post in Aha)
3. If approved:
   ```
   releaseStatus = Active
   releaseMetadata.reopenedBy = admiral
   releaseMetadata.reopenedAt = <timestamp>
   releaseMetadata.reopenReason = <comment>
   ```
4. Geordi can now add stories / adjust dates
5. Run `milestone_push` again (Phase 3-4) to re-finalize

**Logging (RAG):**
- Tag: `admiral-release-reopen-[releaseId]`
- Contains: Admiral decision, reason, stories added, new milestone push ID
- Purpose: Audit trail for why a release was reopened (rare business decision)

**Dashboard UI:**
- Shows "Reopened by Admiral" badge (yellow warning)
- Timestamp and reason visible
- Return to normal Active Release UI (editable)

---

## Read-Only Enforcement Architecture

### Aha API Level (Definitive Control)

```typescript
interface UpdateReleaseParams {
  releaseId: string;
  updates: {
    status?: 'active' | 'completed';
    lockedUntil?: Date; // Admiral can override
    customFields?: {
      shipMilestoneId?: string;
      shipTimestamp?: Date;
      shipReleaseNotes?: string;
      reopenedByAdmiral?: boolean;
    };
  };
  gate?: {
    worfgateConfirmed?: boolean;
    admiralApproved?: boolean;
  };
}

async function updateReleaseStatus(
  releaseId: string, 
  status: 'completed',
  { approvedBy }: { approvedBy: CrewId }
): Promise<void> {
  // 1. Fetch release from Aha
  const release = await ahaClient.getRelease(releaseId);
  
  // 2. Validate all stories are Shipped
  for (const story of release.stories) {
    if (story.status !== 'Shipped') {
      throw new Error(`Story ${story.id} not Shipped; cannot complete release`);
    }
  }
  
  // 3. Update Aha
  await ahaClient.updateRelease(releaseId, {
    status: 'completed', // Aha-native
    customFields: {
      shipMilestoneId: `push-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      shipTimestamp: new Date(),
      shipReleaseNotes: generateReleaseNotes(release),
    },
  });
  
  // 4. Supabase: record completion
  await upsertMilestoneCompletion({
    releaseId,
    completedAt: new Date(),
    approvedBy,
    locked: true,
  });
  
  // 5. Dashboard: cache invalidation
  await invalidateDashboardCache(`release-${releaseId}`);
}
```

### Dashboard Level (UI-Level Enforcement)

```typescript
// pages/story/[releaseId].tsx — Release detail view

export function ReleaseDetailPage({ releaseId }: Props) {
  const [release, setRelease] = useState<Release>(null);
  const isCompleted = release?.status === 'completed';
  
  return (
    <div>
      <header>
        <h1>{release?.name}</h1>
        {isCompleted && (
          <Badge variant="secondary">
            ✓ Completed · {formatDate(release.customFields.shipTimestamp)}
          </Badge>
        )}
      </header>
      
      <StoryList 
        stories={release.stories}
        readOnly={isCompleted} {/* ← Disable edit controls */}
      />
      
      {isCompleted && (
        <div className="info-box">
          <p>
            This release is completed and read-only. Stories cannot be added, edited, or removed.
          </p>
          <Link href={`/release/${releaseId}/release-notes`}>
            📄 View Release Notes & Crew Learnings
          </Link>
          <p className="text-sm text-gray-500">
            Reopening requires Admiral authorization (rare). 
            <Link href={`#request-reopen`}> Request Override</Link>
          </p>
        </div>
      )}
      
      {/* Admiral override request form */}
      {isCompleted && (
        <AdminActionForm
          action="reopen-release"
          releaseId={releaseId}
          description="Request Admiral approval to reopen this completed release"
        />
      )}
    </div>
  );
}
```

### Aha Automation Rules (Belt-and-Suspenders)

```yaml
# Aha Workflow Automation: Prevent edits to Completed releases

Automation Rule: "Prevent story edits in Completed releases"
  Trigger: When story.release.status = 'completed'
  Condition: User attempts to edit story OR release
  Action: BLOCK and display message
  Message: "This release is completed and read-only. Stories cannot be modified."
  
Automation Rule: "Prevent adding stories to Completed releases"
  Trigger: When release.status = 'completed'
  Condition: User attempts to add a story to this release
  Action: BLOCK
  Message: "Completed releases are read-only. Request Admiral authorization to reopen."
```

---

## Release Notes Generation

**When:** After `milestone_push` Phase 4 completes

**Generated By:** Uhura (communications lead), called by `milestone_push` tool

**Content (Markdown):**
```markdown
# Release Notes: [Release Name]

**Released:** 2026-07-16 | **Stories:** 12 | **Status:** ✓ Complete

## Highlights
- [Crew-generated summary of major features/improvements]

## Stories Shipped
1. STORY-123: Feature X
2. STORY-124: Bug Fix Y
3. ...

## Technical Summary (Crew Learnings)
[Indexed from RAG; crew analysis of architecture decisions, gotchas, opportunities]

## Archive Link
📚 Full crew execution records: [RAG Link]
```

**Storage:**
- Aha custom field: `shipReleaseNotes` (markdown)
- Dashboard: `/release/[releaseId]/release-notes` (rendered HTML)
- RAG: Vectorized for future retrieval

---

## Backward Compatibility & Migration

**Existing Active Releases:**
- Can be completed via `milestone_push` without any changes
- Custom fields added automatically (null if pre-existing)
- Dashboard shows completed status with dates

**Existing Completed Releases (if any):**
- Assume they're read-only (no breaking changes)
- Admiral can reopen if needed (rare)

**No Changes Required:**
- Existing story/release Aha APIs work unchanged
- Crew workflows unchanged (Geordi still manages assignments)
- Dashboard adapts gracefully (read-only badge + restricted edits)

---

## Test Cases (Geordi's Validation)

```typescript
describe('Release Read-Only State Model', () => {
  
  it('should prevent adding stories to Completed release', async () => {
    const release = await getRelease('RELEASE-COMPLETED');
    assert(release.status === 'completed');
    
    expect(() => addStoryToRelease(release.id, newStory)).toThrow(
      'Cannot add story to completed release'
    );
  });

  it('should prevent editing story in Completed release', async () => {
    const story = await getStory('STORY-123');
    assert(story.release.status === 'completed');
    
    expect(() => updateStory(story.id, { priority: 'high' })).toThrow(
      'Release is read-only'
    );
  });

  it('should prevent changing release dates for Completed release', async () => {
    const release = await getRelease('RELEASE-COMPLETED');
    
    expect(() => updateRelease(release.id, { 
      endDate: new Date() 
    })).toThrow(
      'Release is locked'
    );
  });

  it('should allow Admiral to reopen Completed release', async () => {
    const release = await getRelease('RELEASE-COMPLETED');
    
    await adminReopenRelease(release.id, { reason: 'Critical hotfix needed' });
    
    const updated = await getRelease(release.id);
    assert(updated.status === 'active');
    assert(updated.reopenedByAdmiral === true);
  });

  it('should lock editing during milestone_push Phase 4', async () => {
    const release = await getRelease('RELEASE-ACTIVE');
    const milestoneId = await milestonePush(release.id);
    
    const completed = await getRelease(release.id);
    assert(completed.status === 'completed');
    assert(completed.customFields.shipMilestoneId === milestoneId);
    
    expect(() => addStoryToRelease(completed.id, newStory)).toThrow();
  });

  it('should generate release notes with crew learnings', async () => {
    const release = await getRelease('RELEASE-COMPLETED');
    const notes = await generateReleaseNotes(release.id);
    
    assert(notes.includes('## Stories Shipped'));
    assert(notes.includes('## Technical Summary'));
    assert(notes.includes(release.customFields.shipReleaseNotes));
  });

  it('should log Admiral override to RAG', async () => {
    const release = await getRelease('RELEASE-COMPLETED');
    
    await adminReopenRelease(release.id, { reason: 'Bug found post-ship' });
    
    const ragEntry = await getRagEntry('admiral-release-reopen-' + release.id);
    assert(ragEntry.reason === 'Bug found post-ship');
    assert(ragEntry.reopenedBy === 'admiral');
  });

});
```

---

## Approval & Sign-Off

**Geordi's Validation:** ✅ Approved
- Read-only model is operationally sound
- Aha integration points are clear
- Dashboard UI mockups ready for implementation

**Riker's Coordination:** ✅ Reviewed
- Release state is orthogonal to story state (per 3-tier model)
- `milestone_push` Phase 4 correctly updates release status
- No conflicts with story lifecycle

**Worf's Governance Review:** ✅ Approved
- Admiral override path is logged and auditable
- WorfGate gates don't conflict with release completion
- Read-only enforcement is properly gated

**Picard's Final Sign-Off:** ✅ Approved
- Release lifecycle is complete and coherent
- Admiral authority is properly respected
- Ready for Phase 1 implementation

---

## Next Actions

1. **Geordi:** Implement `updateReleaseStatus('completed')` in Aha client
2. **Uhura:** Design and implement release notes generation
3. **Dashboard Team:** Add read-only state UI (badge, locked controls, release notes page)
4. **Data:** Add Aha automation rules for Completed releases (prevention)
5. **Worf:** Test WorfGate gates do not interfere with release completion

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-16 | Geordi | Initial release lifecycle design |

**RAG Tag:** `milestone-push-clarification-release-lifecycle`  
**Related:** [Riker's Story Lifecycle](story-lifecycle-3tier.md) | [Worf's Approval Gates](approval-gates.md) | [Data's Aha Automation Audit](aha-workflow-rules.md)
