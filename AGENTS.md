# AGENTS.md — cross-tool agent contract

This repo is driven by an 11-member OpenRouter "crew" (Star Trek TNG personas). Any AI client working
here — Claude Code, Story Agent, Continue, Copilot, Cursor — follows the same contract. The full
project instructions live in [CLAUDE.md](CLAUDE.md); this file is the tool-agnostic summary.

## The one rule: keep the premium lane thin

Two **control lanes**, and the whole point is to spend as little as possible in the expensive one:

| Lane | What runs there | Cost |
|---|---|---|
| 🖖 **CREW** | Deliberation / design / analysis / multi-step coding, delegated to the OpenRouter crew (deepseek/llama tiers) | cheap (~$0.002 / deliberation) |
| 🅰️ **ANTHROPIC** | The orchestrator (Claude Code / premium model) — dispatch, verify, finish the last mile | expensive |

**Default: delegate substantive work to the CREW; the premium model orchestrates only.**
- Deliberation/design/"what should we do" → `run_crew_mission_pipeline` (MCP) / `runMissionPipeline`.
- Multi-step read/edit/run → the agent-core loop (`story-agent` CLI or `/agent` SSE endpoint).
- Anthropic is a **pool member, not the default** — never hardcode it as primary.

## Control-lane visibility (how to see the split)

The system tracks and surfaces the lane split so cost optimization is observable:
- **Ledger:** `.claude/delegation-audit.jsonl` — append-only, Worf-safe (metrics only, no prompt text).
  Two entry kinds: `decision` (hook intent) and `crew-run` (confirmed crew activation w/ real `costUSD`).
- **Marker:** `.claude/control-lane-status.json` — machine-readable current lane + cumulative metrics.
  Refreshed by the `UserPromptSubmit` hook and by `pnpm lanes`. Read this to show the live lane.
- **Reporter:** `pnpm lanes` (human) / `pnpm lanes:json` (machine).
- **Module:** [packages/shared/src/control-lane.ts](packages/shared/src/control-lane.ts)
  (`readLedger`, `recordCrewRun`, `summarizeLanes`, `laneBanner`, `writeStatusMarker`).

Headline format:
```
Control lane: 🖖 CREW · CREW N delegated (~$X saved, M runs $Y) | ANTHROPIC K native · Z% delegated
```

## Memory (recall → act → store)

Every natural-language prompt should **recall** crew RAG memory before acting and **store** durable
conclusions after (`crew:get-relevant-memories` / `crew:store-memory`, or `rag_recall` in agent-core).
New session? Recall the bootstrap first (see [docs/session-bootstrap.md](docs/session-bootstrap.md)).

## Security

Secrets live in `~/.alexai-secrets` / `~/.zshrc` (never committed); credentials are brokered through
WorfGate ([worfgate-credentials.ts](packages/shared/src/worfgate-credentials.ts)). Production DB
writes and outward-facing actions require explicit human approval.
