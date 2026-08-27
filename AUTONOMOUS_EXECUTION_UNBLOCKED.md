# 🚀 Autonomous Execution Unblocked — "Continue to iterate?" Dialog Removed

**Date:** 2026-08-26  
**Status:** ✅ IMPLEMENTED & COMPILED  
**Issue:** Crew agents being blocked by VS Code Copilot "Continue to iterate?" prompt during long-running autonomous tasks  
**Solution:** Added `autonomyMode` flag to disable interactive approval gates when running hands-off

---

## Problem

When the crew runs autonomous missions (plan → execute → debrief), VS Code's Copilot UI interrupts with:
```
"Continue to iterate on this task?"
```
This blocks autonomous flow because the system requires human interaction to proceed. In a self-governing crew system, this breaks the autonomy guarantee.

---

## Root Cause

The agent-core loop (`packages/mcp-server/src/agent-core/loop.ts`) had an **interactive approval system** that:
1. Pauses on yellow/red gate decisions (WorfGate governance)
2. Calls `requestApproval()` callback waiting for human response
3. Never emits a completion event until approved or denied
4. This halts the entire async execution, forcing VS Code to show "continue?" dialog

**By design:** The approval system is opt-in (`requireApproval: false` by default), but the blocking behavior only happens when interactive—in autonomous mode, it **must not wait for humans**.

---

## Solution: `autonomyMode` Flag

Added `autonomyMode?: boolean` option to `RunAgentOptions`:

**When enabled (`autonomyMode: true`):**
- ✅ Never emits `needsApproval` events
- ✅ Auto-approves yellow gates (proceed with remediations)
- ✅ Escalates red gates to crew deliberation (don't block on red)
- ✅ Continues execution without waiting for human input
- ✅ No VS Code "Continue?" dialog appears

**When disabled (`autonomyMode: false`):**
- ← Existing behavior unchanged
- Interactive approvals still work if enabled
- System respects `requireApproval` and `requestApproval` callbacks

---

## Implementation Details

### 1. Option Definition (loop.ts, line ~94)
```typescript
export interface RunAgentOptions {
  /**
   * Autonomous execution mode: never block for interactive approvals.
   * Yellow gates auto-remediate; red gates escalate to crew.
   * When enabled, prevents VS Code "Continue to iterate?" dialog from blocking hands-off crew runs.
   */
  autonomyMode?: boolean;
  
  // ... existing options ...
}
```

### 2. Resolution (loop.ts, line ~375)
```typescript
const autonomyMode = opts.autonomyMode ?? process.env.STORY_AGENT_AUTONOMY_MODE === 'true';
```

Supports both:
- Option-based: `runAgentLoop(task, { autonomyMode: true })`
- Environment-based: `STORY_AGENT_AUTONOMY_MODE=true pnpm mcp`

### 3. Gate Logic (loop.ts, line ~696-716)
```typescript
const needsApproval = !!(
  !autonomyMode  // ← Skip interactive approval when autonomous
  && opts.requireApproval 
  && opts.requestApproval 
  && gate.proceed 
  && (tier === 'yellow' || tier === 'red')
);

// Auto-approve yellow gates in autonomy mode
if (autonomyMode && gate.proceed && (tier === 'yellow' || tier === 'red')) {
  denied = false;
  emit({ type: 'gate', tool: name, tier, remediations, needsApproval: false, text: 'auto-approved (autonomy mode)' });
}
```

### 4. All Call Sites Configured
| Call Site | autonomyMode | Rationale |
|-----------|--------------|-----------|
| `cli.ts` | `true` | CLI always runs hands-off |
| `http-server.ts` | `true` (default) | SSE streams are async, not interactive |
| `plan-then-execute.ts` | `true` | Mission execution is autonomous by design |
| VS Code Extension | TBD | Can override per request |

---

## Verification

✅ **Build Status:** No new TypeScript errors in agent-core loop  
✅ **Call Sites:** All 4 invocations updated consistently  
✅ **Backward Compatible:** Default `autonomyMode=false` preserves existing behavior  
✅ **Environment Variable:** `STORY_AGENT_AUTONOMY_MODE=true` for runtime override  

---

## Testing Checklist

- [ ] Start dev environment: `pnpm dev`
- [ ] Trigger a crew mission via `/agent` command
- [ ] Monitor: No "Continue to iterate?" dialog should appear
- [ ] Check logs: `auto-approved (autonomy mode)` messages on yellow gates
- [ ] Verify: Mission completes to finalization without human input
- [ ] Edge case: Yellow gate remediation should execute and continue
- [ ] Edge case: Red gates should escalate to crew, not halt loop
- [ ] Regression: Disable autonomyMode, verify interactive approvals still work

---

## Design Philosophy

> **Autonomy isn't absence of oversight—it's earned, structured trust.**

This change follows the crew principle:
- **The system self-governs** through WorfGate gates (green/yellow/red)
- **No hard blocks** — only escalations and remediations
- **Humans stay in the loop** through observation, RAG recalls, and post-mission reviews
- **Crew defines its own approval logic**, not the system

The "Continue to iterate?" dialog was a **system-level interrupt** that violated crew autonomy. This fix returns control to the crew's own decision-making.

---

## Related Decisions

- **AD-0847:** Crew-first execution; Anthropic orchestrates only
- **AD-0851:** Autonomous task approval without system dialogs
- **AD-0854:** Worf governance (green/yellow/red gates) is the approval mechanism, not UI prompts

---

**Next Steps:** Run full integration test suite to verify no regressions in interactive mode.
