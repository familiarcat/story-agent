# Commodore Unified Fabric — deep design (RAG + MCP unification, multi-client)

> Deepened per the Admiral's order. Command protocol: **Admiral (user) → Commodore (Claude Code orchestrator) → Crew (11 OpenRouter officers)** — RAG [[command-protocol-admiral-commodore-crew]] (189).
> Two Observation Lounge passes ($0.0022 + $0.0025, DeepSeek, 0 Anthropic for the work). Tier-3 fiction filtered
> (Firecracker/Nomad microVMs, JWT+Redis 5-min revocation, bull/pg-queue, billing-reconciliation UI, gRPC) — none
> match our stack (MCP HTTP + SSE, existing bearer-token middleware, Supabase RAG, control-lane ledger).

## The prize
The crew already **hypothesizes** (`runMissionPipeline` — Observation Lounge) and **executes** (agent-core loop —
CRUD + `run_shell`, hardened with tool-call repair + three-strike cost escalation + `delete_file`). They are **two
engines, not yet one flow**. Unify them into a single **plan → execute → remember** spine over the shared RAG,
reachable by **multiple VS Code extensions** through one governed endpoint fronted by the Commodore.

`plan_then_execute` **is** the spine (Riker): `runMissionPipeline` → inject plan → `runAgentLoop`. What's missing is
(a) RAG as connective tissue around it, and (b) a multi-client contract.

## Per-officer memory pass (what the crew already knows — grounded in stored RAG)
- **Picard** — [[command-protocol-admiral-commodore-crew]] (189): the chain of command this fabric serves.
- **Data** — [[dynamic-crew-prompt-composer]] (178), [[aha-crud-complete]] (182), [[go-path-self-orchestration]] (184): contracts + schema-first; owns structural integrity of the linked record.
- **Riker** — [[execution-boundary-crew-plans-cc-executes]] (181), [[aha-hierarchy-tools-shipped]] (179): the loop plans reliably but multi-file control-flow is the boundary; plan_then_execute is the execution spine.
- **Geordi** — [[self-orchestration-go-path-2-3-shipped]] (187), [[story-agent-chat-file-crud]] (180): repair + escalation shipped; owns making the crew tools + loop + RAG one fabric.
- **O'Brien** — [[storyagent-live-https]] (185), [[deployment-remediation]] (186): the deployed /mcp + /agent already exist; owns operability + the health-gate fix that must land first.
- **Worf** — WorfGate credential broker + governed writes: owns auth/audit for multi-client access.
- **Troi** — [[story-agent-chat-parity-roadmap]] (188): same-feel UX across surfaces is the parity goal this fabric enables.
- **Quark** — crew-team-assembly cost ranking + control-lane ledger: on-demand, per-client cost attribution.
- **Yar/Crusher** — QA + health baselines: the fabric needs a test + a monitored "healthy" signal before go-live.

## The contract (grounded, owner-tagged)

### 1. Discovery — Uhura / Geordi
A **well-known manifest** the extension queries to find the crew + Commodore. Reuse
[mcp-discovery.ts](../../packages/mcp-server/src/lib/mcp-discovery.ts); serve at `/.well-known/mcp.json`:
```json
{ "apiVersion": "1", "endpoints": { "mcp": "/mcp", "agent": "/agent", "rag": "/rag" },
  "entryPoint": "plan_then_execute", "crew": 11, "auth": "bearer" }
```
Any VS Code extension reads this from `https://storyagent.pbradygeorgen.com` and self-configures. `minApiVersion`
field for backward compatibility.

### 2. Auth — Worf
**Reuse the existing** [`createHttpAuthMiddleware`](../../packages/mcp-server/src/lib/http-auth-middleware.ts)
(bearer token already gates `/mcp`). Add a **per-client identity** (a `x-client-id` header) so cost + audit
attribute to the right editor. Least privilege; no new JWT/Redis machinery. Client-tier clients still present the
Entra JWT path that already exists.

### 3. Linked RAG record — Data (the core unification)
One record ties the whole loop together — **recall before, store after**:
```
{ missionId, clientId, goals, missionPlan, outcome: { iterations, toolCalls, escalated, costUSD, finalText },
  topModel, totalCostUSD, timestamp }
```
Stored via the existing `storeObservationMemory` (JSONB transcript) tagged `unified-run` + `clientId`, so
`{plan → execution → outcome}` is a single recallable unit. `plan_then_execute` **recalls** relevant prior
`unified-run` records before planning (so the crew builds on past runs) and **stores** this record after.

### 4. Concurrency — Riker
`plan_then_execute` is the **single entry point**. Concurrent client runs isolate via the **existing per-request
MCP server pattern** ([index.ts](../../packages/mcp-server/src/index.ts) already spins a fresh `McpServer` per HTTP
request) + a lightweight in-process run registry keyed by `missionId` so runs don't collide. No microVMs.

### 5. Cost — Quark
**On-demand, not always-on.** Per-client attribution via the existing **control-lane ledger**
([control-lane.ts](../../packages/shared/src/control-lane.ts) `recordCrewRun` already logs `costUSD`); add
`clientId` to the ledger entry. `pnpm lanes` then reports per-client spend. Budget alert when a client crosses a
threshold (reuse the PROD-13 cost-observatory signal already in the loop).

## Picard's phased build order (additive-first)
1. **Linked RAG record in `plan_then_execute`** (Data + Riker) — recall-before + store one `unified-run` record. *The core; mostly additive (a memory-linking module + a small wire-in).* 
2. **Discovery manifest** `/.well-known/mcp.json` (Uhura/Geordi) — additive endpoint over mcp-discovery.ts.
3. **Per-client identity** on the existing bearer auth + ledger (Worf/Quark) — small.
4. **Concurrency run-registry** (Riker) — reuse per-request pattern.
5. **Health-gate fix first** (O'Brien, [[deployment-remediation]] 186) — so multi-client deploys stop false-failing.

Execution split (per [[execution-boundary-crew-plans-cc-executes]]): Story Agent builds the additive modules
(memory-linker, manifest handler); Claude Code does control-flow wiring (plan-then-execute.ts, index.ts routes).

## Implementation log — refinements from the build

**Phase ① SHIPPED** (linked RAG record). Refinements discovered while building:
- Module: [unified-run.ts](../../packages/mcp-server/src/agent-core/unified-run.ts) — `buildUnifiedRunRecord` (pure),
  `storeUnifiedRun`, `recallUnifiedRuns`. Wired into [plan-then-execute.ts](../../packages/mcp-server/src/agent-core/plan-then-execute.ts):
  **recall-before** (prior `unified-run` summaries prepended to the mission input so the crew builds on past runs)
  + **store-after** (the linked `{plan → execution → outcome}` record).
- **Storage vehicle refinement:** RAG's `storeObservationMemory` requires an `ObservationDebateResult`, so the
  record is wrapped in a one-round transcript (speaker `commodore`, the record JSON in `statement`, a human summary
  in `consensusSummary`) tagged `['unified-run', clientId]`. `recallUnifiedRuns` filters by the `unified-run` tag and
  returns the `consensusSummary` lines. No schema/table change needed — it rides the existing observation-memory store.
- **missionId** scheme: `ptx-<ISO timestamp>`. `totalCostUSD` = plan + run; `finalText` truncated to 2000 chars.
- **Authorship note:** the Story Agent loop *stalled cold* on this one (0 tool calls) — a reminder the boundary is
  real; the Commodore authored phase ① directly. Additive modules the crew builds; this one it didn't.
- **Pre-existing failing test flagged:** `approval-registry.test.ts > in-process fallback > resolveApproval delivers…`
  fails at baseline (unrelated to this work) — add to the deployment/test remediation ([[deployment-remediation]] 186).

Phases ②–⑤ (discovery manifest, per-client identity, concurrency registry, health-gate fix) remain — additive-first, on Admiral approval.

## Not doing (rejected as over-engineering for our stack)
microVM/Nomad session sandboxing, JWT+Redis short-token revocation, dedicated queue lib, a billing UI, gRPC.
Revisit only if real multi-tenant load demands it — Quark: don't pay for headroom we don't have.
