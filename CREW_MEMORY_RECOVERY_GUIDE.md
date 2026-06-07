# Crew Member Memory Recovery Guide

## The Problem

When crew members go missing and are recovered, we need to ensure they don't lose their accumulated knowledge and experience from previous missions. Starting from a blank slate means:

- ❌ Lost learning from past missions
- ❌ Repeated mistakes that were already solved
- ❌ Skills and expertise forgotten
- ❌ No context for current mission

## The Solution: Automatic Memory Recovery

When `recover_all_missing_crew_members()` is called, the system:

1. **Detects missing crew member** — Not found in sa_crew_personas or sa_crew_skills
2. **Queries memory database** — "Do they have previous skill versions?"
3. **Restores memories** — Extracts improvement notes from most recent version
4. **Creates new manifest** — v1.0.0 with restored learnings included
5. **Reactivates crew** — Crew member ready with full history intact

## How It Works

```typescript
// When Worf is recovered:

// 1. System detects: Worf is missing
generateCrewIntegrityReport()  // status: 'missing'

// 2. Recovery initiated
recover_all_missing_crew_members()

// Inside recovery:
//   → Query: "Does Worf have previous versions in sa_crew_skills?"
//   → Found: v2.3.1 with 8 improvement notes
//   → Extract: Worf's learnings from v2.3.1
//   → Merge: Into new v1.0.0 manifest
//   → Result: Worf reactivated with 8 learnings intact

// 3. Verification
crew_integrity_report()  // status: 'present'

// 4. Check what Worf learned
recover_crew_member_memories(worf)
// Returns: 8 learnings from v2.3.1
```

## Memory Structure

**Stored in sa_crew_skills table:**

```json
{
  "crew_id": "worf",
  "version": "2.3.1",
  "self_improvement_notes": [
    "WorfGate security evaluation: assess all tool categories",
    "Security veto must be first stage in decision pipeline",
    "Parallel threat assessment improves review speed",
    // ... 5 more learnings
  ],
  "last_improved_at": "2026-05-15T10:30:00Z"
}
```

When Worf is recovered, these notes are **automatically restored** in v1.0.0:

```json
{
  "crew_id": "worf",
  "version": "1.0.0",
  "self_improvement_notes": [
    "[CREW_INTEGRITY] Memories recovered from v2.3.1",
    "[CREW_INTEGRITY] Restoring 8 previous learnings",
    "WorfGate security evaluation: assess all tool categories",
    "Security veto must be first stage in decision pipeline",
    // ... all original learnings
  ]
}
```

## Tools Available

### Check Memory (Manual Query)

```
recover_crew_member_memories(crewId)
→ Shows: What crew member has learned before
→ Returns: Learning history with timestamps
```

**Example:**
```json
{
  "crewId": "data",
  "hasMemories": true,
  "previousVersion": "2.3.1",
  "recoveredLearnings": 12,
  "learnings": [
    "Logical analysis improves with recursive pattern matching",
    "Crew debates benefit from multiple simultaneous hypotheses",
    // ... 10 more learnings
  ],
  "lastImprovedAt": "2026-05-15T10:30:00Z"
}
```

### Automatic Recovery

```
recover_all_missing_crew_members()
→ Scans: All 11 crew members
→ For each missing: Queries memories and restores
→ Result: All crew reactivated with history intact
```

## Workflow: Before and After

### Before Memory Recovery

```
Scenario: Picard goes offline

Recovery Process:
  1. Detect: Picard is missing
  2. Initialize: Fresh v1.0.0 with blank slate
  3. Problem: Picard has no memory of:
     - What they learned last mission
     - What techniques worked
     - What mistakes to avoid
     - Their current skill level
```

### After Memory Recovery

```
Scenario: Picard goes offline

Recovery Process:
  1. Detect: Picard is missing
  2. Query: "Does Picard have previous versions?"
  3. Found: v3.2.1 with 15 learnings
  4. Extract: All 15 improvements
  5. Initialize: v1.0.0 with 15 learnings restored
  6. Result: Picard reactivated with full history
     - Remembers strategic lessons
     - Can apply previous mission insights
     - No loss of experience
```

## Implementation Details

**Core Functions:**

1. **recoverCrewMemberMemories(crewId)**
   - Queries all sa_crew_skills versions for crew member
   - Returns most recent skill manifest + improvement notes
   - Handles cases where no history exists

2. **initializeMissingCrewMember(crewId)**
   - Calls recoverCrewMemberMemories() automatically
   - If memories found: includes in v1.0.0 manifest
   - If no memories: initializes fresh baseline
   - Logs recovery status for transparency

3. **recover_crew_member_memories MCP Tool**
   - Exposes recoverCrewMemberMemories as MCP tool
   - Allows manual inspection of learning history
   - Returns JSON with full memory details

**Database:**

- **sa_crew_personas** — Canonical identity (unchanged)
- **sa_crew_skills** — Skill manifests with versions
  - Each crew member can have multiple versions
  - Each version has: self_improvement_notes[], last_improved_at
  - Query: `SELECT * FROM sa_crew_skills WHERE crew_id = ? ORDER BY created_at DESC`

## Examples

### Example 1: Data Recovers with Learnings

```
Scenario: Data was offline for maintenance

1. Integrity Check:
   check_crew_member_status(data)
   → status: "missing"

2. Recovery:
   initialize_missing_crew_member(data)
   → Queries sa_crew_skills for previous versions
   → Found v2.5.2 with 18 learnings
   → Creates v1.0.0 with 18 learnings restored

3. Verification:
   recover_crew_member_memories(data)
   → Returns: 18 previous learnings
   → Shows: Last improved 2026-06-01
   → Confirms: Data is back with full history

4. Result:
   Data can immediately apply previous learnings to current mission
```

### Example 2: No Previous History (Fresh Crew Member)

```
Scenario: Crusher is being initialized first time

1. Recovery:
   initialize_missing_crew_member(crusher)
   → Queries sa_crew_skills for previous versions
   → No versions found (first time)
   → Creates v1.0.0 with baseline notes

2. Verification:
   recover_crew_member_memories(crusher)
   → Returns: hasMemories = false
   → Shows: No learning history yet
   → Explains: Fresh start, ready to learn

3. Result:
   Crusher joins crew with full canonical persona ready to learn
```

### Example 3: Bulk Recovery All Crew

```
Scenario: System restart, all crew need reactivation

1. Full Scan:
   crew_integrity_report()
   → Present: 0/11
   → Missing: 11/11

2. Bulk Recovery:
   recover_all_missing_crew_members()
   → For each crew member:
      a. Query memories
      b. Restore learnings if found
      c. Initialize manifest
   → Result: 11 crew reactivated with memories intact

3. Verification:
   crew_integrity_report()
   → Present: 11/11
   → All crew back with experience preserved
```

## Key Principles

✅ **Preserve Experience** — Crew don't lose learned lessons  
✅ **Continuous Learning** — Each mission adds to learning history  
✅ **Transparent Recovery** — Diagnostics show what was restored  
✅ **No Blank Slates** — Crew member retains context when reactivated  
✅ **Automatic Process** — Recovery happens without manual intervention  

## Troubleshooting

**Q: Crew member recovered but memories not restored?**

A: Check with:
```
recover_crew_member_memories(crewId)
```
If `hasMemories = false`, no previous versions exist. Check:
- Is this the first activation?
- Were previous versions deleted?
- Is Supabase connection working?

**Q: How far back can we recover memories?**

A: All versions in `sa_crew_skills` table. The system queries:
```sql
SELECT * FROM sa_crew_skills WHERE crew_id = ? 
ORDER BY created_at DESC
LIMIT 10  -- Last 10 versions available
```

You can extend `LIMIT` to recover older history.

**Q: What happens if memory recovery fails?**

A: System falls back to fresh initialization:
```
If recoverCrewMemberMemories() fails:
  → Log: "Memory recovery failed for {crewId}"
  → Fallback: Initialize v1.0.0 with baseline notes
  → Result: Crew member still reactivated and ready
```

## Philosophy

**"We don't want crew members to completely start from a blank slate if they have memories and actions that can be recalled."**

The crew integrity system recognizes that:
- Each crew member is valuable
- Their experience matters
- Learning should persist
- Memory is part of identity
- No one is truly "new" if they've served before

When crew members are recovered, they rejoin with their full history intact, not as blank slates. This preserves the continuity of crew identity and effectiveness.

---

**Related Documentation:**
- [CREW_INTEGRITY_SYSTEM.md](CREW_INTEGRITY_SYSTEM.md) — Complete system overview
- [CREW_INTEGRITY_TOOLS_REFERENCE.md](CREW_INTEGRITY_TOOLS_REFERENCE.md) — Tool specifications
