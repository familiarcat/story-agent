# Systemic Hanging Diagnosis — Complete Tool Chain Audit

**Created:** 2026-09-01 ~11:50 PM CDT  
**Objective:** Identify ALL potential hanging points across the crew tool system before autonomous execution

---

## Phase 1: Code Audit Findings

### ✅ CORRECT: HTTP Agent Path (Local Tools Only)

**What we found:**
- `packages/mcp-server/src/index.ts` → Starts HTTP server only (no MCP)
- `packages/mcp-server/src/agent-core/http-server.ts` → Calls `runAgentLoop()` without MCP tools parameter
- `runAgentLoop()` uses only local AGENT_TOOLS (read_file, write_file, edit_file, shell, etc.)
- This path is **proven working** (crew has used it all along)

**Verdict:** ✅ HTTP path is clean and reliable

---

### ⚠️ INVESTIGATION NEEDED: Database Connection Initialization

**Issue Found:**
- `packages/shared/src/db.ts` line 207: `probeSupabaseCandidate()` uses raw `fetch()` with NO timeout
- Should use `fetchWithTimeout()` (8s timeout) like other Supabase calls, but doesn't
- If Supabase is unreachable or slow to respond, probe could hang indefinitely
- This blocks ANY tool that needs DB access (most crew tools)

**Stack:**
```
runAgentLoop()
  → tool.handler() (e.g., crew_deliberate, rag_recall, storeObservationMemory)
    → db() [lazy connection]
      → probeSupabaseCandidate() [HANGS if Supabase unreachable]
```

**Severity:** 🔴 CRITICAL — If Supabase is slow or unreachable, ANY crew tool blocks

---

### ⚠️ INVESTIGATION NEEDED: Async Credential Resolution

**Patterns Found:**
```typescript
// In crew-autonomy-tools.ts:
const { domain: d, apiKey: k } = await resolveAhaCredentials();

// In worfgate-credentials.ts:
export async function resolveWorfGateCredential(...): Promise<string>
```

**Risk:** If credential resolution (env var lookup, Vault, AWS Secrets Manager chain) is slow or unreachable, tool initialization hangs

**Severity:** 🟠 MEDIUM — Only affects tools using external credentials (Aha, GitHub)

---

### ⚠️ INVESTIGATION NEEDED: Mission Pipeline Dispatch

**In bridges.ts:**
```typescript
crewDeliberate: async (brief: string) => {
  const r = await runMissionPipeline(brief);  // ← Can this timeout?
```

**Risk:** If `runMissionPipeline()` hangs (crew deliberation timeout, LLM unreachable), the entire agent loop is blocked

**Severity:** 🟠 MEDIUM — Only triggered by `crew_deliberate` tool call

---

### ✅ CORRECT: buildBridges Initialization

**What we found:**
- `buildBridges()` is synchronous
- Returns object with async properties
- No blocking operations during initialization

**Verdict:** ✅ Safe

---

## Phase 2: Runtime Validation Needed

### Test Cases to Run

**Test 1: Minimal HTTP Agent Dispatch**
```bash
curl -X POST http://localhost:3103/agent \
  -H "Content-Type: application/json" \
  -d '{"input": "What is 2+2?"}' \
  -w "\n%{http_code}\n"
```
**Expected:** Completes within 10 seconds  
**If hangs:** Issue is in HTTP server or base agent loop

---

**Test 2: Database Connection Probe**
```typescript
// Directly test db connection initialization
const client = await db();
```
**Expected:** Completes within 20 seconds (8s per probe candidate)  
**If hangs:** Issue is in Supabase connection or probeSupabaseCandidate()

---

**Test 3: Agent Dispatch with DB-dependent Tool**
```bash
curl -X POST http://localhost:3103/agent \
  -H "Content-Type: application/json" \
  -d '{"input": "List the top 3 active stories"}' \
  --max-time 30 \
  -w "\n%{http_code}\n"
```
**Expected:** Completes within 30 seconds  
**If hangs:** Issue is in DB connection during tool execution

---

**Test 4: Crew Deliberation (Mission Pipeline)**
```bash
curl -X POST http://localhost:3103/agent \
  -H "Content-Type: application/json" \
  -d '{"input": "Should we refactor the MCP system? Use crew_deliberate to think about this.", "autoEscalate": true}' \
  --max-time 60 \
  -w "\n%{http_code}\n"
```
**Expected:** Completes within 60 seconds  
**If hangs:** Issue is in crew mission pipeline

---

## Phase 3: Crew Diagnostic Mission

**Task for Data:**
1. Verify HTTP agent endpoint responds (health check)
2. Probe Supabase connectivity and measure connection time
3. List all tools in AGENT_TOOLS registry
4. Check for circular imports in tool handlers
5. Identify which tools require external credentials
6. Report on any timeouts or hanging operations
7. Provide clear recommendations for fixes

**Acceptance Criteria:**
- ✅ HTTP health check completes <5s
- ✅ Supabase probe completes <20s with clear status
- ✅ All tool registry loaded and accessible
- ✅ Any hanging points clearly identified + root cause
- ✅ Recommendations for fixes (fetch timeouts, credential caching, lazy loading, etc.)

---

## Phase 4: Recommended Fixes (If Needed)

### Fix 1: Timeout Supabase Probes
```typescript
// In db.ts, line 207:
- const response = await fetch(endpoint, {...})
+ const response = await fetchWithTimeout(endpoint, {...})
```
**Impact:** Prevents indefinite hangs on unreachable Supabase  
**Effort:** 1 line change  
**Risk:** None (already have timeout helper)

---

### Fix 2: Cache Credential Resolution
```typescript
// Cache resolved credentials for 5 minutes to avoid repeated lookups
const credentialCache = new Map<string, { value: string; expiresAt: number }>();
```
**Impact:** Prevents repeated credential resolution overhead  
**Effort:** 20 lines  
**Risk:** Low (TTL keeps cache fresh)

---

### Fix 3: Lazy-Load Heavy Tool Registrations
**Currently:** All ~80 tools loaded at once  
**Better:** Load tools on-demand based on mission context  
**Impact:** Faster startup, smaller memory footprint  
**Effort:** 50-100 lines  
**Risk:** None (with proper fallback)

---

## Next Steps

1. **Approve** this diagnostic approach
2. **Launch** Data's audit mission (should complete in 10-30 minutes)
3. **Review** Data's findings + recommendations
4. **Implement** any critical fixes (probably just Fix 1 above)
5. **Re-test** with full crew dispatch
6. **Proceed** with 24/7 autonomous activation

---

**Status:** Ready for crew diagnostic mission dispatch ✅

