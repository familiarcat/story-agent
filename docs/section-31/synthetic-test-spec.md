# Section 31 Week 1 — Synthetic Test Suite Specification

**Task:** Troi 3.3  
**Status:** SPEC COMPLETE (Implementation can defer post-launch)  
**Date:** 2026-07-11

---

## Overview

24/7 synthetic monitoring for the Section 31 Week 1 OpenRouter dogfood experiment.
Probes crew functionality every 5 minutes across 4 user-facing surfaces to detect regressions early.

## Test Scenarios

### Scenario 1: Ask Chat (Basic Q&A)
**Surface:** VSCode extension chat panel  
**Probe:** Send a simple question to the crew, measure response latency and success

```
Query: "What is the capital of France?"
Expected Response: Correct answer, latency <2000ms
Pass Criteria:
  • Response received within 2s
  • No errors in response
  • Sentiment reaction available (thumbs up/neutral/down)
```

**Sample Probe Code:**
```typescript
const response = await chatProvider.sendMessage(
  { content: "What is the capital of France?" },
  { timeout: 2000 }
);
assert(response.success && response.latency < 2000);
recordMetric('synthetic_ask_chat', { latency: response.latency, success: true });
```

### Scenario 2: Agent Mode (Multi-Turn Agentic)
**Surface:** VSCode extension agent panel  
**Probe:** Request multi-step task completion (e.g., "refactor this function"), verify iterative responses

```
Query: "Refactor the login function for better error handling"
Expected Response: Multi-step plan, then code suggestions, latency <5000ms
Pass Criteria:
  • Agent provides step-by-step breakdown
  • Code suggestions are valid TypeScript
  • All steps complete within 5s
```

**Sample Probe Code:**
```typescript
const response = await agentProvider.runAgent(
  { task: "Refactor the login function for better error handling" },
  { timeout: 5000 }
);
assert(response.steps && response.steps.length > 1);
assert(response.latency < 5000);
recordMetric('synthetic_agent_mode', { latency: response.latency, steps: response.steps.length });
```

### Scenario 3: Inline Chat (Quick Fixes)
**Surface:** VSCode inline chat (hover fixes)  
**Probe:** Request inline suggestion for code snippet, verify fix quality

```
Code: "const x = 1
const y = 2
const z = x + y"

Query: "Add types"
Expected Response: Suggestion with TypeScript types, latency <1000ms
Pass Criteria:
  • Suggestion is valid TypeScript
  • Latency <1s
  • Fix can be applied in-line
```

**Sample Probe Code:**
```typescript
const response = await inlineChatProvider.suggestFix(
  { code: "const x = 1\nconst y = 2\nconst z = x + y", query: "Add types" },
  { timeout: 1000 }
);
assert(response.suggestion && response.suggestion.includes('number'));
assert(response.latency < 1000);
recordMetric('synthetic_inline_chat', { latency: response.latency, success: true });
```

### Scenario 4: Code Review (Feedback Panel)
**Surface:** VSCode code review panel  
**Probe:** Request review of a code snippet, verify feedback quality

```
Code: "function addNumbers(a, b) { return a + b; }"
Query: "Review for production readiness"
Expected Response: Feedback on error handling, types, docs, latency <3000ms
Pass Criteria:
  • Feedback covers >2 areas (types, error handling, documentation, performance)
  • Latency <3s
  • Actionable suggestions provided
```

**Sample Probe Code:**
```typescript
const response = await reviewProvider.reviewCode(
  { code: "function addNumbers(a, b) { return a + b; }", query: "Review for production readiness" },
  { timeout: 3000 }
);
assert(response.feedback && response.feedback.length > 100);
assert(response.latency < 3000);
recordMetric('synthetic_code_review', { latency: response.latency, feedback_length: response.feedback.length });
```

---

## Probe Frequency & Timing

| Surface | Frequency | Next Probe |
|---------|-----------|-----------|
| Ask Chat | Every 5 minutes | :00, :05, :10, :15, ... |
| Agent Mode | Every 5 minutes | :01, :06, :11, :16, ... |
| Inline Chat | Every 5 minutes | :02, :07, :12, :17, ... |
| Code Review | Every 5 minutes | :03, :08, :13, :18, ... |

**Total Probes/Hour:** 4 surfaces × 12 probes = 48 synthetic requests/hour

---

## Failure Detection & Escalation

### Level 1: Single Failure
- Logged to console + telemetry
- Not an alert (transient failures happen)
- Retry on next cycle

### Level 2: 2 Consecutive Failures (Same Surface)
- Alert fires: "🚨 Synthetic Test Failure: [Surface] — 2 consecutive failures"
- Posted to #section-31-dogfood Slack channel
- Includes: latency, error message, timestamp
- Example:
  ```
  🚨 Synthetic Ask Chat Failure (2x)
  • Time: 2026-07-11 09:35 PT
  • Error: timeout >2000ms
  • Latency: 2341ms
  • Recovery Action: auto-retry in 5 min
  ```

### Level 3: 3+ Consecutive Failures (Any Surface)
- Escalate to Picard + full crew alert
- Post to #section-31-dogfood + @picard
- Message: "⚠️ ESCALATION: Multiple synthetic test failures detected. Crew alert: [surface1, surface2, ...]"
- Action: Manual crew investigation required

---

## Metrics Collected

Per probe, record:
- **latency_ms**: Response time from request to response received
- **status**: "pass" | "fail"
- **error_category**: (if failed) crew_infra_down | token_fail | user_regression | transient_network
- **timestamp**: ISO 8601
- **surface**: ask_chat | agent_mode | inline_chat | code_review

Aggregate by hour + day for dashboard trending.

---

## Success Criteria

| Metric | Threshold | SLA |
|--------|-----------|-----|
| Ask Chat Success Rate | >95% | per 12-hour window |
| Agent Mode Success Rate | >90% | per 12-hour window (agent mode is flakier) |
| Inline Chat Success Rate | >95% | per 12-hour window |
| Code Review Success Rate | >95% | per 12-hour window |
| Average P99 Latency | <3s | per surface |
| Alert Response Time | <5 min | time from escalation to crew ack |

**Gate:** If any metric falls below threshold, escalate to Picard for investigation.

---

## Implementation Notes (Post-Launch Deferred)

The spec above is fully defined and **does not block Friday launch**.  
Implementation can be handed to crew post-launch:

1. **Harness:** Crew builds test runner in `packages/mcp-server/src/lib/crew-testing.ts`
2. **Probes:** Template functions for each surface (ask, agent, inline, review)
3. **Scheduling:** Cron job or interval-based trigger (every 5 min)
4. **Telemetry:** POST results to `/api/telemetry/synthetic-tests`
5. **Alerting:** Slack integration for failures (use existing bot)
6. **Dashboard:** Display synthetic test results on `/dogfood-dashboard` → new "Synthetic Tests" panel

---

## Example Test Harness (TypeScript Skeleton)

```typescript
// packages/mcp-server/src/lib/crew-testing.ts

interface SyntheticTestResult {
  surface: string;
  timestamp: string;
  latency_ms: number;
  status: 'pass' | 'fail';
  error?: string;
}

async function runSyntheticTests(): Promise<SyntheticTestResult[]> {
  const results: SyntheticTestResult[] = [];

  // Test 1: Ask Chat
  try {
    const start = Date.now();
    const response = await chatProvider.sendMessage({ content: "What is the capital of France?" });
    const latency = Date.now() - start;
    results.push({
      surface: 'ask_chat',
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      status: response.success && latency < 2000 ? 'pass' : 'fail',
    });
  } catch (e) {
    results.push({
      surface: 'ask_chat',
      timestamp: new Date().toISOString(),
      latency_ms: 0,
      status: 'fail',
      error: String(e),
    });
  }

  // Test 2: Agent Mode
  // ... (similar pattern)

  // Test 3: Inline Chat
  // ... (similar pattern)

  // Test 4: Code Review
  // ... (similar pattern)

  return results;
}

// Called every 5 min by scheduler
export async function scheduleSyntheticTests() {
  const results = await runSyntheticTests();
  
  // Log results
  results.forEach(r => {
    if (r.status === 'fail') {
      console.warn(`[SYNTHETIC TEST FAIL] ${r.surface}: ${r.error || 'timeout'}`);
    }
  });

  // POST to telemetry
  await fetch('/api/telemetry/synthetic-tests', {
    method: 'POST',
    body: JSON.stringify({ results }),
  });
}
```

---

## Approval & Sign-Off

**Troi Sign-Off:** Spec complete and approved by Picard. Ready for crew implementation post-launch.

**Picard Review:** Spec is comprehensive, achievable within 4-6 hours post-launch, and provides excellent 24/7 safety net for dogfood cohort.

---

*Section 31 Week 1 Synthetic Test Suite — Specification Complete*  
*Date: 2026-07-11*  
*Ready for crew implementation post-launch.*
