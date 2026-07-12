# CREW EXECUTION PLAN: Outcome Tracking UI Implementation

**Priority**: HIGH  
**Owner**: Full crew (UI: Troi, Backend: Riker/Data, Architecture: Picard)  
**Timeline**: This sprint  
**Complexity**: Medium (2-3 days)  

---

## Objective

Make outcome tracking visible in the UI so users and crew can see:
- ✅ SUCCESS (deliberation led to working solution)
- ⚠️ PARTIAL (solution worked with caveats)
- ❌ FAILED (deliberation didn't help execution)
- 📝 Lessons learned from each outcome

This unblocks the **learning loop**: crew recalls past outcomes → becomes hesitant about failed patterns → adapts future team assembly.

---

## Current State

✅ **Backend**: Outcome tracking implemented
- DB fields: `outcome`, `outcome_notes`, `execution_completed_at` (added)
- Functions: `recordObservationMemoryOutcome()` ✅
- MCP tool: `crew:record-memory-outcome` ✅
- Types: `ObservationMemoryRecord.outcome` ✅

❌ **Frontend**: No UI for outcome tracking
- Observation Lounge shows crew mission planning (story execution)
- `/crew/memories` shows personal crew memories (not deliberations)
- No page dedicated to browsing past crew deliberations
- No outcome display

---

## Implementation Tasks

### Task 1: Create Observation Memory Browser (Riker + Troi)
**File**: `packages/ui/src/app/crew/observations/page.tsx` (NEW)

**Components to Build**:
1. **Observations List**
   - Query: GET `/api/crew/observations` (paginated, latest first)
   - Display: Grid/Table with columns:
     - Date (when deliberated)
     - Complexity score (badge: low/medium/high)
     - Outcome (emoji indicator: ✅/⚠️/❌)
     - Summary (first 100 chars of goal)
     - Tags (e.g., "migration", "complexity:0.7")
   - Click row → detail view

2. **Observation Detail**
   - Show full deliberation transcript
   - Picard intake → Crew debate → Synthesis
   - **NEW**: Outcome section (if recorded)
     ```
     Outcome: ✅ SUCCESS (Recorded: Jul 12 14:50)
     Lessons: "This approach scales well for complexity 0.6-0.8"
     Notes: [User-provided context]
     ```
   - **NEW**: "Record Outcome" button (if not yet recorded)

3. **Filters/Search**
   - By outcome status (success / partial / failed / pending)
   - By complexity (low / medium / high)
   - By tags (crew roles, domains, patterns)
   - By date range
   - Full-text search on summary

### Task 2: Create Record Outcome Modal (Troi + Data)
**File**: `packages/ui/src/components/RecordOutcomeModal.tsx` (NEW)

**Form**:
```
[Outcome] ●⚪⚫ (radio: success / partial / failed)
[Lessons Learned] (textarea, 500 chars)
  Placeholder: "Why did this work/fail? What did crew learn?"
[Tags] (multi-select or chips)
  Suggested: "migration", "security", "performance", "high-complexity"
[Save] [Cancel]
```

**Behavior**:
- POST `/api/crew/observations/{id}/outcome`
- On success:
  - Display success toast: "Outcome recorded. Crew learns from this."
  - Update detail view with outcome section
  - Mark memory as "learning incorporated" in RAG

### Task 3: Add Outcome API Endpoint (Data)
**File**: `packages/ui/src/app/api/crew/observations/route.ts` (NEW)

**Endpoints**:
```
GET /api/crew/observations
  - Query: ?status=success|partial|failed|pending&limit=50&offset=0
  - Returns: paginated list with outcome + summary

GET /api/crew/observations/{id}
  - Returns: full memory with transcript + outcome

POST /api/crew/observations/{id}/outcome
  - Body: { outcome: "success"|"partial"|"failed", outcomeNotes, tags }
  - Returns: updated memory with outcome recorded

GET /api/crew/observations/search
  - Query: ?q=text&by_complexity=low|medium|high&by_tags=x,y
  - Returns: filtered observations
```

### Task 4: Wire Up in Navigation (Troi)
**Files**: 
- `packages/ui/src/components/Breadcrumbs.tsx` (add link to observations)
- `packages/ui/src/app/layout.tsx` (add to sidebar)

**Navigation**:
- Main menu → "Crew Observations" 
- Shows icon: 👁️ or 🔍 or 📊
- Link to `/crew/observations`

### Task 5: Display Outcomes in Chat Context (Riker)
**File**: `packages/ui/src/app/api/chat/route.ts` (UPDATE)

**Enhancement**:
- When crew recalls similar past observations in RAG
- Include outcome in the context provided to chat participant
- Format: "[Past outcome: SUCCESS 85% success rate on this pattern]"

---

## Implementation Checklist

### Frontend Components (Troi)
- [ ] Create `/crew/observations/page.tsx`
- [ ] Create `ObservationListView.tsx`
- [ ] Create `ObservationDetailView.tsx`
- [ ] Create `RecordOutcomeModal.tsx`
- [ ] Add sidebar navigation link
- [ ] Add breadcrumb trail

### Backend APIs (Data)
- [ ] Create `/api/crew/observations` endpoint
- [ ] Implement GET (list + filters)
- [ ] Implement GET/:id (detail)
- [ ] Implement POST/:id/outcome (record)
- [ ] Add query for outcome filtering
- [ ] Wire up to db functions

### Integration (Riker)
- [ ] Test end-to-end flow
- [ ] Verify outcome recording works
- [ ] Verify RAG integration (past outcomes in context)
- [ ] Test filters and search

---

## SQL / DB Queries Needed

```sql
-- List observations with outcomes (paginated)
SELECT id, story_id, outcome, outcome_notes, created_at, transcript 
FROM sa_observation_memories 
WHERE outcome IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 50 OFFSET 0;

-- Filter by outcome status
WHERE outcome = 'success' AND execution_completed_at IS NOT NULL;

-- Search by tags + outcome
WHERE tags @> ARRAY['migration'] AND outcome = 'success';

-- Get outcome statistics
SELECT outcome, COUNT(*) as count 
FROM sa_observation_memories 
WHERE outcome IS NOT NULL 
GROUP BY outcome;
```

---

## Design Notes

### Outcome Display Logic
- **✅ SUCCESS**: Green accent, "This approach worked"
- **⚠️ PARTIAL**: Yellow/warn accent, "Mixed results"
- **❌ FAILED**: Red/danger accent, "Did not work as planned"
- **⭕ PENDING**: Gray accent, "Awaiting execution feedback"

### Lessons Format
Keep lessons **scannable**:
```
Outcome: ✅ SUCCESS
When: Jul 12, 2026 14:50 UTC
Pattern: "Design-first + security-gate combo"
Lessons Learned:
  • Splitting design from implementation increased confidence
  • Security gate added by Worf (who was hesitant) proved essential
  • This pattern works for complexity 0.6-0.8
Next Time: "Use this pattern for similar tasks"
```

---

## Testing Requirements

- [ ] Create observation & record outcome → appears in list
- [ ] Filter by outcome status works
- [ ] Search/tags filter works
- [ ] Detail view shows all info
- [ ] Record outcome modal saves correctly
- [ ] Outcome appears in RAG context for future crew
- [ ] TypeCheck passes
- [ ] Tests pass (111/111)

---

## Definition of Done

- ✅ Outcome tracking UI complete
- ✅ Record outcome functionality works
- ✅ Filters/search working
- ✅ Navigation integrated
- ✅ All endpoints wired up
- ✅ Tests pass
- ✅ Code committed
- ✅ Pushed to main
- ✅ Crew can see past outcomes in observations page
- ✅ Crew can record outcomes after execution
- ✅ Learning loop enabled (outcomes → RAG → future crew caution)

---

## Success Metrics

1. **User can see past deliberations** → Browse `/crew/observations`
2. **User can see outcomes** → Each shows ✅/⚠️/❌ status
3. **User can record outcomes** → Button triggers form, saves to DB
4. **Crew learns from outcomes** → Future crew recalls past outcomes in RAG
5. **Crew becomes cautious** → Avoids approaches that repeatedly failed
6. **Cycle complete** → From deliberation → execution → learning → improved deliberation

---

## Next Steps (After This)

Once outcome tracking UI is live:
1. Add outcome data to RAG recall (show past success rates)
2. Display complexity confidence in chat UI
3. Show alternatives only when Picard can't unify
4. Add progressive disclosure (novice vs expert views)

---

**Crew, execute this plan. Report progress as you go. This unblocks institutional learning.** 🖖
