---
title: Crew Member Registration Audit — 2026-06-07
category: crew
subcategory: diagnostics
tags: [crew, registration, mcp, deployment, audit]
searchable: true
version: 1.0
last_updated: 2026-06-07
---

# Crew Member Registration Audit

**Date**: 2026-06-07 | **Issue**: 2 of 11 crew members not activating (Tasha Yar, Quark)

---

## Problem Statement

Only 9 of 11 crew members are being recognized and activated through the MCP tool system:

**Active (9/11)**:
- ✅ Captain Picard
- ✅ Commander Data
- ✅ Commander Riker
- ✅ Lieutenant Worf
- ✅ Geordi La Forge
- ✅ Chief O'Brien
- ✅ Counselor Troi
- ✅ Dr. Beverly Crusher
- ✅ Lieutenant Uhura

**Missing (2/11)**:
- ❌ Quark (Financial Analyst)
- ❌ Lieutenant Tasha Yar (QA Auditor)

---

## Code Verification

### ✅ All 11 Crew Members Defined in Code

**File**: `packages/mcp-server/src/tools/crew-member-tools.ts`

All 11 crew members ARE registered as MCP tools:

```typescript
// Lines confirmed:
// 47-60: crew_captain_picard ✅
// 62-77: crew_commander_data ✅
// 79-96: crew_commander_riker ✅
// 98-113: crew_geordi_la_forge ✅
// 115-129: crew_chief_obrien ✅
// 131-147: crew_lt_worf ✅
// 149-167: crew_tasha_yar ✅ (DEFINED)
// 169-186: crew_counselor_troi ✅
// 188-204: crew_dr_crusher ✅
// 206-222: crew_lt_uhura ✅
// 224-238: crew_quark ✅ (DEFINED)
```

### ✅ All 11 Analysis Functions Defined

**File**: `packages/mcp-server/src/lib/crew-agents.ts`

All 11 analysis functions exist and are exported:

```typescript
// Line 39: export async function captainPicardAnalysis(...) ✅
// Line 63: export async function dataArchitectAnalysis(...) ✅
// Line 87: export async function rikerDeveloperAnalysis(...) ✅
// Line 112: export async function geordiInfraAnalysis(...) ✅
// Line 134: export async function obrienDevOpsAnalysis(...) ✅
// Line 156: export async function worfSecurityAnalysis(...) ✅
// Line 189: export async function tashaQAAnalysis(...) ✅ (DEFINED)
// Line 212: export async function troiAnalystAnalysis(...) ✅
// Line 234: export async function crusherHealthAnalysis(...) ✅
// Line 256: export async function uhuraCommunicationsAnalysis(...) ✅
// Line 278: export async function quarkFinanceAnalysis(...) ✅ (DEFINED)
```

### ✅ Server Registration Called

**File**: `packages/mcp-server/src/index.ts`

Line 23: `registerCrewMemberTools(server);` — **IS CALLED** ✅

---

## Root Cause Analysis

### Issue 1: TypeScript Compilation Errors

The build is failing with TypeScript errors, which may prevent:
- Proper compilation of the MCP server
- Complete registration of all tools
- Runtime activation of Tasha Yar and Quark tools

**Errors found** (not specific to Tasha/Quark, but preventing full build):
- `crew-baseline-memories.ts(353,36)`: Parameter type errors
- `crew-expertise.ts(576,34)`: Parameter type errors  
- `crew-task-routing.ts`: Multiple implicit any types
- `domain-registry.ts`: Index signature issues

### Issue 2: Tool Activation System

When `activate_crew_role_management_tools` is called, it should discover and activate ALL registered MCP tools, but it's only returning 9.

This could be:
1. A filtering issue in the tool activation logic
2. A registration error that silently fails for Tasha and Quark
3. The tools registered but not properly exposed by the MCP server

---

## Deployment Architecture Gaps

### Local Activation ❌
- Only 9 of 11 crew members can be activated locally
- Tasha Yar and Quark tools are defined but not appearing in the MCP tool list

### AWS Deployment ❌
- Cannot deploy full 11-member crew to AWS if tools don't properly register
- HTTP MCP transport also calls `registerCrewMemberTools` (line 77 in index.ts)
- Same tool registration issue would affect AWS deployment

---

## Required Fixes

### Fix 1: Resolve TypeScript Compilation Errors
**Priority**: HIGH | **Impact**: Blocking tool registration

Fix type safety issues in:
- `crew-baseline-memories.ts` — Add type annotations to parameters
- `crew-expertise.ts` — Fix index signature issues
- `crew-task-routing.ts` — Type all implicit any parameters
- `domain-registry.ts` — Add proper type guards

### Fix 2: Verify Tool Registration at Runtime
**Priority**: HIGH | **Impact**: Ensures all 11 tools appear

Add logging to `registerCrewMemberTools()` to verify:
- All 11 `server.tool()` calls complete successfully
- No exceptions during tool registration
- Confirm Tasha Yar and Quark register without errors

### Fix 3: Validate AWS Deployment Path
**Priority**: MEDIUM | **Impact**: Ensures production readiness

Verify HTTP MCP transport in index.ts:
- Line 77: `registerCrewMemberTools(perRequestServer);` is called
- All 11 tools available via HTTP `/mcp` endpoint
- Authentication/authorization works for all crew members

### Fix 4: Test Tool Activation Discovery
**Priority**: MEDIUM | **Impact**: Ensures MCP tool discovery works

Test that activate_crew_role_management_tools discovers all 11:
- Tool discovery should return 11, not 9
- Each crew member tool should be callable
- Error handling for missing crew members

---

## Deployment Readiness Checklist

- [ ] **Local**: All 11 crew members register via `registerCrewMemberTools(server)`
- [ ] **Local**: All 11 tools appear in MCP tool discovery
- [ ] **Local**: Each tool can be invoked without errors
- [ ] **AWS**: HTTP MCP endpoint returns all 11 tools
- [ ] **AWS**: Each crew member accessible via `/mcp` endpoint with authentication
- [ ] **AWS**: Load balancing supports all 11 crew member concurrent activation
- [ ] **Monitoring**: Crew member availability tracked (11/11 expected)

---

## Next Steps

1. **Immediate**: Fix TypeScript compilation errors (prevents build)
2. **Immediate**: Run `npm run build` successfully
3. **Quick**: Add runtime logging to verify all 11 tools register
4. **Quick**: Test local MCP server startup with all tools
5. **QA**: Verify activate_crew_role_management_tools returns 11 tools
6. **Deployment**: Test AWS HTTP MCP endpoint with all 11 tools
7. **Monitoring**: Set up alerts for crew member registration failures

---

## Files to Update

### Priority 1 (Type Safety)
- `packages/mcp-server/src/lib/crew-baseline-memories.ts` — Add parameter types
- `packages/mcp-server/src/lib/crew-expertise.ts` — Add index signatures
- `packages/mcp-server/src/lib/crew-task-routing.ts` — Type parameters
- `packages/mcp-server/src/lib/domain-registry.ts` — Add type guards

### Priority 2 (Registration Verification)
- `packages/mcp-server/src/tools/crew-member-tools.ts` — Add console.log for each tool registration
- `packages/mcp-server/src/index.ts` — Add startup logging showing all tools

### Priority 3 (Testing)
- Create test for all 11 crew members (check `npm run test:unit`)
- Create integration test for AWS HTTP endpoint

---

## References

- **Code**: `packages/mcp-server/src/tools/crew-member-tools.ts` (all 11 defined)
- **Code**: `packages/mcp-server/src/lib/crew-agents.ts` (all 11 functions)
- **Code**: `packages/mcp-server/src/index.ts` (registration entry point)
- **Audit**: `docs/crew/2026-06-07-crew-memory-audit-report.md` (status report)
