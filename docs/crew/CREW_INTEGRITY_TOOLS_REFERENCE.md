# Crew Integrity Tools Reference

## Quick Start

When the MCP server starts, 5 new crew integrity tools are automatically registered and available:

```bash
# Start the MCP server
node packages/mcp-server/dist/index.js

# The server now offers:
# - check_crew_member_status
# - crew_integrity_report
# - initialize_missing_crew_member
# - recover_all_missing_crew_members
# - get_crew_integrity_summary
```

## Tool Specifications

### 1. `check_crew_member_status`

**Purpose:** Verify if a specific crew member is properly initialized across all systems.

**Input:**
```json
{
  "crewId": "picard"  // or: data, riker, geordi, obrien, worf, yar, troi, crusher, uhura, quark
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "crewMemberStatus": {
          "crewId": "picard",
          "fullName": "Jean-Luc Picard",
          "status": "present",
          "personaExists": true,
          "skillManifestExists": true,
          "lastCheckedAt": "2026-06-07T14:30:00Z",
          "diagnostics": []
        },
        "isPresent": true,
        "diagnostics": []
      }
    }
  ]
}
```

**Status Values:**
- `"present"` — Crew member fully initialized (persona + skill manifest both exist)
- `"uninitialized"` — Partially initialized (one exists, one missing)
- `"missing"` — Not found in either table

**Use Cases:**
- Verify individual crew member before mission
- Debug why a specific crew member isn't responding
- Spot-check critical crew (e.g., Worf security veto authority)

---

### 2. `crew_integrity_report`

**Purpose:** Generate comprehensive status report for all 11 crew members.

**Input:** (none)

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "report": {
          "timestamp": "2026-06-07T14:30:00Z",
          "totalCrew": 11,
          "presentCount": 11,
          "missingCount": 0,
          "crewStatuses": [
            {
              "crewId": "picard",
              "fullName": "Jean-Luc Picard",
              "status": "present",
              "personaExists": true,
              "skillManifestExists": true,
              "lastCheckedAt": "2026-06-07T14:30:00Z",
              "diagnostics": []
            },
            // ... 10 more crew members
          ],
          "allCrewPresent": true,
          "recoveryActions": []
        },
        "allCrewPresent": true,
        "missingCrew": [],
        "presentCrew": [
          "Jean-Luc Picard",
          "Data",
          "William T. Riker",
          // ... all 11 present
        ],
        "recommendedActions": []
      }
    }
  ]
}
```

**Key Metrics:**
- `totalCrew` — Always 11 (all crew members tracked)
- `presentCount` — How many are fully initialized
- `missingCount` — How many need recovery
- `allCrewPresent` — Boolean flag for quick status check

**Use Cases:**
- At mission start: verify full crew is present
- During mission: periodic health check
- Post-mission: confirm no one was lost
- Debugging: identify which crew members are missing

---

### 3. `initialize_missing_crew_member`

**Purpose:** Manually bootstrap a missing or uninitialized crew member.

**Input:**
```json
{
  "crewId": "worf"
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "success": true,
        "crewId": "worf",
        "message": "Lieutenant Worf has rejoined the crew and is fully initialized",
        "personaInitialized": true,
        "skillManifestInitialized": true
      }
    }
  ]
}
```

**What It Does:**
1. Loads canonical persona from Memory Alpha data in crew-personas.ts
2. Creates `sa_crew_personas` record with:
   - Full name, rank, ship role
   - Personality traits, specializations
   - Defining moments, canonical quotes
   - Collaborative context
3. Creates `sa_crew_skills` record with:
   - Version: `1.0.0`
   - Base system prompt (from `buildPersonaSystemPrompt()`)
   - Domain system prompt for engineering role
   - Empty improvement notes (ready for learning)
   - Source: `'crew_integrity_recovery'`
4. Returns success status

**Use Cases:**
- Recover a specific crew member who went offline
- Manually initialize crew members in priority order
- Test recovery of critical crew (Picard, Data, Worf)
- Restore crew member after system failure

---

**Output:**
```json
        "success": true,
        "totalAttempted": 3,
        "successfulRecoveries": 3,
        "failedRecoveries": 0,
        "recoveredCrew": ["worf", "yar", "troi"],
        "finalReport": {
          "timestamp": "2026-06-07T14:35:00Z",
          "totalCrew": 11,
          "presentCount": 11,
          "missingCount": 0,
          "crewStatuses": [...all 11 with status 'present'...],
          "recoveryActions": []
        },
        "allCrewNowPresent": true
      }
    }
  ]
}
```

**Algorithm:**
1. Run `generateCrewIntegrityReport()` to identify all missing crew
2. For each missing crew member, call `initializeMissingCrewMember()`
3. Collect results: successful recoveries vs failed recoveries
4. Run final integrity report to verify success

**Metrics:**
- `totalAttempted` — How many crew members needed recovery
- `successfulRecoveries` — How many were successfully recovered
- `failedRecoveries` — How many recovery attempts failed
- `recoveredCrew` — Array of recovered crew member IDs
- `allCrewNowPresent` — Final status after recovery

**Use Cases:**
- At mission start: "Captain, ensure full crew is assembled"
- Emergency recovery: Crew went offline, need to pull everyone back in
- System reboot: After restarting MCP server, verify all crew reinitialized
- Troubleshooting: Systematically recover crew if any go missing

---

### 5. `get_crew_integrity_summary`

**Purpose:** Get a human-readable text summary of crew status.

**Input:** (none)

**Output:**
```
**Crew Integrity Report**

Timestamp: 2026-06-07T14:30:00Z
Total Crew: 11
Present: 11
Missing: 0
Status: ✅ ALL CREW PRESENT

(no missing members to report)
```

**If crew were missing:**
```
**Crew Integrity Report**

Timestamp: 2026-06-07T14:30:00Z
Total Crew: 11
Present: 9
Missing: 2
Status: ⚠️ CREW MEMBERS MISSING

**Missing Crew Members:**
- Worf (worf): uninitialized
  Diagnostics: Skill manifest not found in sa_crew_skills
- Yar (yar): missing
  Diagnostics: Persona not found in sa_crew_personas; Skill manifest not found in sa_crew_skills
```

**Use Cases:**
- Display crew status on dashboard
- Log integrity checks for audit trail
- Alert systems: parse text for "CREW MEMBERS MISSING"
- Manual inspection: quickly see which crew members need attention

---

## Workflow Examples

### Example 1: Mission Start Protocol

```
Agent/User: crew_integrity_report
→ System: All 11 crew present (success)

Agent/User: "Ready to proceed. Call crew_integrity_report at mission end."
→ [Mission executes]
→ [At mission end]

Agent/User: crew_integrity_report
→ System: All 11 crew still present (success)

When the MCP server starts, 6 new crew integrity tools are automatically registered and available:
Agent/User: "Mission complete. Full crew accounted for."
```bash
# Start the MCP server
node packages/mcp-server/dist/index.js
```
# The server now offers:
# - check_crew_member_status
# - crew_integrity_report
# - initialize_missing_crew_member
# - recover_all_missing_crew_members
# - get_crew_integrity_summary
# - recover_crew_member_memories  ← NEW: Access crew member's personal learning history
```

### Example 2: Recovery Scenario

```
Agent/User: crew_integrity_report
→ System: Worf (worf) missing, Yar (yar) uninitialized
   presentCount: 9/11, missingCount: 2

Agent/User: "Unacceptable. Recover all missing crew."
→ recover_all_missing_crew_members

→ System: 
   totalAttempted: 2
   successfulRecoveries: 2
   recoveredCrew: [worf, yar]
   allCrewNowPresent: true

Agent/User: "Excellent. All crew reinitialized and ready."
```

### Example 3: Priority Recovery

```
Agent/User: "Critical: Check Worf status"
→ check_crew_member_status: {crewId: "worf"}

→ System: Worf status='missing'

Agent/User: "Recover Worf first (security priority)"
→ initialize_missing_crew_member: {crewId: "worf"}

→ System: success=true, "Lieutenant Worf has rejoined the crew"

Agent/User: "Then recover all other missing crew"
→ recover_all_missing_crew_members

→ System: Now all 11 present and accounted for
```

---

## Integration in Missions

These tools are designed to be called by crew members themselves:

**Worf's Security Checks:**
```
→ crew_integrity_report
   "Initiating security integrity scan..."
   
→ Detects missing crew
→ recover_all_missing_crew_members
   "All crew must be present. This is non-negotiable."
   
→ crew_integrity_report
   "Status confirmed: all crew accounted for and ready."
```

**Data's Logical Analysis:**
```
→ check_crew_member_status: {crewId: "picard"}
   "Verifying Captain's operational status..."
   
→ crew_integrity_report
   "Performing comprehensive crew analysis..."
   "No anomalies detected. All systems nominal."
```

**Picard's Command:**
```
→ crew_integrity_report
   "Before we begin this mission, I need to ensure 
    the entire crew is present and ready. 
    We don't leave anyone behind."
   
→ If missing:
   → recover_all_missing_crew_members
   
→ "Excellent. All 11 crew members are accounted for.
   We are ready to proceed."
```

---

## Data Model

### Crew Member Status Flow

```
[Crew Member Initialized]
     ↓
   [Check integrity check]
     ├→ personaExists? ✅ / ❌
     ├→ skillManifestExists? ✅ / ❌
     ↓
   [Status determined]
     ├→ 'present' (both ✅)
     ├→ 'uninitialized' (one ✅, one ❌)
     └→ 'missing' (both ❌)
     ↓
   [If missing/uninitialized]
     ↓
   [Automatic recovery triggered]
     ├→ Insert into sa_crew_personas
     ├→ Insert into sa_crew_skills v1.0.0
     ↓
   [Status updated to 'present']
     ↓
   [Crew available for operations]
```

---

## Error Handling

If initialization fails, the tool reports:

```json
{
  "success": false,
  "message": "Failed to initialize Jean-Luc Picard: Database connection error"
}
```

In this case:
- Check Supabase connectivity
- Verify SUPABASE_URL and SUPABASE_KEY environment variables
- Check database migrations have been applied
- Retry the recovery operation

---

## Implementation Files

- **Core Module:** `packages/mcp-server/src/lib/crew-integrity.ts`
- **MCP Tools:** `packages/mcp-server/src/tools/crew-integrity-tools.ts`
- **Tool Registration:** `packages/mcp-server/src/index.ts`
- **Demo Script:** `packages/mcp-server/scripts/crew-integrity-recovery.mjs`

---

## Philosophy

**"In this starship, we leave no one behind."**

These tools embody the principle that all 11 crew members are equally important and that the crew is stronger when complete. Any missing member is automatically recovered, and the crew continuously checks on each other's integrity.

All 11 crew members:
- Picard, Data, Riker, Geordi, O'Brien
- Worf, Yar, Troi, Crusher, Uhura, Quark

All protected. All recovered. All always accounted for.
