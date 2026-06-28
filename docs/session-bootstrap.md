# Session bootstrap — restart a coding session here (any AI assistant)

The crew's RAG (Supabase, tool-agnostic) is the portable brain; the MCP connection is the access
method. **Any** AI tool — Claude Code, Story Agent, Continue, Copilot, Cursor — rehydrates a session
by recalling this bootstrap from RAG, then working the dogfooding loop. This file is the human-readable
source; its RAG twin (tags: `bootstrap`, `session-restart`, `onboarding`) is what tools recall first.

## Restart protocol (do this first, every fresh session)

1. **Connect to the crew** — the `story-agent` MCP server ([.mcp.json] → `scripts/mcp-crew-stdio.sh`,
   `docs/claude-code-mcp.md`). 132 tools incl. `run_crew_mission_pipeline`, `crew:get-relevant-memories`,
   `crew:store-memory`. One-time setup: `scripts/setup-claude-mcp.sh` (build + verify + pre-approve).
2. **Recall** — `crew:get-relevant-memories` (or `rag_recall`) for the task, plus the `bootstrap` tag
   for this file's twin. Cite prior rulings; don't re-litigate.
3. **Act** — route substantive reasoning to the crew (`run_crew_mission_pipeline` / agent-core loop on
   OpenRouter). Anthropic/the host tool is the ORCHESTRATOR: dispatch → verify (build/test) → final-mile.
4. **Store** — `crew:store-memory` durable conclusions after acting. The loop compounds only if each
   turn builds on the last.

## Where things are (as of 2026-06-28)

- **Repo:** `~/Developer/story-agent` — moved OFF iCloud (`~/Documents` corrupts `.git`; see
  [docs/git-push-resilience.md]). Cross-platform clone-ready (LF `.gitattributes`, corepack `engines`).
  Push with `scripts/git-push-scaled.ts` (diff-scaled timeout); **never `kill -9` a `git push`**.
- **Crew:** 11 TNG officers on OpenRouter, Quark-cost-selected per task. Mission pipeline =
  `runMissionPipeline` / `run_crew_mission_pipeline`. Frugal by default (`CREW_FRUGAL`).
- **Surfaces:** agent-core loop (CLI `--json` NDJSON, `/agent` SSE), VS Code chat (Ask/Plan/Agent),
  Next.js dashboard. Secrets in `~/.alexai-secrets` via `~/.zshrc` (no repo `.env`).

## Key realizations / standing decisions (recall before re-deciding)

- **Story Agent → primary code assistant** is the goal (10–100× cheaper on OpenRouter + sovereignty).
  The crew's single go-criterion was **multi-file edit reliability** — now BUILT (agent-core
  `edit-session.ts`: snapshot → scoped `tsc` over touched files → self-correct → rollback). Next gate:
  Riker's **48h shadow test** (loop vs Anthropic) to quantify the delta, then flip.
- **Dr. Crusher owns deployment health** (standing charter). Deploy is air-tight: post-deploy
  `ecs wait services-stable` gate, fast ALB health checks (~20s), circuit-breaker rollback, required
  `security_gate`. Deploy via `gh workflow run deploy.yml -f apply=true`; verify via ECS + target health.
- **Selection-first UI:** one shared `selection-contract.ts` (+ `actionsForPersona`) → web imports it,
  VS Code mirrors it. Management vs Developer personas. Shared `<WorkflowStatus>` crew-feedback primitive
  on the existing theme tokens (LCARS/dark/light).
- **Aha = the Plan lane;** writes stay WorfGate-gated dry-run→confirm. Clients are dynamic (Supabase).

## Current state + next steps

- Latest: multi-file reliability layer shipped; crew MCP connection live + documented; repo relocated
  with Claude Code history migrated (`scripts/migrate-claude-history.sh`).
- Next: (1) Riker's 48h shadow-test harness (instrument loop verify-outcome + cost to RAG);
  (2) wire `<WorkflowStatus>` into the management dashboard once it has a real crew-run feed;
  (3) optional deploy hardening: auto-rollback already on, external gitSha verify still pending.

> To make all of `docs/` recallable by any tool, run `pnpm run docs:ingest` (embeds docs → crew RAG).
