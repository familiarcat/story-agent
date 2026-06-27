# Story Agent — Project Instructions

Story Agent **is an autonomous coding assistant** (a self-hosted alternative to Claude Code /
Copilot / Gemini) driven by an 11-member Star Trek TNG "crew" running on **OpenRouter**. The crew
is the product. Treat this repo as something that should run on **its own systems**.

## Dogfooding mandate (read first)

When working in this repo, **prefer the project's own OpenRouter crew over doing heavy reasoning
directly.** A Claude Code session (Anthropic) should act as the *orchestrator*; the crew does the
analysis, deliberation, and planning. Concretely:

- **Deliberation / design / analysis / "what should we do" →** run the crew mission pipeline
  (`runMissionPipeline` in [packages/mcp-server/src/lib/crew-mission-pipeline.ts](packages/mcp-server/src/lib/crew-mission-pipeline.ts),
  or the `run_crew_mission_pipeline` MCP tool). It runs Picard→Riker→Quark→crew→Picard on OpenRouter
  and returns an owned, costed mission plan. **Store the result to RAG.**
- **Agentic multi-step coding (read/edit/run) →** prefer the agent-core loop: the `story-agent` CLI
  or the `/agent` SSE endpoint ([packages/mcp-server/src/agent-core/](packages/mcp-server/src/agent-core/)),
  which run the tool-calling loop on a Quark-selected OpenRouter model.
- **Observation Lounge responses** (full-crew deliberation) are the expected format when the user
  asks "what does the crew think" — engage all officers on their own models, then synthesize.
- **Anthropic is a POOL MEMBER, not the default.** Never hardcode Anthropic as the primary model.
  Quark selects the cheapest adequate model per task (DeepSeek / Llama / OpenAI for most work;
  Anthropic only for tier-4 architecture/security). See "LLM routing" below.

A `CLAUDE.md` cannot change which model *this session* runs on — but following the above shifts the
substantive work onto the crew, which is the point.

**Crew-first execution (default — minimize direct Anthropic tokens).** When the crew is reachable,
DEFAULT to running authoring/analysis on it (the agent-core loop or `runMissionPipeline`), not in this
Anthropic session. Anthropic's role is ORCHESTRATION ONLY: dispatch → verify (build/test) → finish the
final mile only if the loop stalls. Editing/analyzing directly in-session is the exception (loop
unavailable, or a ≤few-line deterministic fix the loop stalled on) — call it out when you do it. See
the live-feedback + ask-first approval + self-healing-stall methodology in
[docs/crew-live-feedback-and-approvals.md](docs/crew-live-feedback-and-approvals.md).

## Crew memory recall (read BEFORE any NL prompt)

**Every Claude Code or Story Agent natural-language prompt must RECALL crew RAG memory before acting,
and STORE durable conclusions after.** The crew compounds only if each turn builds on what it already
knows. Loop: `prompt → recall → act → store → next prompt recalls it`.

- **Recall first:** `rag_recall` (agent-core), or `getRelevantObservationMemories` /
  `recall_taught_tools` (scripts/tools), keyed to the task — cite what you found (prior rulings,
  taught tools, persona context). Don't re-litigate decisions already in RAG.
- **Store after:** `storeObservationMemory` (crew-wide) + a per-member `storeCrewPersonalMemory`,
  tagged for recall. Mission pipeline results store automatically.
- Full protocol + consumers: [docs/crew-memory-recall-protocol.md](docs/crew-memory-recall-protocol.md).

## LLM routing (Quark)

- Single selector: `quarkSelectModel(crewBaseTier(crewId))` in
  [crew-team-assembly.ts](packages/mcp-server/src/lib/crew-team-assembly.ts). It's wired into
  `prompt-engine.selectModelForCall` and `crewAhaModel` — the system-wide primary path.
- `MODEL_POOL` is multi-provider and cost-ranked; only verified-reachable slugs. Do not add
  unreachable slugs (e.g. `google/gemini-2.0-flash-001` was NOT reachable).
- Anthropic-first provider routing (`provider: { order: ['Anthropic'] }`) ONLY for `anthropic/*`
  slugs (avoids stale Bedrock); never for other providers.
- **Embeddings (RAG recall):** `embed()` ([embedding.ts](packages/shared/src/embedding.ts)) uses a real
  model — **reusing the OpenRouter crew key by default** (`openai/text-embedding-3-small`, OpenRouter
  serves `/embeddings`), so real RAG is active with NO new secret. Precedence: `EMBEDDING_API_KEY` →
  `OPENAI_API_KEY` → OpenRouter key → SHA hash. 64-dim (Matryoshka + defensive slice) so no DB change.
  `EMBEDDING_DISABLE=true` forces the free hash. See [docs/embeddings.md](docs/embeddings.md).
- **Lower the crew's cost by default.** The mission pipeline runs FRUGAL (`CREW_FRUGAL`, default on):
  even Picard's intake/synthesis bookends use the cheapest adequate model (Quark tier-3 ≈ deepseek),
  not a frontier model — the pipeline's dominant cost. Set `CREW_FRUGAL=false` only for a deliberate
  heavy-synthesis run. Keep deliberations terse + token-bounded. Cost over speed.

## Security — WorfGate (Worf owns it)

- **Secrets live in `~/.alexai-secrets` / `~/.zshrc`, never in the repo.** Never commit secrets,
  `.terraform/`, or `*.tfstate`.
- Credentials are brokered through the **WorfGate Credential Broker**
  ([worfgate-credentials.ts](packages/shared/src/worfgate-credentials.ts)) —
  `resolveWorfGateCredential` / `resolveWorfGateCredentialAsync`. Authorized by crew identity,
  audited, value never logged. Provider chain: Vault → AWS Secrets Manager → Ocelot(stub) → env.
- agent-core local ops pass the **green/yellow/red** governor
  ([worfgate-local.ts](packages/mcp-server/src/agent-core/worfgate-local.ts)) — it auto-remediates
  (clamps paths into the workspace, downgrades `--force`) rather than hard-blocking.

## Clients — dynamic, never hardcoded

**Model: familiarcat is the consultancy FIRM (system operator/root) → CLIENTS → PROJECTS → epics →
stories → tasks** (sprints = time axis). Same hierarchy on both the security side (clients table)
and the PM side (Aha) — see [docs/aha-nomenclature.md](docs/aha-nomenclature.md).

- Clients live in the Supabase `clients` table (+ RAG memory), hydrated into a sync cache at
  startup. Onboard via `onboardClient` ([client-registry.ts](packages/shared/src/client-registry.ts))
  or the `onboard_client` MCP tool — it applies the WorfGate floor + `parent_client_id` hierarchy.
- Only **familiarcat** (firm/root) and **client-int** (regulated gold-standard reference) are code
  bootstrap. Every real client (e.g. **Jonah**, and **Bayer** if onboarded) is a DB row under the firm.
  "Bayer" is no longer a hardcoded sample — it's just another client you can onboard like any other.
- Aha nomenclature: Firm/Client/Project are nested Aha workspaces (products); Epic=epic, Story=feature,
  Task=requirement, Sprint=release. Concept map lives in [crew-aha-roles.ts](packages/mcp-server/src/lib/crew-aha-roles.ts).

## Skills / tools — every tool needs a 5W1H theory

- New MCP tools MUST register a `SkillTheory` (who/what/when/where/why/how) via `defineSkillTheory`
  in [skill-theories.ts](packages/mcp-server/src/lib/skill-theories.ts). `defineSkillTheory`
  validates all six dimensions. `how.annotations` is the MCP `ToolAnnotations` object — pass it into
  `server.tool(name, desc, schema, annotations, cb)`. Check `skill_coverage` to find gaps.

## Database migrations — Supabase CLI

- New migrations go in `supabase/migrations/<YYYYMMDDHHMMSS>_name.sql` and apply via
  `supabase db push` (NOT manual dashboard paste). Historical flat `supabase/*.sql` are an archive.
  Needs `SUPABASE_ACCESS_TOKEN` + `brew upgrade supabase` (≥ v2.107 to match config.toml).

## Build / test / commit

- pnpm monorepo. Build a package: `pnpm --filter @story-agent/<pkg> run build`. Tests:
  `pnpm --filter @story-agent/<pkg> run test:unit`. Run scripts with `npx tsx scripts/<x>.ts`
  (the bash shell loads `~/.zshrc`, so crew/Supabase/Aha creds are present).
- Known pre-existing failing test: `crew-collaboration.integration.test.ts` (missing template vars) —
  unrelated to current work; don't chase it.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. The user
  works on `main` and wants pushes to trigger CI (`audit-check`).

## Key commands

| Command | Purpose |
|---|---|
| `pnpm run build` / `pnpm run check` | build all / typecheck+lint+test |
| `pnpm run mcp` | start the MCP server (set `STORY_AGENT_AGENT_PORT=3103` for the `/agent` loop) |
| `npx tsx scripts/onboard-client.ts` | onboard a client (defaults to Jonah) |
| `supabase db push` | apply pending cloud migrations |
| `pnpm run aws-secrets:put` | bootstrap AWS secrets |

## Layout

`packages/shared` (db, client registry, WorfGate creds, skill theory) · `packages/mcp-server`
(MCP tools, agent-core, crew libs) · `packages/ui` (Next.js) · `packages/vscode-extension` ·
`supabase/` (migrations) · `terraform/` + `docker/` (Fargate deploy) · `scripts/` (tsx ops).
