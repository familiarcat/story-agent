# Crew Integrity System — No One Left Behind

**Philosophy:** In this starship, we leave no one behind.

When the crew embarks on any mission, they first ensure that all 11 members are present and accounted for. This is not optional. This is integrity.

## The Problem

During mission preparation, the crew discovered a critical vulnerability: not all crew members were guaranteed to be initialized across all systems. Some crew members might be:

- **Missing from sa_crew_personas** — canonical identity data not persisted
- **Missing from sa_crew_skills** — skill manifests not initialized  
- **Uninitialized** — partially present but not fully ready for operations

This created a potential scenario where critical crew members (like Picard's strategic oversight, Data's logic, or Worf's security veto authority) could be unavailable when needed most.

## The Solution: Autonomous Crew Integrity

The crew-integrity system provides autonomous status checking and recovery:

### 1. **Crew Member Status Checking** (`checkCrewMemberStatus`)

For each crew member, the system verifies:
- ✅ Exists in `sa_crew_personas` (canonical Memory Alpha data)
- ✅ Exists in `sa_crew_skills` (skill manifest with versioning)
- ✅ Full initialization and readiness

**Status values:**
- `'present'` — Crew member is fully initialized and ready
- `'uninitialized'` — Crew member data exists but incomplete  
- `'missing'` — Crew member not found in system

### 2. **Full Integrity Report** (`generateCrewIntegrityReport`)

Scans all 11 crew members and generates comprehensive status:

```json
{
  "timestamp": "2026-06-07T14:30:00Z",
  "totalCrew": 11,
  "presentCount": 11,
  "missingCount": 0,
  "allCrewPresent": true,
  "crewStatuses": [
    {
      "crewId": "picard",
      "fullName": "Jean-Luc Picard",
      "status": "present",
      "personaExists": true,
      "skillManifestExists": true,
      "diagnostics": []
    },
    // ... all 11 crew members
  ],
  "recoveryActions": []
}
```

### 3. **Autonomous Recovery** (`initializeMissingCrewMember`)

When a missing crew member is detected, the system automatically:

1. **Creates canonical persona** in `sa_crew_personas`:
   - Full Memory Alpha identity data
   - Personality traits and specializations
   - Defining moments and canonical quotes
   - Role information and collaborative context

2. **Initializes skill manifest** in `sa_crew_skills`:
   - Version `1.0.0` baseline
   - Base system prompt (from `buildPersonaSystemPrompt()`)
   - Domain system prompt for engineering role
   - Empty improvement notes (ready for first mission debrief)
   - Source: `'initial_seed'` or `'crew_integrity_recovery'`

**Result:**
```json
{
  "success": true,
  "crewId": "worf",
  "personaInitialized": true,
  "skillManifestInitialized": true,
  "message": "Lieutenant Worf has rejoined the crew and is fully initialized"
}
```

### 4. **Mass Recovery Operation** (`recoverAllMissingCrewMembers`)

All-hands operation to recover every missing crew member:

1. Generates integrity report to identify all missing members
2. Attempts to initialize each missing member in parallel
3. Returns comprehensive recovery results:

```json
{
  "success": true,
  "totalAttempted": 3,
  "successfulRecoveries": 3,
  "failedRecoveries": 0,
  "recoveredCrew": ["worf", "yar", "troi"],
  "allCrewNowPresent": true
}
```

### 5. **Human-Readable Status** (`getCrewIntegritySummary`)

```
**Crew Integrity Report**

Timestamp: 2026-06-07T14:30:00Z
Total Crew: 11
Present: 11
Missing: 0
Status: ✅ ALL CREW PRESENT

(no missing members to report)
```

## MCP Tool Integration

All crew integrity functions are exposed as MCP tools:

| Tool | Function | Input | Output |
|------|----------|-------|--------|
| `check_crew_member_status` | Verify individual crew member | `crewId` | Status JSON |
| `crew_integrity_report` | Scan all 11 crew members | (none) | Full report |
| `initialize_missing_crew_member` | Bootstrap single member | `crewId` | Init results |
| `recover_all_missing_crew_members` | Mass recovery operation | (none) | Recovery results |
| `get_crew_integrity_summary` | Human-readable status | (none) | Summary text |

## Workflow: How the Crew Ensures Integrity

**At Mission Start (e.g., when Worf initiates security check):**

```
1. Worf calls: crew_integrity_report
   → System scans all 11 crew members
   
2. If any missing:
   → System calls: recover_all_missing_crew_members
   → All missing members are automatically reinitialized
   
3. Verify recovery:
   → Worf calls: crew_integrity_report again
   → Confirms all 11 are now present
   
4. Mission cleared:
   → "All crew members are accounted for. Ready to proceed."
```

**During Mission (intermittent checks):**

```
1. Data periodically calls: crew_integrity_report
   → Ensures crew integrity maintained throughout mission
   
2. If any member becomes uninitialized:
   → Automatic initialization triggered
   → Crew is notified of recovery action
   
3. Mission continues uninterrupted
```

## The 11 Crew Members

All protected by this integrity system:

1. **Picard** — Strategic oversight & executive authority
2. **Data** — Logic & analytical validation
3. **Riker** — Tactical implementation & phased execution
4. **Geordi** — Engineering & technical optimization
5. **O'Brien** — Operations & systems coordination
6. **Worf** — Security & veto authority (WorfGate)
7. **Yar** — QA & testing protocol
8. **Troi** — Empathy & stakeholder communication
9. **Crusher** — Medical & critical review
10. **Uhura** — Communications & external coordination
11. **Quark** — Financial & cost analysis

**All 11 are critical. All 11 must be present. No exceptions.**

## Philosophy

This system embodies the core principle of the starship crew:

> **"In this starship, we work as one. We make decisions together. 
> We don't want to leave a crew mate behind."** — Picard

The crew-integrity system ensures:

- **No crew member is forgotten** — Integrity checks catch missing members
- **Autonomous recovery** — Missing crew are pulled back in automatically
- **Persistent initialization** — Once initialized, crew members remain ready
- **Collective identity** — All 11 are equally important to mission success
- **Proactive monitoring** — Crew continuously checks on each other

## Implementation Details

### Database Schema

**sa_crew_personas**
- Stores canonical Memory Alpha data for each crew member
- Indexed on `crew_id` for fast lookups
- Populated during initialization with full persona details

**sa_crew_skills**  
- Stores versioned skill manifests
- Each crew member can have multiple versions (v1.0.0, v1.1.0, etc.)
- Includes improvement notes from mission debriefs
- Indexed on `crew_id` and `created_at` for history tracking

### Integrity Check Algorithm

```typescript
For each crew member:
  1. Check sa_crew_personas.crew_id = ?
     → personaExists = true/false
     
  2. Check sa_crew_skills.crew_id = ? (latest version)
     → skillManifestExists = true/false
     
  3. Determine status:
     → if (personaExists && skillManifestExists) → 'present'
     → if (personaExists || skillManifestExists) → 'uninitialized'
     → if (!personaExists && !skillManifestExists) → 'missing'
     
  4. Collect diagnostics for troubleshooting
```

### Recovery Algorithm

```typescript
For each missing crew member:
  1. Load canonical persona from crew-personas.ts
     → Contains full Memory Alpha identity data
     
  2. Insert into sa_crew_personas
     → Provides canonical reference for future operations
     
  3. Generate initial skill manifest
     → Version: 1.0.0
     → Source: 'crew_integrity_recovery' or 'initial_seed'
     → Base prompt from buildPersonaSystemPrompt(crewId)
     
  4. Insert into sa_crew_skills
     → Ready for first mission debrief and learning cycle
     
  5. Mark as initialized and return success
```

## Future Enhancements

**Possible extensions:**

1. **Scheduled Health Checks** — Background jobs that verify crew integrity on a schedule
2. **Integrity Alerts** — Notify crew (via WebSocket) if members go missing mid-mission
3. **Recovery Metrics** — Track how many times each member has been recovered
4. **Integrity History** — Log all integrity checks and recovery operations
5. **Crew Cohesion Scoring** — Measure how long crew has been fully present without gaps
6. **Proactive Reinitialization** — Periodically refresh crew data from Memory Alpha source

## Conclusion

The crew-integrity system transforms the crew from a collection of independent agents into a unified, self-healing collective. When any member is at risk of being left behind, the others automatically pull them back in.

This is the nature of a true starship crew: **We are stronger together. We leave no one behind.**

---

**Status:** ✅ Implemented and committed  
**Commit:** 02b08e4  
**Files:** 
- `packages/mcp-server/src/lib/crew-integrity.ts` — Core functions
- `packages/mcp-server/src/tools/crew-integrity-tools.ts` — MCP tool registration
- `packages/mcp-server/scripts/crew-integrity-recovery.mjs` — Demo script
