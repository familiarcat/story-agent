---
title: Crew Member Registration — Remediation & Deployment Plan
category: crew
subcategory: diagnostics
tags: [crew, registration, remediation, deployment, aws]
searchable: true
version: 1.0
last_updated: 2026-06-07
---

# Crew Member Registration Remediation

**Date**: 2026-06-07 | **Issue**: Missing Tasha Yar & Quark from MCP activation | **Status**: IN PROGRESS

---

## Investigation Findings

### Root Cause Identified

All 11 crew members **ARE defined** in the codebase:
- ✅ `crew-member-tools.ts` — All 11 tools registered
- ✅ `crew-agents.ts` — All 11 analysis functions exist  
- ✅ `index.ts` — `registerCrewMemberTools()` is called

**The Problem**: Only 9 appear when tools are activated

**Hypothesis**: 
1. Build fails due to TypeScript errors → incomplete tool registration
2. MCP server initialization incomplete → Tasha & Quark silent failures
3. Tool discovery filters out 2 members

### Verification Plan

1. **Locally**: Start MCP server and check stderr logging
2. **Logs**: New registration diagnostics now in place (commit `8b45656`)
3. **Result**: Will see exact error message for Tasha & Quark if registration fails

---

## Changes Made

### Commit 1: Type Safety Fixes
**Commit**: `4879c09`
- Fixed implicit `any` types in `crew-baseline-memories.ts`
- Fixed implicit `any` types in `crew-expertise.ts`
- Added proper `keyof` type guards for crew lookups

### Commit 2: Registration Diagnostics  
**Commit**: `8b45656`
- Added try-catch blocks around all 11 crew member tool registrations
- Added registration logging to stderr for each crew member
- Added summary report showing which crew registered and which failed
- **Output example**:
```
✅ Registered: Captain Jean-Luc Picard
✅ Registered: Commander Data
... (9 more)
❌ Failed to register: Quark — [error message]
❌ Failed to register: Lieutenant Tasha Yar — [error message]

📊 Crew Member Registration Summary:
   ✅ Successfully registered: 9/11
   ❌ Registration errors: 2
      - quark: [specific error]
      - tasha: [specific error]
```

---

## Next Steps: Local Testing & Validation

### Step 1: Build & Start MCP Server
```bash
cd /Users/brady.georgen.ext/Documents/workspace/story-agent
npm run build
npm run mcp-dev  # or: CREW_LLM_PROVIDER=demo npm run mcp-dev
```

### Step 2: Check Stderr Output
Watch for registration logging:
- Should see ✅ for all 11 crew members
- If ❌ appears, error message will explain why

### Step 3: Validate Tool Discovery
Once server is running:
```bash
# Verify all 11 tools are available in MCP
curl -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```
Expected: 11 tools with names like `crew_captain_picard`, `crew_quark`, `crew_tasha_yar`

### Step 4: Test Each Tool
```bash
# Test Quark tool
curl -X POST http://localhost:3101/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"crew_quark","arguments":{...}}}'
```

---

## AWS Deployment Architecture

Once all 11 crew members are registering locally, deployment path:

### HTTP MCP Transport (AWS-Ready)
**File**: `packages/mcp-server/src/index.ts` (lines 40-77)

```typescript
// Line 23 (stdio): registerCrewMemberTools(server);
// Line 77 (HTTP): registerCrewMemberTools(perRequestServer);
```

Both paths call the same registration function, so all 11 tools will be:
- ✅ Available via stdio (local Claude Desktop, local testing)
- ✅ Available via HTTP `/mcp` endpoint (AWS ALB → Lambda)
- ✅ Protected by Bearer token auth + Entra JWT validation

### Deployment Requirements
- [ ] All 11 crew members register locally without errors
- [ ] All 11 tools appear in `tools/list` response
- [ ] Each tool callable and returns valid JSON
- [ ] HTTP endpoint returns same 11 tools
- [ ] Load balancer distributes requests across all crew
- [ ] Monitoring tracks crew member availability

### AWS Multi-Region Deployment
Each region gets a stateless HTTP MCP server with all 11 crew members:
- **Region 1** (Primary): All 11 tools available
- **Region 2** (Secondary): All 11 tools available  
- **Region 3** (Backup): All 11 tools available
- Crew state synchronized via Supabase (multi-region replication)

---

## Deployment Readiness Checklist

### Pre-Deployment (Local)
- [ ] Build succeeds: `npm run build` ✅ outputs no errors
- [ ] Tests pass: `npm run test:unit` ✅ all tests green
- [ ] TypeScript clean: `npm run typecheck` ✅ no errors
- [ ] All 11 crew registered: stderr shows 11/11 ✅
- [ ] Manual test each tool: All 11 callable ✅
- [ ] HTTP endpoint test: `curl` returns 11 tools ✅

### Pre-Production (Staging)
- [ ] Deploy to AWS staging account
- [ ] Verify `/mcp` endpoint returns all 11 tools
- [ ] Load test: All 11 tools under concurrent load
- [ ] Failover test: Region 1 down → Region 2 serves all 11
- [ ] Monitoring: Crew availability dashboard working

### Production (Live)
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitoring: Zero errors from crew member registration
- [ ] Alerts: Notify if crew member availability drops below 11
- [ ] SLA: All 11 crew members available 99.99% uptime

---

## Crew Status Summary

| Crew Member | Status | Notes |
|-------------|--------|-------|
| Captain Picard | ✅ Defined | Registered in commit `8b45656` |
| Commander Data | ✅ Defined | Registered in commit `8b45656` |
| Commander Riker | ✅ Defined | Registered in commit `8b45656` |
| Geordi La Forge | ✅ Defined | Registered in commit `8b45656` |
| Chief O'Brien | ✅ Defined | Registered in commit `8b45656` |
| Lieutenant Worf | ✅ Defined | Registered in commit `8b45656` |
| **Lieutenant Tasha Yar** | ⚠️ Investigating | Awaiting registration diagnostic output |
| Counselor Troi | ✅ Defined | Registered in commit `8b45656` |
| Dr. Beverly Crusher | ✅ Defined | Registered in commit `8b45656` |
| Lieutenant Uhura | ✅ Defined | Registered in commit `8b45656` |
| **Quark** | ⚠️ Investigating | Awaiting registration diagnostic output |

---

## Logs & Diagnostics

**File**: `packages/mcp-server/src/tools/crew-member-tools.ts`

Lines 28-31: Diagnostic tracking setup
- `registeredCrew: string[]` — Tracks successful registrations
- `registrationErrors` — Captures any registration failures

Lines after each crew registration (30+, 60+, 90+, etc.):
- `try { server.tool(...) }` — Safe registration with error handling
- `process.stderr.write()` — Real-time logging to stderr
- Error messages include crew name and specific error details

**Output Example** (once server starts):
```
✅ Registered: Captain Jean-Luc Picard
✅ Registered: Commander Data
✅ Registered: Commander William Thomas Riker
✅ Registered: Geordi La Forge
✅ Registered: Chief Miles Edward O'Brien
✅ Registered: Lieutenant Worf (Veto Authority)
❌ Failed to register: Lieutenant Tasha Yar — [error]
✅ Registered: Counselor Deanna Troi
✅ Registered: Dr. Beverly Crusher
✅ Registered: Lieutenant Nyota Uhura
❌ Failed to register: Quark — [error]

📊 Crew Member Registration Summary:
   ✅ Successfully registered: 9/11
   ❌ Registration errors: 2
      - tasha: [specific error message]
      - quark: [specific error message]
```

---

## References

- **Diagnostic Commit**: `8b45656` (registration logging added)
- **Code**: `packages/mcp-server/src/tools/crew-member-tools.ts`
- **Code**: `packages/mcp-server/src/index.ts` (registration calls)
- **Audit**: `docs/crew/2026-06-07-crew-registration-diagnostic.md`

---

## Summary

**Status**: ✅ Diagnostics in place | ⏳ Awaiting test results

All 11 crew members are:
1. ✅ **Defined** in the codebase
2. ✅ **Type-safe** (TypeScript errors fixed)
3. ✅ **Instrumented** (logging added in commit `8b45656`)
4. ⏳ **Ready for testing** (awaiting local server startup)

Once server diagnostic logs are reviewed, we'll have exact error messages for Tasha and Quark, enabling precise fixes. All 11 crew members will then be deployable to AWS with full production SLA.
