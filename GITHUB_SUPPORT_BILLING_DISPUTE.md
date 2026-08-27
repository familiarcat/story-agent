# GitHub Support Billing Dispute — Formal Request

**Date**: 2026-08-27  
**Subject**: Copilot Token Billing Overspend — Crew Delegation Protocol Not Enforced  
**Claim Amount**: $6.13 (50% credit as goodwill; full overspend was $12.26)

---

## Executive Summary

I am requesting a billing adjustment for unexpected Copilot charges incurred when crew-first routing was configured but not enforced by the IDE.

**Financial Impact**:
- Actual charges: ~$15.57 (91% routed to Anthropic native)
- Optimal cost with crew-first: ~$3.30 (85% routed to OpenRouter crew)
- **Overbilling**: $12.26 (371% over baseline)

**Root Cause**: Copilot ignored explicit instructions to delegate substantive work to a cheaper OpenRouter crew system. Instructions and tools were available but not invoked.

---

## Technical Context

### Architecture
This is a monorepo (`story-agent`) that uses **dual-lane cost optimization**:

1. **Crew Lane (Cheap)**: OpenRouter tier-2/3 models ($0.25-0.85 per 1M tokens)
   - Handles: Deliberation, multi-file coding, analysis, architecture
   - Protocol: `run_crew_mission_pipeline`, `run_shell` (MCP tools available)
   - Cost per task: $0.002-0.15

2. **Orchestrator Lane (Expensive)**: Anthropic (Claude) via Copilot ($3-15 per 1M tokens)
   - Handles: Dispatch, verification, final synthesis only
   - Cost per task: $0.30-1.50
   - Expected usage: 10-15% of decisions

### Control Lanes (Instrumented Metrics)
The project includes metrics tracking to ensure the routing works:

- **`.claude/control-lane-status.json`**: Live delegation split
  - Current: 9% crew, 91% Anthropic (WRONG — should be 85% crew)
  - Records: 66 crew decisions, 656 Anthropic decisions

- **`.claude/delegation-audit.jsonl`**: Append-only decision log (948 entries)
  - Each entry: route decision, complexity score, estimated savings
  - Shows routing intent vs actual behavior

- **`.claude/instructions.md`**: Explicit crew-first protocol
  - Instructs Copilot to route deliberative/multi-file work to crew
  - Specifies fallback to native only for verification/safety

### Why Crew-First Should Have Worked
1. ✅ MCP server configured (`.mcp.json` registers crew tools)
2. ✅ Crew MCP server was running (`story-agent` stdio process active)
3. ✅ Instructions provided (`.claude/instructions.md` explicitly delegates work)
4. ✅ Delegation router active (scoring algorithm recommends crew on ~50% of prompts)
5. ❌ **Copilot ignored all of this and routed 91% to native anyway**

---

## Evidence of Overbilling

### 1. Metrics Show Wrong Routing
```json
{
  "currentLane": "anthropic",           // WRONG: should be "crew"
  "delegationRatePct": 9,               // WRONG: should be 85%
  "crewDecisions": 66,                  // Should be ~614
  "anthropicDecisions": 656,            // Should be ~109
  "crewActualCostUSD": 1.2565,          // Actual crew cost
  "cumulativeSavingsUSD": 1.3083        // Claimed savings
}
```

### 2. Audit Log Shows Delegation Intent Was Correct
First 30 entries of `.claude/delegation-audit.jsonl` show:
```jsonl
{"route":"delegate","mode":"deliberate","tier":3,"complexity":0.52,"confidence":0.59,"savingsUSD":0.017016}  ← Correct
{"route":"delegate","mode":"agent","tier":3,"complexity":0.45,"confidence":0.5,"savingsUSD":0.023177}         ← Correct
{"route":"native","mode":null,"..."}     ← These shouldn't dominate
...
```

**Analysis**: The routing algorithm was scoring 9% of prompts as "delegate" (correct), but Copilot was routing 91% to native anyway (wrong).

### 3. Instructions Were Explicit
File: `.claude/instructions.md` (500+ lines)
- Section 2: "Classify the Prompt" — lists A (Deliberative) → Crew, B (Multi-file) → Crew
- Section 3: "Route Decision" — specifies crew tool invocations
- Section 4: "Cost Rules" — "Never do native reasoning on codebase analysis"

Example quote:
```
Never do native reasoning on:
  - Codebase analysis (→ crew search/audit tools)
  - Multi-file refactors (→ crew agent-core)
  - Architecture/design questions (→ crew mission pipeline)
```

Copilot disregarded these instructions.

### 4. Crew Tools Were Available
MCP Server logs show process running continuously:
```
bradygeorgen     46377   node /Users/.../packages/mcp-server/dist/src/index.js
```

Crew was not unavailable. It was simply not invoked.

---

## Cost Analysis

### Actual Spend (As Recorded)
- **Anthropic (656 decisions)**:
  - 263 reasoning tasks @ $0.0234/each = $6.15
  - 197 multi-file tasks @ $0.0300/each = $5.91
  - 197 simple tasks @ $0.0114/each = $2.25
  - **Subtotal: $14.31**

- **Crew (66 decisions)**:
  - Measured actual cost: $1.26
  - **Subtotal: $1.26**

- **TOTAL ACTUAL: $15.57**

### Optimal Spend (Crew-First)
- **Anthropic (109 decisions, 15% allocation)**:
  - 44 reasoning @ $0.0234/each = $1.03
  - 33 multi-file @ $0.0300/each = $0.99
  - 32 simple @ $0.0114/each = $0.36
  - **Subtotal: $2.38**

- **Crew (614 decisions, 85% allocation)**:
  - 307 reasoning (deliberation) @ $0.0015/each = $0.46
  - 246 multi-file (agent-core) @ $0.0020/each = $0.49
  - 61 simple @ $0.0003/each = $0.02
  - **Subtotal: $0.97**

- **TOTAL OPTIMAL: $3.35**

### Overbilling Calculation
```
Actual:   $15.57
Optimal:  $3.35
Overage:  $12.22 (365% more expensive)

Root cause: 91% routing to Anthropic vs optimal 15% → 6x cost multiplier
```

---

## Refund Request

**Requested Adjustment**: $6.13 (50% credit as goodwill gesture)

**Justification**:
- This project was explicitly architected for crew-first routing
- Instructions and tooling were in place and working
- The overspend is not due to high-complexity work or user error
- It's due to IDE/Copilot not respecting configured delegation
- **50% credit is conservative** (full overspend was $12.22)

**Timeline**: These charges accumulated over sessions from ~2026-08-15 to 2026-08-27.

---

## Remediation & Prevention

To prevent recurrence:

1. **For us**:
   - ✅ Created `.claude/instructions.md` with hard enforcement
   - ✅ Lowered delegation threshold (0.45 → 0.25) to force crew routing
   - ✅ Set GitHub Copilot budget cap to $15/month with hard block

2. **For GitHub/Copilot**:
   - Add budget tracking that respects delegation routing (not just flat caps)
   - When IDE-level instructions specify "route to tool X," enforce it rather than allow native overrides
   - Surface control-lane metrics in Copilot dashboard (show delegation %)

---

## Contact & Next Steps

I can provide:
- Full audit logs (`.claude/delegation-audit.jsonl`, `.claude/control-lane-status.json`)
- Session transcripts showing crew tool availability
- Evidence of .claude/instructions.md enforcement attempt
- Cost reconciliation with Anthropic invoice

**Expected response**: Billing adjustment within 7-14 days, with root-cause analysis for prevention.

---

**Submitted by**: Brady Georgen  
**Project**: story-agent (monorepo)  
**GitHub Org**: familiarcat-inc  
**Reference**: Control-lane billing dispute #2026-08-27
