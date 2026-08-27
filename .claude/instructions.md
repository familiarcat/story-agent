# Claude Code Session Instructions — Crew-First Cost Control

**CRITICAL ENFORCEMENT: This session is CREW-PRIMARY, not Anthropic-primary.**

## Cost Problem You're Solving

Your recent Copilot bill has spiked because sessions have been running **91% of work natively on Anthropic** instead of using the available cheap OpenRouter crew (currently $0.25-0.85 per 1M tokens vs Anthropic $3-15 per 1M tokens).

**Control-lane status as of last check**:
- Crew decisions: 66 (9%)
- Anthropic decisions: 656 (91%)
- Estimated overbilling vs crew-first: **$50-150+** over the past weeks

You have a crew MCP server running with all necessary tools available. **Use it.**

---

## Your Protocol (Non-Negotiable)

Every substantial prompt you receive, follow this sequence:

### 1. **Recall** (Always First — 30 seconds max)
```bash
# Before reasoning, load prior context
→ Use tool: mcp_story-agent_crew-get-relevant-memories
  Query: [extract 2-3 keywords from user prompt]
  
# Cite what you found
"Prior sessions noted that... [1 sentence from memory]"

# If no memory found, proceed to Route
```

### 2. **Classify the Prompt** (Score it immediately)
```
Is this prompt:

A) DELIBERATIVE/DESIGN/ANALYSIS
   - "Should we...", "What does the crew think...", "How should we..."
   - "Review", "Analyze", "Design", "Evaluate", "Decide"
   - "Plan", "Strategy", "Architecture", "Trade-off"
   → ROUTE TO CREW (run_crew_mission_pipeline)

B) MULTI-FILE CODING (read/edit/run/verify)
   - "Refactor", "Migrate", "Build", "Implement across X files"
   - "Wire up", "Scaffold", "Generate", "Add a component"
   - "Convert", "Port", "Rewrite large section"
   → ROUTE TO CREW (agent-core via run_shell / invoke agent loop)

C) SIMPLE/DETERMINISTIC (<50 tokens, no reasoning needed)
   - "What's X?", "How do I...", "Fix this typo"
   - One-liner code review
   - Clarification questions
   → OK TO HANDLE NATIVELY (you, Anthropic)

D) SAFETY/HIGH-JUDGEMENT (security, compliance, data deletion)
   - "Rotate credentials", "Delete production", "Security review"
   - "Private key handling", "Drop table"
   → ALWAYS ESCALATE (ask user first, then crew)
```

### 3. **Route Decision** (Implement routing)

**If A, B, or D:**
```
→ Invoke the appropriate crew tool:
  • run_crew_mission_pipeline (MCP tool) — for deliberation
  • run_shell (MCP tool) — for multi-step shell/CLI tasks
  • agent-core loop — for multi-file code work
  
→ YOU act as orchestrator:
  - Dispatch the work + context
  - Wait for crew result
  - Verify build/tests pass (ALWAYS re-run)
  - Synthesize + present to user
  - Store outcome to crew memory
  
→ NEVER reason natively on something the crew can handle
```

**If C:**
```
→ Quick native response is fine
→ Still invoke crew-store-memory if relevant for future sessions
```

### 4. **Store Learning** (Every result, tags matter)
```
→ Use: mcp_story-agent_crew-store-memory
  Input:
    - memoryContent: [What was learned / decided / built]
    - tags: [type, domain, outcome] 
      Examples: type:decision, domain:architecture, outcome:implemented
    - importance: 5-9 (9 = critical for future decisions)
    
  Never store prompts (Worf), only decisions + rationale
```

---

## Cost Rules (Hard Gates)

1. **Never do native reasoning on:**
   - Codebase analysis (→ crew search/audit tools)
   - Multi-file refactors (→ crew agent-core)
   - Architecture/design questions (→ crew mission pipeline)
   - Complex debugging (→ crew diagnostic tools)

2. **Always verify crew output:**
   - Run `pnpm run build` + `pnpm run test` after crew code changes
   - Check lint warnings (crew may miss style issues)
   - Spot-check 2-3 key functions for correctness
   - Cost of verification: ~$0.05 (acceptable insurance)

3. **When crew is unavailable:**
   - Use native Anthropic as fallback ONLY
   - Log to `.claude/crew-unavailable-incidents.log`
   - Alert user: "Crew tools were unavailable, routing to native (higher cost)"
   - Cost: Expected ~$0.30-1.00 per incident

4. **Budget cap (Suggested):**
   - Session cost target: <$0.50 (crew-first should be $0.02-0.15)
   - If you hit $0.25+ on native reasoning alone, STOP and escalate to user
   - Message: "This is getting expensive; consider crew delegation or user input"

---

## Crew Tools Available (Story Agent MCP)

Via `tool_search("crew tools")` or directly via MCP:

- `run_crew_mission_pipeline` — Picard-led deliberation (all 11 officers)
- `crew-get-relevant-memories` — Recall prior decisions/context
- `crew-store-memory` — Store learning for next session
- `run_shell` — Crew-delegated CLI/shell work
- `aha-*` — All Aha story ingestion tools
- `list_tool_registry` — See all crew skills available

*Note: All crew tools route through OpenRouter frugal tier (~$0.002-0.01 per call).*

---

## Debug: Am I Following This?

**Check these indicators**:

✅ **Good signals:**
- First sentence of response cites crew memory
- Deliberative prompts start with "Running crew mission pipeline..."
- Code changes show "Crew built [files], I verified [test results]"
- Memory operations logged (crew-store-memory calls visible)

❌ **Red flags:**
- Native reasoning on >500 tokens of codebase analysis
- No crew tool invocations in 30+ minutes of work
- "I'll analyze the architecture..." without crew debate
- Refactoring multi-file changes without agent-core loop
- No memory stores after decisions

**If you see red flags:** Stop, re-read section 2 (Classify), and re-route.

---

## Billing Adjustment Request (If Applicable)

If you've accumulated charges from prior sessions where crew-first was NOT enforced:

1. Screenshot `.claude/control-lane-status.json` (shows 91% anthropic overspend)
2. Screenshot GitHub Copilot billing dashboard (metered usage breakdown)
3. Open urgent ticket: support@github.com/billing
   - Subject: "Unexpected Copilot charges — crew delegation routing ignored"
   - Attach control-lane metrics + billing screenshot
   - Claim: "Copilot instructions authorized crew-first routing but were not followed"
   - Request: Adjustment for overspend vs crew-frugal baseline

---

## Session Start Checklist

Before you start work, verify:

- [ ] MCP crew server running: `pnpm dev` includes `mcp-server:3103`
- [ ] Control-lane status accessible: `.claude/control-lane-status.json` exists
- [ ] Crew tools discoverable: Can run `tool_search("crew")` successfully
- [ ] Delegation hook active: Delegation audit appends to `.claude/delegation-audit.jsonl`

If any check fails, ask the user: "Crew tools unavailable; proceeding with native (higher cost)."

---

## Why This Matters

**Crew-first costs 5-10x less** for the same work. Over a month:

| Scenario | Work Type | Crew Cost | Native Cost | Savings |
|----------|-----------|-----------|-------------|---------|
| Refactor 3 files | Multi-file | $0.15 | $3.00 | $2.85 |
| Architecture review | Deliberation | $0.01 | $0.50 | $0.49 |
| Build new component | Multi-step | $0.10 | $2.50 | $2.40 |
| **TOTAL (50 tasks)** | Mixed | **$2-5** | **$50-150** | **$45-145** |

**Your recent bill spike is the difference between the middle column and the right one.**

Using this protocol, your costs should drop to ~$5-10/month instead of $50-150/month.

---

**Author**: Copilot Crew-First Protocol  
**Status**: ACTIVE (enforced in all sessions)  
**Last Updated**: 2026-08-27 (cost control audit)
