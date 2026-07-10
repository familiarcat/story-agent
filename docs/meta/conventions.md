# Naming conventions — the crew standard

> Crew-deliberated (Observation Lounge, $0.0027) and **Commodore-ratified** (the crew split on tool naming;
> resolved below). This is the single canonical standard for all crew- and Commodore-authored code.
> Codifies the de-facto conventions already in the repo + resolves the known inconsistencies.

## Casing matrix (unanimous)
| Kind | Convention | Example |
|---|---|---|
| Functions, variables | `camelCase` | `quarkSelectModel`, `buildUnifiedRunRecord` |
| Types, interfaces | `PascalCase` | `AgentTool`, `UnifiedRunRecord`, `McpManifest` |
| Module constants / sets | `UPPER_SNAKE_CASE` | `MODEL_POOL`, `YELLOW_TOOLS`, `THEORIZED_TOOLS` |
| File names | `kebab-case` | `crew-team-assembly.ts`, `tool-call-repair.ts` |
| Test files | `<name>.test.ts`, colocated | `unified-run.test.ts` (NOT `.spec.ts`) |

## Functions — verbNoun + predicates (Riker)
- Actions read `verbNoun`: `build*`, `run*`, `select*`, `resolve*`, `get*`, `store*`, `recall*`, `register*`.
- Booleans read as predicates: `is*`, `has*`, `should*` (`isInsideWorkspace`, `shouldEscalate`).

## MCP tool names — CANONICAL = underscore_snake (resolved)
The crew split colon vs underscore. **Ruling: new tools use `snake_case` with a domain prefix** — because that
is the name clients actually call (the MCP layer converts a registered `aha:x` to the surfaced `aha_x` anyway, so
underscore is the real contract). Newer tools already follow it: `run_shell`, `plan_then_execute`, `delete_file`,
`crew_analyze_image`.
- Reserved domain prefixes: `crew_*` (per-officer / crew ops), `aha_*` (Aha), `worfgate_*` (governance).
- The legacy colon form (`aha:create-feature`) stays **only** within the existing Aha family for internal
  consistency; do not introduce new colon tools. No new ad-hoc prefixes (e.g. `finance_`) without a SkillTheory.
- Every MCP tool MUST register a `SkillTheory` (5W1H). The theory's `tool` field matches the registered name.

## DB/RAG boundary (Data)
- SQL / Supabase columns are `snake_case` as the external system dictates (`reference_num`, `release_date`,
  `workflow_status`) — **do not prefix them** (`db_` rejected; we can't rename Aha/Supabase fields).
- TypeScript DTOs are `camelCase` (`storyId`, `clientId`, `missionPlan`). Map explicitly at the boundary.

## Governance (Worf) + models (Quark)
- Security/governance identifiers use the `worfgate_*` / `WORFGATE_*` prefix; **names never embed a secret value.**
- **Identifiers and descriptions never hardcode a model name** — Quark selects the model at runtime. (Fix the stale
  "Uses Claude 3.5 Sonnet" in Riker's tool description.)

## Files & modules (Geordi)
- One concept per file; file name = the concept in `kebab-case`. Colocate the `.test.ts`.

_Codified from crew RAG (nomenclature-standard). Applies to every crew- and Commodore-authored change going forward._
