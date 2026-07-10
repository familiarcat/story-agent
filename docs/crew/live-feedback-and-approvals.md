# Crew Live Feedback, Ask-First Approvals & Self-Healing

Methodology from the crew-autonomy mission (RAG: crew-autonomy / `agent-stall` cards). Three linked
mechanisms so the OpenRouter crew runs the work, shows what it's doing live, asks before acting until
it has earned autonomy, and heals its own stalls.

## 1. Crew-first execution (minimize direct Anthropic tokens)

Default authoring/analysis to the crew (agent-core loop / `runMissionPipeline`). Anthropic orchestrates
only: dispatch → verify → final-mile-on-stall. Codified in CLAUDE.md ("Crew-first execution"). The
delegation-router hook scores prompts and steers substantive work to the crew automatically.

## 2. Live feedback (what is the crew doing)

The agent-core loop streams typed SSE events — render/log them as they happen:

| Event | Meaning |
|---|---|
| `model` | which OpenRouter model Quark picked this turn |
| `lens` | which focused tool subset was composed |
| `text` | the crew's streamed reasoning |
| `tool_call` / `tool_result` | each action + its result |
| `gate` | WorfGate decision (green/yellow/red) + remediations; `needsApproval`/`approvalId` when paused |
| `escalation` | escalated to the full crew |
| `cost` | running spend |
| `stall` | self-healing: model produced text + 0 tools on an actionable task → nudged to execute |
| `retry` / `error` / `done` | transient retry / failure / final result |

Surfaces (CLI, `/agent` web page, VS Code) all consume the same stream, so "what is the crew doing"
is visible everywhere. The CLI prints `stall` lines; the web page renders each event as a card.

## 3. Ask-first approvals that graduate to autonomy

**Ask first, then let the crew earn what it may do autonomously** (crew tiered-approval ruling):

- **Phase 1 — full human review:** every new operation *class* (a tool × WorfGate tier) pauses for an
  explicit approve/deny (`requireApproval` → `gate` event with `approvalId` → `POST /agent/approve`,
  Redis-brokered, auto-deny after 180s).
- **Phase 2 — sampling:** once a class has a clean approval history, only a sample still pauses.
- **Phase 3 — auto-approve:** after N consecutive approvals of the same class, propose auto-approval —
  **Worf must sign off, and it stays revocable.** Self-healing nudges never bypass WorfGate.

Approval history is the learning signal (`recordFeedback` cards in RAG); graduation is a proposal the
crew makes from that history, not an automatic relaxation.

## 4. Self-healing stalls (detect → record → nudge → research)

The observed failure: the loop replies with TEXT and calls **0 tools** on an actionable task (often
after auto-escalation injected a plan), then finalizes having done nothing.

- **Detect** (`loop.ts`): a finish with `toolCalls.length === 0` on a `looksActionable()` task that
  didn't say `DONE` → a stall.
- **Record:** the run is stored as an `agent-stall` card (tag `stall`) in RAG.
- **Self-nudge (in-loop):** up to `maxNudges` (default 2) corrective messages — "you described a plan
  but called no tools; execute now" — converting talk into action. Bounded, so no infinite loop.
- **Research loop:** the crew periodically recalls `stall`-tagged cards, looks for recurring patterns
  (e.g. escalation-into-inaction, a model that under-calls tools), and proposes a fix themselves.

The acceptance check: the loop detects a 0-tool-call stall on an actionable task, records it, and
self-nudges to execute — verified by `loop.test.ts` (`looksActionable`) + the in-loop branch.
