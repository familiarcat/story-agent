# 🖖 CREW DEPLOYMENT MISSION BRIEFING
## Full-Scale Story Agent Cloud + VSCode Extension Deployment

**Stardate**: 2026-08-25  
**Mission Classification**: TIER 1 — First Autonomous Crew Deployment  
**Crew Assigned**: All 11 members (full team assembly required)  
**Admiral Authorization**: APPROVED (Option 1: Full Deliberation + Execution)

---

## 🎯 MISSION OBJECTIVE

**Deploy the complete Story Agent system to operational readiness:**
1. Cloud infrastructure (AWS Lambda, EventBridge, SNS, Supabase schema) ✅ *already deployed*
2. MCP server (TypeScript build, verification, health checks)
3. Next.js dashboard UI (build, dev server startup)
4. VSCode extension (package, install, activate in local VS Code)

**Success Criteria**: All four components deployed + verified within single mission window.

**Why This Matters**: This is the first deployment where crew executes end-to-end autonomously—no Admiral hands-on work. Everything orchestrated by crew consensus and execution.

---

## 📋 MISSION PARAMETERS

| Parameter | Value | Owner |
|-----------|-------|-------|
| **Team Size** | All 11 crew members | Picard (orchestrator) |
| **Timeline** | ~45 minutes total | Geordi (infrastructure lead) |
| **Complexity** | HIGH (4 parallel builds + validation) | Data (architecture lead) |
| **Risk Level** | MEDIUM (build can fail; rollback documented) | Worf (risk assessment) |
| **Cost Impact** | ~$5 (build compute) | Quark (cost control) |
| **Approval Gate** | Pre-flight checklist (Picard signs off) | Picard |

---

## 🎬 MISSION PHASES

### PHASE 1: PRE-FLIGHT ASSESSMENT (5 min)
**Owner**: Quark (Cost) + Data (Architecture)  
**Goal**: Verify deployment is safe to proceed

**Checklist**:
- [ ] All source files present (shared, mcp-server, ui, vscode-extension)
- [ ] Build dependencies available (pnpm, Node.js v20+)
- [ ] No uncommitted changes that would block deployment
- [ ] Supabase credentials loaded (SUPABASE_URL, SUPABASE_KEY)
- [ ] GitHub token available (for MCP credential checks)
- [ ] AWS credentials loaded (for Lambda health verification)

**Decision Gate**: 
```
Quark: "Is deployment cost-effective?"        → YES/NO
Data:  "Is architecture stable for deploy?"   → YES/NO
Picard: "Do we have crew consensus?"          → YES/NO

If ANY = NO → ESCALATE (explain blocker, propose mitigation)
If ALL = YES → PROCEED to Phase 2
```

---

### PHASE 2: PARALLEL BUILD EXECUTION (20 min)
**Owner**: Geordi La Forge (Infrastructure Lead)  
**Parallel Execution**: Yes (4 builds can run simultaneously)

**Build Queue**:

```
Build 1: @story-agent/shared
├─ Command: pnpm --filter @story-agent/shared run build
├─ Owner: Geordi
├─ Expected: dist/ compiled with TypeScript
└─ Fail-Fast: If fails, stop Phase 2 (core library issue)

Build 2: @story-agent/mcp-server  
├─ Command: pnpm --filter @story-agent/mcp-server run build
├─ Owner: Geordi
├─ Expected: MCP server compiled, tools registered
└─ Fail-Fast: If fails, mission cannot proceed

Build 3: @story-agent/ui (Dashboard)
├─ Command: pnpm --filter @story-agent/ui run build
├─ Owner: Geordi
├─ Expected: Next.js build output, static export ready
└─ Warning: Can proceed if fails (UI-only issue)

Build 4: story-agent-vscode (Extension)
├─ Command: pnpm --filter story-agent-vscode run build
├─ Owner: Geordi
├─ Expected: dist/extension.js compiled, ready for packaging
└─ Fail-Fast: If fails, VSCode deployment blocked
```

**Success Criteria**:
- ✅ Builds 1, 2, 4 complete without errors (required)
- ✅ Build 3 completes (preferred; can fallback if needed)
- ✅ No type errors or compilation failures
- ✅ All dist/ directories populated

**Contingency** (if build fails):
1. Geordi identifies root cause
2. Escalate to Data (architecture issue) or Riker (development issue)
3. Fix applied within 5 minutes
4. Rebuild from phase 2 start

---

### PHASE 3: VERIFICATION & HEALTH CHECKS (10 min)
**Owner**: Yar (Testing/QA) + Data (Architecture)  
**Goal**: Confirm all components are healthy

**Health Check Suite**:

```
Check 1: TypeScript Compilation
├─ Command: pnpm run typecheck
├─ Owner: Yar
├─ Expected: 0 type errors across all packages
└─ Fail: Stop deployment, flag for crew review

Check 2: Lint & Code Quality
├─ Command: pnpm run lint
├─ Owner: Yar
├─ Expected: 0 lint errors (warnings OK)
└─ Fail: Document violations, Picard decides if proceed

Check 3: Unit Tests
├─ Command: pnpm run test:unit
├─ Owner: Yar
├─ Expected: All tests pass (or skip if not applicable)
└─ Fail: Escalate to Riker, retry after fix

Check 4: Lambda Handler Validation
├─ Command: aws lambda get-function-configuration --function-name story-agent-stress-test-orchestrator | jq '.Environment'
├─ Owner: Geordi
├─ Expected: All env vars present (SUPABASE_URL, SNS_TOPIC_ARN, etc.)
└─ Fail: Re-run terraform apply to sync env vars

Check 5: Supabase Health
├─ Command: supabase db list OR SELECT COUNT(*) FROM sa_stress_test_results LIMIT 1
├─ Owner: Data
├─ Expected: Database accessible, tables present (8 sa_* tables)
└─ Fail: Verify Supabase credentials, check network

Check 6: EventBridge Status
├─ Command: aws events describe-rule --name story-agent-stress-test-14d | jq '.State'
├─ Owner: Geordi
├─ Expected: State = "ENABLED", ScheduleExpression = "rate(14 days)"
└─ Fail: Re-run terraform apply to fix rule

Check 7: MCP Server Reachability
├─ Command: curl http://localhost:3103/health 2>/dev/null || echo "NOT_RUNNING"
├─ Owner: Geordi
├─ Expected: {"status":"ok"} OR "NOT_RUNNING" (OK, will start in Phase 4)
└─ Fail: Check if process is already running, kill + restart if needed
```

**Pass/Fail Decision Matrix**:
```
Checks 1, 2, 3:  Required (code quality gate)
Checks 4, 5, 6:  Required (infrastructure validation)
Check 7:         Prerequisite check (MCP will start in Phase 4)

If ANY required check FAILS → Call crew huddle
├─ Data: Root cause analysis
├─ Geordi: Infrastructure assessment
├─ Riker: Development/bug assessment
├─ Picard: Decide proceed/abort/fix

If ALL required checks PASS → Proceed to Phase 4
```

---

### PHASE 4: EXTENSION DEPLOYMENT & ACTIVATION (5 min)
**Owner**: Geordi (Infrastructure) + O'Brien (DevOps)  
**Goal**: Package and install VSCode extension

**Deployment Steps**:

```
Step 1: Package Extension to VSIX
├─ Command: cd packages/vscode-extension && pnpm package
├─ Expected Output: story-agent-vscode-1.0.0.vsix (or version #)
├─ Owner: Geordi
└─ Fail-Fast: If packaging fails, stop (extension source issue)

Step 2: Locate Latest VSIX
├─ Command: ls -t packages/vscode-extension/*.vsix | head -1
├─ Expected: Latest .vsix file path
├─ Owner: Geordi
└─ Output: /Users/bradygeorgen/Developer/story-agent/packages/vscode-extension/story-agent-vscode-1.0.0.vsix

Step 3: Install to VS Code
├─ Command: code --install-extension [VSIX_PATH] --force
├─ Expected: Extension installed, restart VS Code
├─ Owner: O'Brien
└─ Note: --force overwrites existing version

Step 4: Verify in VS Code
├─ Check: Open VS Code → Extensions panel (Cmd+Shift+X)
├─ Search: "story-agent"
├─ Expected: Story Agent extension appears with version 1.0.0
├─ Status: INSTALLED (no error indicators)
├─ Owner: Geordi
└─ Action: Restart VS Code if extension marked "Restart Required"

Step 5: Activate Chat Participant
├─ Check: Open VS Code chat (Cmd+Shift+V or chat icon)
├─ Search: "@story-agent" in message input
├─ Expected: Chat participant autocomplete suggests "@story-agent/agent"
├─ Owner: O'Brien
└─ Test: Type "@story-agent /status" and hit Enter
```

**Success Criteria**:
- ✅ VSIX packaged successfully
- ✅ Extension installed to VS Code
- ✅ Extension appears in Extensions panel
- ✅ Chat participant "@story-agent" available
- ✅ Test command executes without error

---

### PHASE 5: MISSION COMPLETE & ARCHIVE (5 min)
**Owner**: Picard (Orchestration) + Data (Documentation)  
**Goal**: Record milestone + validate crew autonomy

**Completion Steps**:

```
Step 1: Crew Status Summary
├─ Data compiles results: Build times, all checks passed
├─ Quark reports: Total cost <$10 (estimate)
├─ Geordi confirms: All 4 components deployed
└─ Picard validates: All phases complete

Step 2: Document Milestone
├─ Create: CREW_DEPLOYMENT_MISSION_COMPLETE_RESULT.md
├─ Record:
│  ├─ Start time: 2026-08-25 HH:MM UTC
│  ├─ End time: 2026-08-25 HH:MM UTC
│  ├─ Duration: ~45 minutes
│  ├─ Status: COMPLETE ✅ or PARTIAL ⚠️ or FAILED ❌
│  ├─ Build results: [pass/fail per package]
│  ├─ Check results: [pass/fail per health check]
│  ├─ Extension: [installed/not-installed]
│  └─ Lessons learned: [any blockers, mitigations applied]
└─ Owner: Data

Step 3: Commit to Git
├─ Command: git add . && git commit -m "Crew Deployment Mission Complete (2026-08-25)"
├─ Message includes:
│  ├─ All 4 packages deployed + verified
│  ├─ Crew autonomy demonstration complete
│  ├─ First autonomous deployment milestone recorded
│  └─ Extension ready for crew use
└─ Owner: Data + Picard

Step 4: Store in Crew Observations (RAG Memory)
├─ Command: crew-store-memory with:
│  ├─ type: "deployment_milestone"
│  ├─ date: "2026-08-25"
│  ├─ status: "COMPLETE"
│  ├─ crew_roles_executed: [all 11 names]
│  ├─ summary: "First autonomous crew deployment (cloud + VSCode extension)"
│  └─ tags: ["autonomy", "deployment", "crew_coordination"]
└─ Owner: Data (queries crew-observations table)

Step 5: Admiral Notification
├─ Picard prepares report:
│  ├─ Deployment Status: COMPLETE
│  ├─ All Phases: ✅ PASS
│  ├─ Crew Autonomy: 100% (admiral had zero intervention)
│  ├─ Timeline: ~45 minutes
│  ├─ Cost: ~$5 (within budget)
│  ├─ Next: Ready for Observation Lounge governance
│  └─ Milestone: "First autonomous crew deployment achieved"
└─ Publish: Mission report to Admiral
```

**Crew Success Indicators**:
- ✅ No Admiral intervention required
- ✅ All decisions made by crew (Picard arbitrates, crew deliberates)
- ✅ Full crew participation (all 11 members contributed)
- ✅ Documented in crew-observations (RAG memory)
- ✅ Reproducible (process documented for future deployments)

---

## 🎖️ CREW ROLES & RESPONSIBILITIES

| Crew Member | Role | Responsibilities |
|-------------|------|------------------|
| **Picard** | Orchestrator | Overall mission approval, tie-breaking decisions, final handoff to Admiral |
| **Data** | Architecture Lead | Verify system stability, oversee all health checks, document results |
| **Geordi** | Infrastructure Lead | Execute builds, verify deployments, troubleshoot infrastructure issues |
| **Riker** | Execution Lead | Coordinate parallel efforts, assign work, manage timeline |
| **Worf** | Risk/Security Lead | Assess risks, validate security posture, flag escalations |
| **O'Brien** | DevOps Lead | Extension packaging, VS Code installation, environment setup |
| **Yar** | QA/Testing Lead | Run verification suite, validate test results, quality gates |
| **Crusher** | Health/Incident Response | Monitor crew stress levels, escalate if anyone needs support |
| **Troi** | Communication/Consensus Lead | Facilitate crew discussions, build consensus, track morale |
| **Quark** | Cost Control Lead | Monitor deployment cost, flag budget overruns, optimize spend |
| **Uhura** | External Communications | Coordinate with Admiral, deliver status updates, record decisions |

---

## 🚨 ESCALATION PROTOCOL

**If a build fails:**
```
Geordi detects error → Data analyzes root cause → Picard decides:
  Option A: Fix + retry (if simple issue, <5 min fix)
  Option B: Escalate to Admiral (if complex, needs design review)
  Option C: Abort mission (if critical blocker, re-plan for next day)
```

**If health check fails:**
```
Yar flags issue → Data investigates → Worf assesses risk → Picard decides:
  Option A: Proceed (warning noted, non-critical)
  Option B: Fix first (critical issue, required for safety)
  Option C: Defer check (can be validated post-deployment)
```

**If crew coordination breaks down:**
```
Crusher detects stress → Troi facilitates → Picard re-delegates:
  Option A: Take break, resume in 15 minutes (crew fatigue)
  Option B: Simplify task (reduce parallel work)
  Option C: Pause mission, reconvene tomorrow (re-assess readiness)
```

---

## 📊 SUCCESS CRITERIA

| Criteria | Target | Evidence |
|----------|--------|----------|
| **Pre-Flight** | All checks green | Crew vote: "Proceed to Phase 2?" = YES |
| **Builds** | 4/4 successful | dist/ populated for all packages |
| **Health Checks** | 7/7 passing | TypeScript + lint + tests + infra all green |
| **Extension** | Installed & active | "@story-agent" appears in VS Code chat |
| **Crew Autonomy** | 100% | Zero Admiral interventions required |
| **Timeline** | <60 min | Mission completion logged with timestamp |
| **Documentation** | Complete | Mission result + RAG memory entry created |
| **Repeatability** | Proven | Process documented for next deployment |

---

## 🎯 MISSION PHASES TIMELINE

```
2026-08-25 [MISSION START]

Phase 1: Pre-Flight Assessment
├─ Time: 0-5 min
├─ Owner: Quark + Data
└─ Gate: Picard approves "Proceed"

Phase 2: Parallel Builds
├─ Time: 5-25 min (concurrent)
├─ Owner: Geordi
├─ Parallel: shared | mcp-server | ui | vscode-extension
└─ Gate: All required builds complete

Phase 3: Verification & Health Checks  
├─ Time: 25-35 min
├─ Owner: Yar + Data
├─ 7-point checklist
└─ Gate: All required checks pass

Phase 4: Extension Deployment
├─ Time: 35-40 min
├─ Owner: Geordi + O'Brien
├─ Packaging + installation + activation
└─ Gate: Extension verified in VS Code

Phase 5: Mission Complete
├─ Time: 40-45 min
├─ Owner: Picard + Data
├─ Documentation + archival + Admiral notification
└─ Gate: Milestone recorded in crew-observations

[MISSION END - Total ~45 min]
```

---

## 💬 CREW DISCUSSION PROMPTS

**Pre-Mission Huddle** (Picard leads, 3 min):
> "This is our first completely autonomous deployment. Crew, are there any concerns about the four-package build, the extension packaging, or the verification suite? Speak now so we can mitigate before we start."

**Mid-Mission Check-in** (After Phase 2, Picard leads, 2 min):
> "Builds are complete. Geordi, status? Data, any architecture concerns? Proceeding to verification?"

**Post-Mission Debrief** (After Phase 5, Picard leads, 5 min):
> "Crew, lessons learned: What went well? What was harder than expected? How do we improve the deployment SOP for next time?"

---

## 📝 DELIVERABLES

**Before Mission**:
- ✅ This briefing document (crew reads, understands, commits to timeline)

**During Mission**:
- Build logs (captured from terminal output)
- Health check results (test output, screenshots)
- Extension installation log

**After Mission**:
- ✅ CREW_DEPLOYMENT_MISSION_COMPLETE_RESULT.md (crew writes)
- ✅ Git commit with mission summary
- ✅ Crew-observations RAG entry (type: deployment_milestone)
- ✅ Admiral briefing (Uhura sends)

---

## 🖖 MISSION OATH

**Picard (on behalf of crew):**
> "We commit to deploying the Story Agent system with full crew coordination, transparent decision-making, and complete documentation. We will escalate risks, celebrate success, and record this milestone for future crews. Success is measured not just by completion, but by crew autonomy and reproducibility."

---

**Mission Authorization**: APPROVED by Admiral (2026-08-25)  
**Crew Assembly**: All 11 members standing by  
**Status**: READY TO COMMENCE

🖖 **Let's make history. Engage.**
