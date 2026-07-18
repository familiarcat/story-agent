# MILESTONE: VSCode Extension Crew Autonomy Architecture — Multimodal NL + Autonomous Codebase Analysis

**Date:** 2026-07-18  
**Status:** ✅ ARCHITECTURE APPROVED — PHASE 1 IMPLEMENTATION READY  
**Confidence:** 9/10 crew alignment  
**Timeline:** 10-12 weeks to Phase 1 completion

---

## Executive Summary

The Story Agent crew has designed a **complete replacement for Copilot Chat + Claude Code**, integrating the crew's OpenRouter system as the primary VSCode coding assistant. The extension will support multimodal input, autonomous codebase analysis, 3-sub-agent validation (hallucination prevention), and parallel execution with full crew attribution.

### Strategic Vision

**Transform VSCode from a single-LLM chat tool into a team-based autonomous coding assistant** where:
- Users type prompts
- Crew members (Riker, Yar, Data, Worf, Geordi, etc.) autonomously analyze + fix code
- 3 sub-agents per crew member validate correctness before output
- Full audit trail + crew attribution for every change
- 65% cost savings vs Copilot ($82/user/year vs $240/user/year)

### User Experience (Target State)

```
User (VSCode Chat): "Fix the authentication bug where expired tokens aren't refreshed"

↓ [Crew Takes Over]

System Output:
✅ CREW EXECUTION COMPLETE

Lead: Riker (Implementation) — 0.94 confidence
├── Generated auth token refresh fix (42 lines)
├── Sub-agents agreed: Execute (0.96), Verify (0.93), Challenge (0.92)

Supporting Crew:
├── Worf (Security): ✅ APPROVED (0.97 confidence, no credential leaks)
├── Data (Architecture): ✅ APPROVED (0.88 confidence)
├── Yar (Tests): ✅ APPROVED (0.91 confidence, 95% coverage)

Branch: feature/fix-auth-token-refresh
Cost: $0.032 | Execution Time: 42 seconds

🔗 [View Diff] [Open PR] [Audit Trail]
```

---

## Architecture Specification

### 1. Multimodal Input Pipeline

**Inputs Supported:**
- **Text:** Natural language prompts ("fix the bug", "add feature X", "optimize this")
- **Code context:** Selected text, file references, git diffs
- **Diagnostics:** VSCode Problems panel, Error/Warning messages
- **View state:** Explorer structure, Debug console, Terminal output
- **Phase 2:** Vision (screenshot analysis), Voice (audio transcription)

**Context capture flow:**
```
VSCode Editor State → Extract multimodal context → Compress + prioritize → Pass to crew mission pipeline
```

### 2. 3-Sub-Agent Validation System (Hallucination Prevention)

**Each crew member deploys 3 sub-agents in parallel:**

1. **Sub-Agent 1 (Execute):** Generate code/analysis/recommendation
2. **Sub-Agent 2 (Verify):** Check correctness, syntax, no breaking changes
3. **Sub-Agent 3 (Challenge):** Identify edge cases, alternatives, risky assumptions

**Consensus Mechanism:**
- All 3 must be >80% confident before output is presented
- If any <80%: Escalate to crew member (human-in-loop gate)
- Result shows confidence scores for transparency

**Example (Token Refresh Fix):**
```
Riker's 3 sub-agents:
├── Sub-1 (Execute): Generates refresh logic → 0.96 confidence
├── Sub-2 (Verify): Checks no race conditions, proper cleanup → 0.93 confidence
├── Sub-3 (Challenge): Edge case—concurrent token requests? → 0.92 confidence
└── Consensus: 0.94 → APPROVED ✅
```

### 3. Parallel Execution Engine with Dependency Tracking

**Parallel Execution (Simultaneous):**
```
Riker (Code Implementation) 
├── Sub-agent validation (3× agents)
├── Execute in parallel with:
│   ├── Yar (Test generation + validation)
│   ├── Data (Architecture review)
│   ├── Worf (Security audit)
│   └── Geordi (Deployment config)
```

**Dependency Tracking:**
- If Riker modifies API → flag Geordi's deployment config as dependent
- If Yar adds tests → Riker's code must support new test coverage
- Automatic sequencing: "Run Data's architecture review before Riker codes"
- Explicit ordering when dependencies detected

**Execution Order:**
1. Non-dependent tasks: Parallel
2. Dependent tasks: Wait for blocker + validation
3. Consensus check: All sub-agents >80% before proceeding

### 4. Safety Model: Multi-Layer WorfGate Protection

**Layer 1 — Input Sanitization:**
- Quarantine all user input as untrusted
- Prompt injection detection (9+ patterns)
- Code injection prevention (no eval/exec)
- Credential redaction (no secrets in logs)

**Layer 2 — Credential Brokering:**
- Crew never accesses env directly
- All credential access audited: `resolveWorfGateCredential()`
- Git operations, AWS access via broker only
- Audit trail: who, when, operation

**Layer 3 — Code Modification Allowlist:**
- ALLOW: `src/`, `tests/`, `.github/`, `docs/`
- BLOCK: `.env`, `.ssh/`, `.git/`, `/etc/`, root overwrites

**Layer 4 — Disagreement Escalation:**
- If any sub-agent <80% confident → mark as "REVIEW REQUIRED"
- Show disagreement reason + rationales
- Escalate to crew member (human-in-loop)

**Layer 5 — Immutable Audit Trail:**
- Supabase `crew_code_operations` table (append-only)
- Cryptographically signed operations
- Never deletable; tampering detected
- Full compliance trail for audits

### 5. Integration Points

**VSCode APIs:**
- Chat UI (command palette, chat panel)
- Problems panel (diagnostics)
- Editor state (selection, diagnostics)
- Explorer (workspace structure)
- Debug console, Terminal output

**MCP Tools:**
- `run_crew_mission_pipeline()` — route prompts to crew
- `crew:store-memory` / `crew:get-memories` — RAG integration
- `worfgate:credential-broker` — secure credential access
- Git operations via O'Brien's MCP tool

**Git Integration:**
- Auto-create feature branches
- Stage files based on crew changes
- Commit with crew attribution + confidence scores
- Push to origin (feature branches autonomous, main requires human approval)

---

## MVP Scope: Phase 1 (10-12 Weeks)

### ✅ Included

| Capability | Owner | Timeline |
|-----------|-------|----------|
| Text + code context input | Data | Weeks 1-2 |
| 3-sub-agent validation framework | Yar | Weeks 2-3 |
| WorfGate integration | Worf | Weeks 3-4 |
| Crew mission router + parallel execution | Riker | Weeks 4-5 |
| VSCode chat UI | Uhura | Weeks 5-6 |
| Git integration + audit trails | O'Brien | Weeks 6-8 |
| Health monitoring (cost, latency, CPU) | Crusher | Weeks 7-9 |
| E2E testing (autonomous bug fix) | Yar | Weeks 8-10 |
| Documentation + dogfooding | Uhura | Weeks 10-12 |

### 🚫 Deferred to Phase 2

- Vision integration (screenshot analysis)
- Voice input (audio transcription)
- Production branch autonomy (human approval first)
- Advanced multimodal (video analysis)

### Phase 1 Branching Strategy

**Feature Branches:** ✅ Crew autonomous (create, commit, push)  
**Main Branch:** 🔒 Human approval required (safety-first)

---

## E2E Workflow: User Prompt → Autonomous Execution

### 1. User Prompt in VSCode Chat
```
"Fix the authentication bug where expired tokens aren't refreshed"
```

### 2. Capture Multimodal Context
- File selections
- Diagnostics (error messages)
- View state (workspace structure)
- Git context (current branch)

### 3. Route to Crew Mission Pipeline
- Picard (intake): Distill goal
- Riker (assembly): Assign crew
- Quark (routing): Select models per crew member
- Crew (deliberation): All members contribute findings

### 4. 3-Sub-Agent Validation

**Riker (Implementation):**
- Sub-1: Generate fix
- Sub-2: Verify syntax + correctness
- Sub-3: Challenge edge cases
- Consensus: All >80% → proceed

**Yar (QA):**
- Sub-1: Generate tests
- Sub-2: Verify coverage
- Sub-3: Challenge assumptions
- Consensus: All >80% → proceed

**Worf (Security):**
- Sub-1: Audit token handling
- Sub-2: Verify no credential leaks
- Sub-3: Challenge assumptions
- Consensus: All >80% → APPROVED or VETO

### 5. WorfGate Validation
- Sanitize generated code
- Verify credential access
- Check file modification allowlist
- Final gate: APPROVED or BLOCKED

### 6. Auto-Create Branch + Commit
```
Branch: feature/fix-auth-token-refresh
Commit Message:
  fix: Implement token refresh for expired sessions
  
  Crew: Riker (impl) + Yar (tests) + Worf (security) + Data (arch)
  Sub-agent consensus: 0.94 (Riker), 0.91 (Yar), 0.97 (Worf), 0.88 (Data)
  Execution time: 42s | Cost: $0.032
```

### 7. Result in VSCode Chat
- Lead crew member + confidence score
- Supporting crew + approvals
- Branch link, PR link, audit trail link
- Cost + execution time

---

## Timeline: Phase 1 Completion

| Week | Track | Owner | Deliverable |
|------|-------|-------|-------------|
| 1-2 | Multimodal Input | Data | Text + code context parser |
| 2-3 | 3-Sub-Agent Framework | Yar | Validation engine |
| 3-4 | WorfGate Integration | Worf | Sanitization + credential brokering |
| 4-5 | Crew Mission Router | Riker | Parallel execution + dependency tracking |
| 5-6 | VSCode Chat UI | Uhura | Chat panel + command palette |
| 6-8 | Git Integration | O'Brien | Branches, commits, audit trails |
| 7-9 | Health Monitoring | Crusher | Cost tracking, latency SLA, thermal |
| 8-10 | E2E Testing | Yar | Autonomous bug fix end-to-end |
| 10-12 | Documentation + Dogfooding | Uhura | Release notes, internal testing |

**Phase 1 Go-Live: End Q3 2026** (approximately 2026-09-30)

---

## Cost Impact: 65% Savings vs Copilot

| Model | Annual (100 users) | Per User/Year |
|-------|---------|---------|
| Story Agent MVP | $8,200 | $82 |
| Copilot | $24,000 | $240 |
| **Savings** | **$15,800** | **$158** |

**Advantages:**
- Transparent crew attribution
- 3-sub-agent hallucination prevention
- Immutable audit trail
- Parallel execution (faster)

---

## Crew Consensus: Unanimous GO

✅ **All 11 officers approved** Phase 1 approach

**Healthy disagreements resolved:**
1. Vision in Phase 1? → Phase 2 (prioritize text/code MVP)
2. Production autonomy in Phase 1? → Phase 2 (human approval first)
3. Cost optimization timing? → Phase 1 (hard caps + auto-throttle)

---

## Crew Sign-Offs

✅ **Picard (Command):** GO for Phase 1 implementation
✅ **Riker (Execution Lead):** Sprint assignments ready
✅ **Data (Architecture):** Multimodal pipeline validated
✅ **Worf (Security):** Multi-layer WorfGate approved
✅ **Yar (QA):** 3-sub-agent framework + E2E testing planned
✅ **Geordi (Infrastructure):** VSCode API integration ready
✅ **O'Brien (DevOps):** Git + audit integration ready
✅ **Crusher (Health):** Monitoring framework ready
✅ **Troi (Stakeholders):** User expectations aligned
✅ **Uhura (Communications):** Release messaging ready
✅ **Quark (Finance):** $82/user/year cost model locked

---

## Next Steps

1. ✅ **Architectural approval:** APPROVED
2. → **Sprint planning:** Assign Week 1-2 tasks (Data, Yar, Worf, Riker)
3. → **Begin Phase 1 implementation:** THIS WEEK or next week
4. → **Internal dogfooding:** Weeks 10-12
5. → **Phase 1 Go-Live:** End Q3 2026

---

## Files Created

- `docs/architecture/vscode-extension-crew-autonomy-spec.md` — Full 40+ page specification
- `docs/execution/MILESTONE_VSCODE_EXTENSION_CREW_AUTONOMY.md` — This milestone document
- RAG stored under tag: `vscode-extension-crew-autonomy-architecture`

**🖖 Crew Standing By — Phase 1 Sprint Ready**

Co-Authored-By: Picard (Command) <noreply@crew.agent>  
Co-Authored-By: Riker (Execution Lead) <noreply@crew.agent>  
Co-Authored-By: Worf (Security Officer) <noreply@crew.agent>  
Co-Authored-By: Full 11-Member Crew <noreply@crew.agent>
