# Shadow test — can Story Agent be our primary code assistant?

**Decision this test makes:** flip Story Agent (the OpenRouter agent-core loop) from *default front
door* to *primary code assistant*, retiring Claude Code as the day-to-day driver — for a significant
functionality + cost-efficiency advance.

**The one thing it measures:** multi-file edit reliability — the single go-criterion the full crew
named (Observation Lounge `story-agent-as-primary-assistant`). The loop now has the reliability layer
(snapshot → scoped `tsc` verify of touched files → bounded self-correction → rollback,
[edit-session.ts](../packages/mcp-server/src/agent-core/edit-session.ts)); this quantifies whether it
closes the gap.

> Designed by the crew via `run_crew_mission_pipeline` (Riker lead, $0.0026, stored to RAG
> `story-agent-as-primary-assistant` lineage). This doc is the distilled, runnable version.

## Lanes (isolate the model, hold tooling constant)

Run the **same agent-core loop** on the **same task** twice — only the model changes. Because both
lanes use the identical loop + reliability layer + WorfGate, every run emits a comparable
`AgentRunResult`, so the delta is purely model capability:

| Lane | Model | Role |
|---|---|---|
| **A — Story Agent** | Quark tier-3 (deepseek, OpenRouter) | the candidate |
| **B — control** | an `anthropic/*` slug (tier-4) | the baseline we'd retire |

(Lane B runs through agent-core too — Anthropic is a pool member — so it is NOT a separate harness.
Force it with `tier: 4` / a specific `anthropic/*` model in `RunAgentOptions`.)

## Metrics (all already emitted by `AgentRunResult` / agent-run feedback cards)

Per task, per lane, record:

| Metric | Source |
|---|---|
| **Outcome** = `clean` (`!verifyFailed && !rolledBack`) / `self-corrected` (`verifyFailed && !rolledBack`) / `rolled-back` (`rolledBack`) | loop verify gate |
| **Auto-recovery rate** = (clean + self-corrected) / total | derived |
| **Cost / task** (USD) | `totalCostUSD` |
| **Turns** | `iterations` · **Stall** `stalled` · **Escalated** `escalated` |
| **Wall-clock** | stamp at dispatch/finish |
| **Build/test green** (independent check) | run `pnpm --filter <pkg> typecheck` + tests after |

## Harness — reuse what exists, no new infra

1. agent-core already persists an **agent-run feedback card** to cloud RAG after every run
   ([bridges.ts](../packages/mcp-server/src/agent-core/bridges.ts) `recordFeedback`), with model,
   posture, cost, iterations, stalled. The reliability layer added `verifyFailed` / `rolledBack`.
2. For the shadow test, dispatch each corpus task to **both lanes**, tag both cards with a shared
   `shadowBatchId` + `lane: A|B`, and aggregate from RAG (`crew:search-memories` /
   `crew:get-relevant-memories` on the `shadow-test` tag).
3. Aggregate into a delta table (auto-recovery %, cost/task, turns) — Quark's efficiency report
   already gives per-provider cost.

## Task corpus

- **~10 real multi-file tasks** drawn from recent backlog stories / git history (the kind that made
  the loop drift before the reliability layer: add a field across contract+UI+test, rename an export,
  thread a new option through loop+server+client).
- **A few synthetic stressors** that force the failure mode: cross-file type conflict, a removed
  export an untouched importer uses (the layer's known blind spot), a duplicate import.

## GO / NO-GO decision rule (Picard + Quark)

**GO — flip Story Agent to primary** when, over the corpus:
- Lane A **auto-recovery ≥ 90%** (clean + self-corrected, no manual fix), **AND**
- Lane A **correctness at parity** with Lane B (build+tests green at ≥ the same rate), **AND**
- Lane A **cost ≤ ~80%** of Lane B per *correct* task (≈20%+ savings; realistically 10–100× on raw $).

**NO-GO / keep the hybrid** if Lane B beats Lane A on multi-file correctness by a meaningful margin —
then keep Claude Code as orchestrator for complex multi-file work and re-test after closing the gap
(e.g. add baseline-diff verify to catch the untouched-importer blind spot).

## First 3 steps to run it

1. **Pick the corpus** — list ~10 real multi-file stories + write the 3 synthetic stressors.
2. **Dispatch each task to both lanes** via the agent-core loop (Lane A tier-3; Lane B `anthropic/*`),
   tagging feedback cards `shadow-test` + `shadowBatchId` + `lane`.
3. **Aggregate from RAG** into the delta table and apply the GO/NO-GO rule. Store the verdict to RAG.

Until the verdict is GO, the standing split holds: **Story Agent = default front door; Claude Code =
orchestrator/escalation for complex multi-file work** (the loop auto-escalates the hardest tasks).
