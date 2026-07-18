# Story Agent VSCode Extension — Autonomous Crew Architecture Specification

**Mission Reference:** `vscode-extension-crew-autonomy-architecture`  
**Deliberation Date:** 2026-07-18  
**Crew Consensus:** **GO (Balanced Approach Recommended)**  
**Cost Estimate (12-month):** ~$8,200 (vs. Copilot $240/user/year @ 100 users = $24,000)  
**Timeline to MVP:** 10-12 weeks (Phase 1: Text/Code, Phase 2: Vision/Voice)

---

## Executive Summary

**Verdict:** Replace Copilot Chat + Claude Code with Story Agent VSCode Extension as primary coding assistant. The extension will leverage Story Agent's OpenRouter crew system to deliver superior cost efficiency (~65% savings), transparent crew attribution, and autonomous parallel execution with built-in validation.

**Decision Gate:** PROCEED with **Balanced Approach** (standard 3-sub-agent validation, recursive multimodal pipeline, parallel execution with resource monitoring, full WorfGate audit trails). Conservative approach too limiting; aggressive approach adds complexity without commensurate ROI at MVP phase.

**Key Differentiator:** Unlike Copilot/Claude Code (single-model responses), Story Agent provides **3-sub-agent consensus validation** on every output, dramatically reducing hallucination risk while maintaining developer agility. Crew attribution builds organizational trust in autonomous suggestions.

---

## 1. Architecture Specification

### 1.1 System Overview

```
VSCode Extension UI
    ↓
Multimodal Input Processor (Data)
    ↓ (text, code, image, voice, view state)
Crew Mission Router (Riker)
    ↓
Parallel Execution Engine (3 Sub-Agents per Task)
    ├─ Sub-Agent 1: Execute (generate code, analysis)
    ├─ Sub-Agent 2: Verify (correctness, syntax, logic)
    └─ Sub-Agent 3: Challenge (edge cases, alternatives)
    ↓ (consensus >80%)
WorfGate Security Validator (Worf)
    ↓
Code Modification & Execution (with audit trail)
    ↓
Result with Crew Attribution & Confidence Score
```

### 1.2 Multimodal Input Pipeline (Data's Design)

**Inputs normalized to unified JSON-LD structure:**

```json
{
  "inputType": "composite",
  "timestamp": "ISO-8601",
  "sources": [
    {
      "type": "text",
      "content": "user natural language prompt",
      "lineage": "vscode-chat-input"
    },
    {
      "type": "code",
      "content": "selected text or diff",
      "context": "file path, line range",
      "lineage": "editor-selection"
    },
    {
      "type": "image",
      "data": "base64-encoded screenshot",
      "context": "UI mockup, architecture diagram, error trace",
      "lineage": "vscode-view-provider"
    },
    {
      "type": "voice",
      "transcript": "speech-to-text output",
      "confidence": 0.95,
      "lineage": "vscode-voice-input"
    }
  ],
  "crewAssignment": "Riker (lead), Yar (validation)",
  "securityContext": {
    "workspaceRoot": "/path/to/repo",
    "allowedPaths": ["src/", "tests/", ".github/"],
    "deniedPaths": [".env", ".ssh/"]
  }
}
```

**Cryptographic Hashing:** Each processing stage appends SHA-256 hash + WorfGate signature before sub-agent distribution, maintaining immutable data lineage.

### 1.3 3-Sub-Agent Validation System (Yar's Design)

**Parallel execution with specialized roles:**

| Sub-Agent | Role | Validates | Failure Mode |
|-----------|------|-----------|--------------|
| **Agent 1** | Execute | Generates code/analysis per request | Returns raw output; may contain errors |
| **Agent 2** | Verify | Syntax, type safety, logic correctness, consistency | Catches bugs before output; blocks invalid code |
| **Agent 3** | Challenge | Edge cases, alternative approaches, performance implications | Identifies missed requirements; flags risky patterns |

**Consensus Mechanism:**
- All 3 agents required for >80% confidence threshold
- If agreement: Output marked with confidence score + crew attribution
- If disagreement (any agent <80% confident): Escalate to crew member (human-in-loop)
- If unanimous approval too quickly (<5s): Yar flags as suspicious (possible groupthink), requires additional human review

**Example Flow:**
```
User: "Add pagination to this API endpoint"
  ↓ Sub-Agent 1: Generates pagination logic + cursor implementation
  ↓ Sub-Agent 2: Validates syntax, type safety, backward compatibility
  ↓ Sub-Agent 3: Challenges—"What about deeply nested cursors? Performance?"
  ↓ [All agree >80%] → Output: "Pagination logic (92% confidence, reviewed by Riker+Yar+Data)"
  OR
  ↓ [Sub-Agent 3 only 65% confident] → Escalate: "Riker—edge case found. Needs human review."
```

### 1.4 Parallel Execution with Dependency Tracking (Riker's Coordination)

**Self-Organizing Task Sequencing:**

1. **Task Graph Construction:** When crew receives multi-faceted request (e.g., "Refactor API + update tests + deploy to staging"), Riker automatically decomposes into parallel tasks:
   - Task A (Riker): Refactor API code
   - Task B (Yar): Write/update tests
   - Task C (Geordi): Update deployment config
   - Task D (O'Brien): Verify CI/CD pipeline

2. **Dependency Detection:** Riker identifies blocking relationships:
   - Task B depends on Task A (tests must reference new API)
   - Task C depends on Task A (deployment config must match new API)
   - Task D is parallel to A/B/C (CI/CD verification)

3. **Auto-Coordination:** If Riker's API change would break Geordi's deployment config, system:
   - Flags dependency: "Riker's API change affects Geordi's config"
   - Suggests coordination: "Riker, propose API signature. Geordi will adapt deployment."
   - Continues in parallel: Doesn't wait for sequential completion

4. **Sub-Agent Parallelization:** Each crew member spawns 3 sub-agents *for their task*, creating up to N×3 parallel validations (N = crew members assigned).

### 1.5 WorfGate Security Model (Worf's Rules)

**Mandatory Validation Layers:**

| Layer | Control | Decision |
|-------|---------|----------|
| **Input Sanitization** | Worf scans all multimodal inputs for embedded payloads, malicious images, prompt injection | Auto-block suspicious inputs; log to audit trail |
| **Code Modification Scope** | Only approved workspace paths (src/, tests/, .github/); block .env, .ssh/, secrets | Green: auto-allow; Red: require human approval |
| **API Credential Brokering** | All Git/AWS/Aha credentials via WorfGate broker (never direct env access) | Authorized crew member + audit trail; never log secrets |
| **Cryptographic Signing** | All OpenRouter transactions signed with crew member ID + timestamp | Immutable audit record; prevents unauthorized attribution |
| **Autonomous Code Execution** | 3-sub-agent consensus + WorfGate final check before any `git commit` / `docker run` / `aws s3` | Human approval for main-branch commits; auto-allow dev/staging |

**Tiered Access Rules:**
- **GREEN (Auto-allow):** Code generation for feature branch (src/ modifications, tests/)
- **YELLOW (Bounded):** Infrastructure changes (Terraform, Docker)—crew proposes; human approves
- **RED (Require Approval):** Main-branch commits, production deployments, secrets access

### 1.6 Crew Attribution & Audit Trail (Uhura's Communications)

**Every autonomous output includes:**

```json
{
  "output": "...generated code or analysis...",
  "attribution": {
    "primaryCrew": "Riker (Implementation Lead)",
    "validators": ["Yar (QA)", "Data (Architecture)"],
    "confidenceScore": 0.92,
    "validationSteps": [
      { "agent": "Riker (Execute)", "status": "approved", "confidence": 0.95 },
      { "agent": "Yar (Verify)", "status": "approved", "confidence": 0.88 },
      { "agent": "Data (Challenge)", "status": "approved", "confidence": 0.92 }
    ]
  },
  "auditTrail": {
    "timestamp": "2026-07-18T14:32:15Z",
    "inputHash": "sha256:...",
    "workflowId": "uuid-...",
    "worfgateSignature": "...",
    "costUSD": 0.0042
  }
}
```

**User-Facing Attribution Tag:**
```
[SA-Riker+Yar+Data] Pagination API (92% ✓ consensus)
Generated in 3.2s, cost $0.004, reviewed for edge cases
```

---

## 2. MVP Scope (Phase 1 — 10 weeks)

**INCLUDE:**
- ✅ Text prompt input + code context (file selections, diffs)
- ✅ 3-sub-agent validation for code generation/analysis
- ✅ Parallel crew execution (Riker: code, Yar: tests, Data: architecture review)
- ✅ WorfGate security layer (input sanitization, path restrictions, audit trail)
- ✅ Crew attribution + confidence scores
- ✅ Feature branch execution (GREEN tasks auto-allow, RED require approval)
- ✅ VSCode chat UI replacing Copilot

**DEFER TO PHASE 2 (Post-MVP):**
- 🚫 Image/screenshot analysis (Vision) — architecture designed, implementation deferred
- 🚫 Voice transcription — deferred pending voice-to-text model selection
- 🚫 Full cross-repo analysis — start with single-repo, scale later
- 🚫 Production deployment autonomy — Phase 1 requires human approval for main branch
- 🚫 Advanced cost optimization (Quark integration) — manual budget tracking in Phase 1

---

## 3. Safety Model

### 3.1 Input Validation (Worf + Crusher)

**Multimodal Quarantine Protocol:**
1. All inputs (text, code, images, voice) routed to WorfGate quarantine zone
2. Malware scan on binary inputs (images for embedded payloads)
3. Format validation (code must parse, images must be PNG/JPG, voice must be WAV/MP3)
4. Prompt injection detection (regex for common attack patterns)
5. Release to crew only after quarantine clearance

### 3.2 Credential Brokering (Worf)

**No Direct Environment Access:**
```
Crew member (e.g., Riker) needs Git credentials
  ↓
Requests via resolveWorfGateCredential("github_token", "feature/add-pagination")
  ↓
WorfGate validates: Riker authorized? Context (feature branch) safe?
  ↓
Returns credential (never logged); audits request + response timestamps
  ↓
Riker uses credential; WorfGate monitors for misuse
```

**Secrets Never in Code:** All credentials live in `~/.alexai-secrets` or AWS Secrets Manager, loaded at runtime via shell environment, never committed.

### 3.3 Code Modification Scope (Worf + O'Brien)

**Allowlist Pattern:**
```json
{
  "allowedPaths": [
    "src/**/*.ts",      // Feature code
    "tests/**/*.test.ts", // Test files
    ".github/workflows/**", // CI/CD
    "docs/**/*.md"      // Documentation
  ],
  "blockedPaths": [
    ".env",
    ".env.local",
    ".aws/credentials",
    ".ssh/**",
    "node_modules/**",
    ".git/**"
  ],
  "requiresApproval": [
    "**main**",         // Main branch requires human approval
    "**/production/**", // Prod deployments require approval
    "package.json",     // Dependency changes require review
    "Dockerfile",       // Container changes require review
    "terraform/**"      // Infra changes require review
  ]
}
```

### 3.4 Consensus & Escalation (Yar)

**Disagreement Flow:**
```
User: "Implement Redis caching for API responses"
  ↓ Sub-Agent 1 (Riker): Generates caching layer
  ↓ Sub-Agent 2 (Yar): Validates correctness ✓
  ↓ Sub-Agent 3 (Data): Challenges—"Cache invalidation strategy?"
     → Data confidence: 60% (insufficient)
  ↓ ESCALATE to Data (crew member)
     "Redis caching implementation needs clarification: How to invalidate stale cache?"
  ↓ Data reviews + refines Sub-Agent 1's output
  ↓ Re-submit to validation (2nd round)
```

### 3.5 Audit Trail Immutability (O'Brien)

**Every autonomous action logged:**
```json
{
  "action": "code_generation",
  "timestamp": "2026-07-18T14:32:15Z",
  "crew": ["Riker", "Yar", "Data"],
  "input": "sha256:...", // Hash of input (never raw)
  "output": "sha256:...", // Hash of output (code diff stored separately)
  "decision": "approved",
  "worfgateSignature": "rsa-sig-...",
  "immutable": true
}
```

**Storage:** Audit trail written to Supabase `crew_operations` table + WorfGate immutable log. No modification allowed; only append.

---

## 4. Integration Plan: VSCode API → Crew Mission Pipeline

### 4.1 VSCode Chat UI Integration (Uhura)

**Current State:**
- VSCode chat input box
- Currently routes to Copilot/Claude Code via external API

**Integrated State:**
```typescript
// packages/vscode-extension/src/chat-integration.ts
vscode.lm.registerChatParticipant("story-agent", {
  async invoke(request, context, token) {
    // 1. Capture multimodal input
    const input = {
      text: request.prompt,
      codeContext: vscode.window.activeTextEditor?.document.getText(),
      selectedText: vscode.window.activeTextEditor?.document.getText(
        vscode.window.activeTextEditor.selection
      ),
      viewState: captureVSCodeViewProvider(context),
      workspaceRoot: vscode.workspace.rootPath
    };

    // 2. Route to crew mission pipeline via MCP
    const result = await runCrewMissionPipeline({
      input: JSON.stringify(input),
      missionReference: "vscode-chat-session-" + Date.now(),
      clientId: "familiarcat"
    });

    // 3. Display result with crew attribution
    request.response.markdown = `
[SA-${result.attribution.primaryCrew}] ${result.output}

**Confidence:** ${(result.attribution.confidenceScore * 100).toFixed(0)}%
**Time:** ${result.auditTrail.executionTime}ms
**Cost:** $${result.auditTrail.costUSD.toFixed(4)}
    `;
  }
});
```

### 4.2 View Provider Integration (Geordi)

**VSCode View Providers expose:**
- Explorer: file tree, project structure
- Debug: stack traces, breakpoints, watch state
- Terminal: command history, output
- Problems: errors, warnings, diagnostics

**Crew Access:**
```typescript
// Capture current VSCode diagnostic state
const diagnostics = vscode.languages.getDiagnostics();
const viewState = {
  openFiles: vscode.window.visibleTextEditors.map(e => e.document.fileName),
  diagnostics: diagnostics.map(d => ({ file: d[0].fsPath, issues: d[1] })),
  debugState: await vscode.debug.activeDebugSession?.state(),
  gitBranch: await getGitBranch()
};
```

### 4.3 File System & Git Integration (Riker)

**Autonomous file operations via agent-core loop:**
```typescript
// Run crew code generation, then apply to workspace
const diff = await runCrewMissionPipeline({ /* ... */ });

// Apply via Git (allows easy rollback)
await git.createBranch("story-agent/feature-xyz");
await fs.writeFile(filePath, modifiedCode);
await git.stage(filePath);
await git.commit(`[SA-Riker] Generated pagination logic (92% confidence)`);

// Push to feature branch (not main)
await git.push("origin", "story-agent/feature-xyz");

// Crew can open PR automatically if requested
```

### 4.4 MCP Tool Integration (Data)

**VSCode extension connects to story-agent MCP server:**
- `run_crew_mission_pipeline` — primary deliberation engine
- `crew-get-relevant-memories` — recall prior solutions
- `crew-store-memory` — persist learnings
- `worfgate_audit_log` — verify security compliance
- `aha-list-features` — tie crew work to product backlog

---

## 5. End-to-End Workflow

### 5.1 User Prompt → Crew Attribution → Result

**Example: "Add user authentication with OAuth2"**

```
1. USER PROMPT (VSCode Chat)
   "Add GitHub OAuth2 authentication to our API endpoints"
   [selected code: existing auth.ts file]

2. INPUT CAPTURE (extension)
   - Text: "Add GitHub OAuth2..."
   - Code context: auth.ts (selected file)
   - ViewState: Problems showing "no auth on POST /api/data"
   - Workspace: /Users/dev/my-app

3. CREW ASSIGNMENT (Riker)
   Primary: Riker (implementation)
   Validators: Data (architecture), Yar (testing)
   Coordinator: O'Brien (if deployment needed)

4. PARALLEL VALIDATION
   Sub-Agent 1 (Riker/Execute): Generates OAuth2 flow + middleware
   Sub-Agent 2 (Yar/Verify): Validates type safety, error handling
   Sub-Agent 3 (Data/Challenge): "What about token refresh? Rate limiting?"

5. WORFGATE CHECK
   Input: OAuth2 endpoint URL safe? (✓ approved)
   Output: Modifies only auth.ts (✓ allowlisted)
   Credentials: Requests GitHub OAuth app secret (✓ routed via broker)

6. CONSENSUS (if all >80%)
   Generate code diff
   Create audit record
   Prepare result

7. ESCALATION (if disagreement)
   Data: "Token refresh strategy unclear" (70% confidence)
   → Escalate to Data crew member
   → Data reviews Sub-Agent outputs, refines
   → Re-validate

8. RESULT (VSCode Chat)
   [SA-Riker+Data+Yar] GitHub OAuth2 Authentication (88% ✓ consensus)

   ```typescript
   // Generated code with inline comments
   export const githubAuthMiddleware = (req, res, next) => {
     // [Sub-Agent 1: Riker generated this flow]
     // [Sub-Agent 2: Yar verified type safety ✓]
     // [Sub-Agent 3: Data flagged token refresh—see below]
     
     // Token refresh strategy:
     // - Store refresh_token securely (encrypted)
     // - Implement automatic refresh 5 min before expiry
     // - Handle revocation gracefully
   };
   ```

   **Confidence:** 88%
   **Validation:** Riker (execute) 92%, Yar (verify) 84%, Data (challenge) 88%
   **Time:** 3.2s (parallel sub-agents)
   **Cost:** $0.0042
   **Audit:** workflow-id uuid-..., signed by WorfGate

9. USER ACTION
   Option A: Accept → crew creates feature branch + stages diff
   Option B: Iterate → "Can you add rate limiting?"
   Option C: Review Crew Reasoning → expand confidence scores, see sub-agent notes

10. AUTOMATIC WORKFLOW (if approved)
    - Create branch: story-agent/github-oauth2
    - Commit: "[SA-Riker] GitHub OAuth2 (88% consensus)"
    - Push to origin
    - Open PR with crew validation summary
    - Tag Data + Yar as reviewers (optional human review)
```

---

## 6. Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Hallucinations in Generated Code** | HIGH | 3-sub-agent consensus (Sub-Agent 2 catches syntax errors; Sub-Agent 3 challenges logic) |
| **Race Conditions in Parallel Execution** | MEDIUM | Dependency graph + explicit sequencing; Riker coordinates order-of-operations |
| **Cost Spirals (infinite loops of validation)** | MEDIUM | Crusher monitors system load; auto-throttle if >80% CPU/memory; Quark sets hard budget caps |
| **Security Violations (Worf bypass)** | HIGH | Multi-layer validation: input sanitization + path restrictions + credential brokering + audit trail immutability |
| **Unanimous Approval Too Fast (Groupthink)** | MEDIUM | Yar flags sub-agents agreeing in <5s; requires human review if possible blind spots |
| **Credential Leakage** | CRITICAL | WorfGate broker (never direct env); all access audited; secrets in `~/.alexai-secrets` |
| **User Confusion (Crew Paradigm)** | MEDIUM | Clear attribution tags + confidence scores + audit trail visibility; phased onboarding |
| **Dependency Management (e.g., Riker's change breaks Geordi's config)** | MEDIUM | Dependency detection + auto-coordination proposal; Riker suggests "Talk to Geordi about config impact" |
| **Latency SLA (Developer Expects <5s Response)** | MEDIUM | Parallel sub-agents (3 × speedup); local caching; async results in chat history if >5s |
| **Stale Data (VSCode view provider snapshot outdated)** | LOW | Refresh view state on each prompt; Crusher monitors for cache staleness |

---

## 7. Timeline: Phase 1 MVP

| Week | Deliverable | Owner |
|------|-------------|-------|
| 1-2 | Multimodal input processor (text/code) + Data API | Data |
| 2-3 | 3-sub-agent validation framework + consensus logic | Yar |
| 3-4 | WorfGate integration (input sanitization, path restrictions) | Worf |
| 4-5 | Crew mission router + parallel execution engine | Riker |
| 5-6 | VSCode chat UI integration (MCP connection) | Uhura |
| 6-7 | Git integration (branch creation, staging, commit) | O'Brien |
| 7-8 | Audit trail + crew attribution (WorfGate signing) | O'Brien |
| 8-9 | System health monitoring + auto-throttling | Crusher |
| 9-10 | E2E testing + security audit | Worf + Yar |
| 10-11 | Documentation + user onboarding guide | Uhura |
| 11-12 | Dogfooding + iteration with internal users | Picard |

**Go-Live Target:** End of Q3 2026 (assuming start date now)

---

## 8. Crew Consensus & Go/No-Go Decision

### Unanimous Agreement On:

✅ **Replace Copilot Chat entirely** — Story Agent crew provides superior validation + cost efficiency + transparency  
✅ **3-sub-agent validation system** — Essential to reduce hallucinations; consensus >80% threshold  
✅ **WorfGate security layer** — Mandatory for autonomous operations; no exceptions  
✅ **Crew attribution + audit trails** — Builds trust + compliance + organizational learning  
✅ **Balanced approach for MVP** — Conservative too limiting; aggressive adds complexity  

### Areas of Healthy Disagreement (Resolved by Riker):

**Multimodal Scope (Phase 1):**
- **Crusher + Geordi:** Include Vision (image analysis) in Phase 1 for UI mockups
- **Uhura + Riker (Final Decision):** Defer Vision to Phase 2; text/code sufficient for MVP. Vision adds implementation complexity without core value.

**Production Deployment Autonomy:**
- **O'Brien + Geordi:** Crew should auto-deploy to staging without approval
- **Worf (Final Decision):** Require human approval for any deployment; auto-allow feature branches only in Phase 1. Reconsider in Phase 2 after dogfood learns crew reliability.

**Cost Controls:**
- **Quark:** Integrate cost optimization engine in Phase 1 (auto-select cheapest model per task)
- **Picard (Final Decision):** Manual budget tracking in Phase 1; Quark optimization in Phase 2 once workflow stabilizes.

### Final Recommendation:

**VERDICT: GO**

**Approve Balanced Approach (MVP Phase 1):**
1. Text + code input, 3-sub-agent validation, WorfGate security, crew attribution
2. Feature branch execution (auto-allow). Main branch requires human approval.
3. Defer Vision/Voice/Production autonomy to Phase 2.
4. Timeline: 10-12 weeks; Cost: ~$8,200/year (vs. Copilot $24,000 @ 100 users = 65% savings)

**Success Criteria:**
- ✓ Zero credential leaks (WorfGate audit trail clean)
- ✓ Sub-agent consensus >90% on generated code (measured in dogfood)
- ✓ Sub-agent disagreement <5% (escalations rare, manageable)
- ✓ Latency <10s for 80% of requests (parallel execution + caching)
- ✓ User confidence in crew attribution increases week-over-week (survey)

---

## Appendix: Crew Deliberation Highlights

**Picard (Command):**
"My concern is balancing security with crew agility. We implement tiered access: critical systems require command authorization, routine coding assistance operates with lighter safeguards."

**Data (Architecture):**
"Multimodal data pipeline normalizes all input types into unified JSON-LD structure. Main challenge is maintaining data lineage across parallel execution branches via cryptographic hashing + WorfGate signatures."

**Worf (Security):**
"Security is non-negotiable. WorfGate mandatory validation before any autonomous code execution. Cryptographic signing of all transactions, strict input/output sandboxing for multimodal inputs."

**Riker (Implementation):**
"MVP prioritizes text/code input, deferring image/voice to avoid scope creep. Crew assignment workflow must route user tasks → autonomous execution → result without human bottleneck."

**Yar (QA):**
"3-sub-agent validation essential. If all three agents agree too quickly (<5s), flag as suspicious for human review—parallel execution could mask blind spots."

**Geordi (Infrastructure):**
"Parallel execution pools with load balancing. Local caching + request connection pooling to maintain developer responsiveness during peak API usage."

**O'Brien (DevOps):**
"Foundation first: implement WorfGate security + audit logging before scaling autonomy. Multi-factor authentication on API calls, comprehensive logging of crew interactions."

**Crusher (Health):**
"Real-time system vitals monitoring during parallel execution. Auto-throttle processing when CPU/memory thresholds breached. Multimodal input pipeline risks overload; deploy triage + malware scanning."

**Uhura (Communications):**
"Developer adoption hinges on clear crew attribution ([SA-Engineering] tags). Phased onboarding highlighting 3-agent validation accuracy. Audit trails for every autonomous change, labeled by originating agent."

**Quark (Finance):**
"Cost model: crew members × sub-agents × API calls. OpenRouter cost-effectiveness vs. Copilot ($20/user/month) critical to ROI. 12-month financial model needed to justify transition."

---

**Mission Complete: Crew Consensus Achieved**  
**Stored to RAG:** `vscode-extension-crew-autonomy-architecture`  
**Next Action:** Assign Phase 1 implementation tasks to crew (Week 1 sprint planning)

