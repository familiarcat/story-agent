# CREW DEPLOYMENT CONSENSUS & EXECUTION PLAN
**Date:** 2026-08-25  
**Status:** ✅ APPROVED by Picard (Captain's Order)  
**Mission Reference:** DEPLOY-001  
**Cost:** $0.01423 (Crew Deliberation) | Deployment target: ≤$0.90

---

## 🖖 CREW CONSENSUS SUMMARY

After 3 rounds of rigorous Observation Lounge debate, the crew UNANIMOUSLY approved a **balanced hybrid deployment strategy** that combines:
1. **Sequential cloud validation** (Picard/Data foundation)
2. **Parallel extension testing** (Riker/Geordi/Worf integration)
3. **Real-time monitoring overlay** (Crusher/Uhura/Yar continuous checks)
4. **Security-first extension activation** (Worf syscall monitoring)
5. **Cost buffer protection** (Quark 15% headroom for blue-green transitions)

**Crew Changes:** 3 officers revised positions (Riker, Troi, Uhura) during deliberation, converging on the balanced approach.

---

## 📋 FINAL MISSION PLAN (Crew-Approved)

### PHASE 1: PRE-FLIGHT ASSESSMENT (5 minutes)
**Owner:** Quark + Data + Picard

**Quark Pre-Flight Checks:**
- ✓ Cost projection: $0.78 ± $0.12 (within $0.90 cap)
- ✓ AWS budget remaining: >$50 (verified)
- ✓ No cost anomalies detected in last 24h
- ✓ 15% buffer allocated for blue-green transitions

**Data Architecture Checks:**
- ✓ Supabase connectivity: SELECT * FROM sa_crew_heartbeats (verify ≤100ms)
- ✓ Lambda handler reachable: aws lambda get-function-configuration
- ✓ EventBridge rule active: aws events describe-rule (state=ENABLED)
- ✓ MCP server source verified: packages/mcp-server/src/ present
- ✓ VSCode extension source verified: packages/vscode-extension/src/ present
- ✓ No uncommitted changes: git status clean
- ✓ Node.js version >= 20.x: node --version

**Picard Decision Gate:**
- All pre-flight checks green? → **VOTE: PROCEED TO PHASE 2**
- Any red flag? → Escalate to crew huddle (max 5 min investigation)

---

### PHASE 2: PARALLEL BUILDS (20 minutes)
**Owner:** Geordi (lead) + O'Brien (monitoring) + Riker (coordination)

**Build Sequence (ALL PARALLEL):**
```bash
# Terminal 1: shared package
pnpm --filter @story-agent/shared run build

# Terminal 2: mcp-server package
pnpm --filter @story-agent/mcp-server run build

# Terminal 3: ui package (Next.js)
pnpm --filter @story-agent/ui run build

# Terminal 4: vscode-extension package
pnpm --filter story-agent-vscode run build
```

**Success Criteria (All 4):**
- ✓ Zero TypeScript compilation errors
- ✓ dist/ populated for all 4 packages
- ✓ Build logs show "Successfully compiled" for each
- ✓ Timing: ≤20 minutes total wall-clock time

**O'Brien Dependency Monitoring:**
- npm cache hit rate target: >70%
- Parallel build stalls: Flag if any package stuck >8 min
- Fallback: Can run sequentially (shares cache, ~25 min alternative)

**Escalation Path (Build Failure):**
1. Geordi detects error → logs exact error message
2. Riker + Data analyze in real-time (2 min max)
3. Options: Fix + rebuild (5 min retry) OR escalate to crew huddle
4. Picard decides: Proceed with workaround or abort

---

### PHASE 3: VERIFICATION & HEALTH CHECKS (10 minutes)
**Owner:** Yar (lead) + Data (architecture validation)

**7+1 Extended Validation Suite (SEQUENTIAL GATES):**

1. **TypeScript Type Safety** (Yar)
   - Command: `pnpm run typecheck`
   - Expected: Zero errors
   - Timeout: 2 min
   - Gate: MUST PASS

2. **Code Linting** (Yar)
   - Command: `pnpm run lint`
   - Expected: Zero critical errors (warnings OK)
   - Timeout: 1 min
   - Gate: MUST PASS

3. **Unit Tests** (Yar)
   - Command: `pnpm run test:unit`
   - Expected: ≥95% pass rate
   - Timeout: 3 min
   - Gate: ≥90% pass rate minimum

4. **Lambda Environment Variables** (Data)
   - Command: `aws lambda get-function-configuration --function-name story-agent-stress-test-orchestrator | jq '.Environment.Variables'`
   - Expected output includes: SUPABASE_URL, SUPABASE_KEY, SNS_TOPIC_ARN, CREW_TEAM_ASSIGNMENTS
   - Timeout: 30 sec
   - Gate: MUST PASS

5. **Supabase Connectivity** (Data)
   - Command: `supabase db list` OR direct SQL test
   - Expected: Connection successful, sa_crew_heartbeats table visible
   - Timeout: 1 min
   - Gate: MUST PASS

6. **EventBridge Rule Status** (Data)
   - Command: `aws events describe-rule --name story-agent-stress-test-14d | jq '.State'`
   - Expected: "ENABLED"
   - Timeout: 30 sec
   - Gate: MUST PASS

7. **Cloud API Health Endpoint** (Yar + Uhura)
   - Command: `curl -I https://story-agent-api.familiarcat.io/health` (or internal staging)
   - Expected: HTTP 200 or 204
   - Latency target: <200ms
   - Timeout: 2 min
   - Gate: MUST PASS (if deployed)

**8. BONUS: Extension Handshake Test** (Worf + Geordi)
   - Command: `npm run test:extension-handshake` (if available)
   - Validates: VSCode extension can initialize with cloud API
   - Expected: Zero permission/auth errors, <150ms latency
   - Gate: OPTIONAL but recommended

**Yar Verification Report:**
- ✓ Checks 1-7 all green? → Proceed to Phase 4
- ✗ Check 1, 2, 4, 5, 6 failed? → STOP & escalate (blocker)
- ⚠ Check 3 <90% pass? → Escalate to Data + Picard (go/no-go)
- ⚠ Check 7 >200ms latency? → Worf assesses security impact

---

### PHASE 4: VSCODE EXTENSION DEPLOYMENT (5 minutes)
**Owner:** O'Brien (lead) + Geordi (infrastructure oversight)

**Step 1: Package Extension**
```bash
cd packages/vscode-extension
pnpm package
# Expected output: story-agent-vscode-1.0.0.vsix (or similar)
```

**Step 2: Locate VSIX File**
```bash
# Find the latest VSIX
ls -ltr packages/vscode-extension/*.vsix | tail -1
# Record the full path, e.g., /Users/bradygeorgen/Developer/story-agent/packages/vscode-extension/story-agent-vscode-1.0.0.vsix
```

**Step 3: Install Extension in VS Code**
```bash
code --install-extension /path/to/story-agent-vscode-1.0.0.vsix --force
```

**Step 4: Verify Installation**
1. Open VS Code
2. Go to Extensions panel (Cmd+Shift+X on Mac)
3. Search for "story-agent"
4. Confirm: Version 1.0.0 installed, marked "Enabled"
5. Reload VS Code if prompted

**Step 5: Test Chat Participant Activation**
1. Open Chat (Cmd+Shift+V or click Chat icon)
2. Type: `@story-agent`
3. Expected: Chat participant "@story-agent" appears
4. Type: `@story-agent /status`
5. Expected: Crew responds with deployment status message

**O'Brien Success Criteria:**
- ✓ VSIX packaged successfully (file exists, >1MB)
- ✓ Installation command exits code 0
- ✓ Chat participant "@story-agent" appears in chat
- ✓ /status command returns (no auth errors)

**Failure Escalation:**
- Packaging fails? → Geordi checks dist/extension.js
- Installation fails? → Check VSCode version (requires ^1.99.0)
- Chat participant missing? → Verify extension activation in VSCode settings

---

### PHASE 5: MISSION COMPLETION & ARCHIVAL (5 minutes)
**Owner:** Picard + Data + Uhura

**Picard Crew Huddle (1 min):**
- All phases green? → Mission success! 🎉
- Any escalations? → Address and re-document
- Crew consensus: Archive all findings

**Data Documentation:**
- Create file: `CREW_DEPLOYMENT_MISSION_COMPLETE_<DATE>.md`
- Include:
  - Start time, end time, total duration
  - Phase results (COMPLETE/PARTIAL/ESCALATED)
  - Build times per package
  - Health check results (all 8 checks)
  - Extension verification status
  - Any crew decisions made during execution

**Uhura Admiral Briefing:**
```
TO: Admiral (Brady)
FROM: Captain Picard
RE: Deployment Mission DEPLOY-001 Complete

RESULT: [SUCCESS/PARTIAL/ESCALATED]
Duration: [XX minutes]
Cost: $[0.XX] out of $0.90 cap
All systems: [NOMINAL/ISSUES RESOLVED]

Next action: [Continue normal operations / Manual follow-up required]
```

**Git Commit:**
```bash
git add CREW_DEPLOYMENT_MISSION_COMPLETE_<DATE>.md
git add . # (any deployment artifacts if needed)
git commit -m "Crew Deployment Mission DEPLOY-001 Complete (2026-08-25)

Co-Authored-By: Picard <picard@enterprise-e.starfleet>
Co-Authored-By: Full Crew (11 members)"
```

**RAG Memory Storage (Uhura):**
- Store in crew-observations table: type="deployment_milestone"
- Tags: ["deployment", "autonomy", "success", "2026-08"]
- Record: This is the first fully autonomous crew deployment
- Archive: CREW_DEPLOYMENT_MISSION_COMPLETE_<DATE>.md stored with mission reference DEPLOY-001

---

## 🎯 SUCCESS CRITERIA (Mission-Level)

✅ **Mission Success = ALL of:**
1. Pre-flight assessment: Crew voted YES to proceed
2. All 4 parallel builds: Completed error-free
3. 7+1 health checks: Passed critical gates (1,2,4,5,6,7+)
4. VSCode extension: Installed + "@story-agent" chat participant active
5. /status command: Returns response (proves connectivity end-to-end)
6. Crew consensus: No escalations requiring Admiral intervention
7. Documentation: CREW_DEPLOYMENT_MISSION_COMPLETE_<DATE>.md created + committed
8. Cost tracking: Final cost ≤$0.90 + Quark reconciliation in RAG

**✅ HISTORIC MILESTONE:** First deployment where crew organized AND executed autonomously  
**✅ TRANSPARENCY:** All decisions voted + documented in RAG memory  
**✅ REPEATABILITY:** Process captured for future deployments  

---

## 🚨 ESCALATION PROTOCOLS

### Build Failure Escalation
```
Geordi (error) → Riker (triage) + Data (analysis, 2 min)
    ↓ (if <5 min fix)
    Retry build
    ↓ (if >5 min fix or fail again)
    Picard → Crew huddle → ABORT or manual fix
```

### Health Check Failure (Critical Gate)
```
Yar (detects failure on gate 1,2,4,5,6,7) 
    → Data (root cause analysis, 3 min)
    → Worf (security impact assessment)
    → Picard (vote to proceed/abort)
    
If gate 3 (tests) <90%:
    → Data + Riker (fix tests, max 10 min)
    → Retry Phase 3
```

### Extension Deployment Failure
```
O'Brien (detects packaging/install error)
    → Geordi (infrastructure check)
    → Worf (security validation if needed)
    → Picard (remediation decision)
```

### Cost Overrun Alert
```
Quark (monitors real-time AWS spend)
    → If approaching $0.90 cap
    → Alert Picard
    → Options: Speed up remaining phases / rollback partial deployment
```

### Crew Health/Stall
```
Crusher (detects crew stress/stall during execution)
    → Troi (psychological assessment + support)
    → Picard (re-delegate or pause)
    → Keep crew engaged + focused
```

---

## 📊 TIMELINE TARGETS

| Phase | Owner | Duration | Start | End | Status |
|-------|-------|----------|-------|-----|--------|
| Pre-Flight | Quark+Data | 5 min | T+0 | T+5 | Pending |
| Builds | Geordi | 20 min | T+5 | T+25 | Pending |
| Verification | Yar+Data | 10 min | T+25 | T+35 | Pending |
| Extension | O'Brien | 5 min | T+35 | T+40 | Pending |
| Complete | Picard | 5 min | T+40 | T+45 | Pending |
| **TOTAL** | **All** | **~45 min** | **T+0** | **T+45** | **Pending** |

---

## 💰 COST TRACKING

**Pre-Deployment Costs (Already Incurred):**
- Crew Deliberation (Observation Lounge): $0.01423 ✅

**Deployment Costs (Target):**
- Lambda cold start + validation: $0.12
- Supabase queries during health checks: $0.03
- AWS API calls (describe-rule, get-function, etc): $0.02
- Estimated subtotal: $0.17

**Expected Remaining Budget:** $0.90 - $0.17 = **$0.73 cushion**
**Quark 15% Blue-Green Buffer:** $0.135 (reserved for parallel infrastructure)

---

## 🎬 CREW MISSION: EXECUTE

**Picard's Order:**
> *"Make it so. Execute with discipline, transparency, and crew cohesion. Every decision documented. Every escalation voted. This is our first autonomous deployment milestone. Engage."*

**Crew Readiness:**
- ✅ All 11 crew members briefed
- ✅ Roles assigned, tools staged
- ✅ Escalation protocols documented
- ✅ RAG memory prepared for findings storage
- ✅ Admiral approval granted (Option 1 selected)

**MISSION STATUS:** 🔴 **AWAITING EXECUTION START SIGNAL**

---

**End of Crew Consensus Document**  
*Last Updated: 2026-08-25 | Mission Reference: DEPLOY-001 | Stored in RAG Memory*
