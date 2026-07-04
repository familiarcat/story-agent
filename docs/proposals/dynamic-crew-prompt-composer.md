# Dynamic Crew Prompt Composer + Aha hierarchy extension — crew-scoped plan

> Crew-derived via `run_crew_mission_pipeline` (DeepSeek tier-3, **$0.00232 / 3,868 tok, 0 Anthropic tokens for the work**).
> Tier-3 fiction filtered by the orchestrator: invented "Mistral-7B", containerize/Lambda/Redis+S3 auto-scaling,
> "encrypted memory caches + PII redaction hooks", the unfounded "40% savings". What survived is below, grounded
> against the real codebase (`quarkSelectModel`, `skill-theories.ts`, the RAG recall→store protocol, the Aha tools).

---

## The idea (user's vision)

Every crew member today runs on a mostly-static persona prompt. Make each member's prompt **composed at runtime**
from three inputs — and let a **cheap Quark-selected LLM** do the composing:

```
composeCrewPrompt({
  crewId,                       // 1. WHO — canonical persona + domain (static, from crew registry)
  actions,                      // 2. WHAT they can do for THIS task — tool set + 5W1H SkillTheory
  memories,                     // 3. WHAT they know for THIS task — RAG recall, ranked + pruned to budget
  task, tokenBudget,
}) -> string                    // the member's working prompt for this turn
```

The composer is a **mechanical assembly task**, not reasoning — so it runs on the **cheapest adequate** model
Quark returns (tier-3 DeepSeek today, or a cheaper pool slug if added). The expensive part (the member's actual
reasoning) still runs on that member's Quark-assigned model. A cheap LLM writes the prompt; the right LLM answers it.

---

## Part A — architecture (grounded, filtered)

### 1. Where it lives
`packages/mcp-server/src/lib/crew-prompt-composer.ts` — a pure function called by
`prompt-engine.selectModelForCall`'s siblings and by `crew-mission-pipeline.ts` step 4 (the per-member
contribution loop) in place of the current inline template string.

### 2. Composition contract
- **Input** `{ crewId, task, tokenBudget }` → composer hydrates the other two:
  - `actions` = the member's registered tools + their `SkillTheory` (who/what/when/where/why/how) from
    [skill-theories.ts](../../packages/mcp-server/src/lib/skill-theories.ts) — only the skills relevant to `task`.
  - `memories` = `crew_get-relevant-memories` / `rag_recall` keyed to `task`, **ranked (relevance + recency)**,
    then **pruned to `tokenBudget`** (drop lowest-scoring first). This is the survived signal from Data/Geordi.
- **Output**: one tight prompt string: `persona → your actions for this task → what you already know → the ask`.

### 3. Frugality (the point — don't let the composer become a cost center)
- **One batched call composes ALL members**, not N calls. A single cheap structured call returns
  `{ picard: "...", data: "...", ... }` — turns 11 composer calls into 1.
- **Cache by task-signature.** `hash(task + memberSet + memoryIds)` → if unchanged, reuse the composed prompts
  for free. Re-running the same mission recomposes nothing.
- **Composer model = `quarkSelectModel(3)`** (cheapest adequate; ~DeepSeek $1.10/Mtok today). Never a frontier
  model — composing text from parts needs no tier-4 reasoning.
- **Token budget is a hard cap**, enforced by memory pruning before the call, so composer input can't balloon.

### 4. Governance (filtered to what's real)
No new crypto/PII machinery. Reuse what exists: the composer only reads RAG memory the crew already owns and
never egresses secrets. The NEW capability that needs governance is Part B's Aha **write** tools — see below.

---

## Part B — first concrete extension: full Aha hierarchy (scope)

Today the Aha MCP tools create **features only** — which is why Jonah collapsed 6 sprints + 6 epics + granular
stories/tasks into 6 flat features (JONAH-1..6). Add three governed write tools so the crew builds
**Firm → Client → Project → Epic → Story → Task**, with **Sprint = release**:

| New tool | Maps to | Shape (mirrors `aha_create-feature`) | Gotcha to respect |
|---|---|---|---|
| `aha_create-release` | **Sprint** | `{ agentId, productPrefix, name, startDate?, endDate?, confirm }` | features need a release — this unblocks proper sprints |
| `aha_create-epic` | **Epic** | `{ agentId, releaseId, name, description, confirm }` | epic-link quirk — set the epic on the feature explicitly |
| `aha_create-requirement` | **Task** | `{ agentId, featureRef, name, description, confirm }` | requirements live under a feature |

Each: WorfGate-gated write (reversible-draft where possible), registered `SkillTheory` (5W1H), registered on
**both** the main server and the per-request HTTP server in [index.ts](../../packages/mcp-server/src/index.ts).
Then **re-derive Jonah** into the real structure: 6 releases (S1–S6) → 6 epics → per-epic stories → per-story
requirements from [jonah-project-backlog.md](jonah-project-backlog.md).

---

## The project plan — expressed as per-member DYNAMIC PROMPTS

This is both the plan for Part B **and** a worked demonstration of Part A: each member's prompt shown as the
composer would assemble it — `{persona}` + `{actions for this task}` + `{memories they draw on}` + the ask.
Ordered by dependency; each tagged with the owning member and the RAG memories they recall.

### 1 · DATA — architecture (composer contract + Aha type model)
```
[persona]  You are Commander Data, architecture. Precise, contract-first, no ambiguity.
[actions]  data_review-architecture, data_analyze-type-safety, describe_skill.
[memories] recall: [[skill-theory-framework]] (5W1H → ToolAnnotations), [[aha-nomenclature]]
           (Firm→Client→Project→Epic→Story→Task; Sprint=release), [[crew-team-assembly]] (quarkSelectModel tiers).
[ask]      Define (a) the composeCrewPrompt(crewId, actions, memories, task, tokenBudget)->string contract
           incl. the batched-all-members output shape and the task-signature cache key; (b) the TypeScript
           types for the Aha hierarchy (Release/Epic/Requirement) reusing the existing feature shape.
```

### 2 · QUARK — finance (composer model + cost model)
```
[persona]  You are Quark, finance. Cheapest adequate, always cite the bill.
[actions]  quark_analyze-costs, crew_efficiency_analysis; quarkSelectModel / quarkSelectVisionModel.
[memories] recall: [[crew-team-assembly]] (MODEL_POOL, cost-ranked), [[dogfood-the-crew]] (Anthropic = pool member).
[ask]      Pin the composer model to quarkSelectModel(3) (cheapest adequate). Project per-run cost of the
           batched-1-call + cache design vs naive N-calls. Confirm no tier-4 escalation for composition.
```

### 3 · RIKER — implementation (build the tools + the composer)
```
[persona]  You are Commander Riker, implementation. Ship the working code, reuse existing pieces.
[actions]  riker_plan-execution, run_shell, plan_then_execute, aha_create-feature (as the template).
[memories] recall: [[aha-dogfood-backlog]] (Aha API gotchas: feature needs a release; epic-link quirk),
           [[agent-core-unification]] (tool-calling loop), [[crew-mcp-connection]].
[ask]      Implement aha_create-release / -epic / -requirement mirroring aha_create-feature. Implement
           crew-prompt-composer.ts per DATA's contract (batched call, cache-by-signature, memory prune-to-budget).
```

### 4 · WORF — security/governance (gate the new writes + SkillTheories)
```
[persona]  You are Lt. Worf, security. Governance is the shield, not the wall — auto-remediate, don't block.
[actions]  worf_security-audit, worfgate_request_change, worfgate_policy_status, defineSkillTheory.
[memories] recall: [[worfgate-credential-broker]] (governed writes, value never logged),
           [[skill-theory-framework]] (every new tool needs a 5W1H theory).
[ask]      Register a SkillTheory for each of the 3 new Aha tools (scope 'aha', sideEffects 'external').
           Route their writes through WorfGate as reversible-draft where possible; require confirm:true.
```

### 5 · GEORDI — infrastructure (wire composer into the model-selection path + cache)
```
[persona]  You are Geordi La Forge, infrastructure. Make it integrate cleanly with what's already wired.
[actions]  geordi_assess-infrastructure, geordi_verify-build-references, geordi_scaffold-vscode-tool.
[memories] recall: [[crew-team-assembly]] (quark selector is wired into prompt-engine.selectModelForCall
           + crewAhaModel — the system-wide primary path), [[embeddings]] (RAG recall is real).
[ask]      Wire composeCrewPrompt into crew-mission-pipeline.ts step 4 (replace the inline template) and add
           the task-signature cache. Verify build references across shared → mcp-server.
```

### 6 · O'BRIEN — devops (register everywhere + build/test)
```
[persona]  You are Chief O'Brien, devops. It's not done until it builds and the tests are green.
[actions]  obrien_audit-workspace, obrien_sync-dependencies, obrien_integrate-mcp-transport, run_shell.
[memories] recall: [[supabase-cli-migrations]] (build/test conventions), [[noninteractive-shell-env]]
           (zsh -ic for ~/.zshrc creds).
[ask]      Register the 3 new tools on BOTH the main and per-request HTTP servers in index.ts. Run
           pnpm --filter @story-agent/mcp-server build + test:unit. Confirm /mcp reconnect exposes them.
```

### 7 · CRUSHER + TASHA (YAR) — QA
```
[persona]  Dr. Crusher (system health) + Tasha Yar (test coverage). Prove it works and can't silently break.
[actions]  crusher_diagnose-system-health, yar_assess-test-coverage.
[memories] recall: [[skill-theory-framework]] (coverage tool: skill_coverage finds gaps).
[ask]      Unit-test the composer (prune-to-budget, cache-hit, batched shape) and the 3 Aha tools (WorfGate
           gate, gotcha handling). Run skill_coverage to confirm no theory gaps.
```

### 8 · TROI + UHURA — interconnection + re-derive Jonah
```
[persona]  Counselor Troi (UX/stakeholder) + Lt. Uhura (comms/interconnection).
[actions]  troi_analyze-ux-alignment, uhura_draft-communication, aha_recall.
[memories] recall: [[jonah-project-created]] (RAG 177 — JONAH-1..6 flat features to promote),
           [[jonah-project-backlog]] (the full 6-epic structure).
[ask]      Re-derive Jonah into the real hierarchy with the new tools (6 releases → 6 epics → stories →
           requirements). Confirm the web dashboard (/sprint) + VS Code extension read the same Aha/DB.
```

### 9 · PICARD — command (sequence + the gate)
```
[persona]  You are Captain Picard, command. Own the sequence; make the call.
[actions]  picard_assess-readiness; the "Make it so" mission gate.
[memories] recall: this mission's stored plan (RAG, tags dynamic-prompt-composer, aha-extension).
[ask]      Enforce order 1→8; hold the Jonah re-derivation (step 8) until the tools are built (3) + green (7).
           Make it so.
```

---

## Cost (Quark)
- **This planning pipeline:** $0.00232 (3,868 tok, DeepSeek tier-3, 0 Anthropic tokens for the work).
- **Composer at runtime (projected):** 1 batched cheap call/mission (~$0.0002 at DeepSeek rates) vs ~$0.0015
  for 11 naive calls — and **$0 on cache hits** (same task-signature). Net: composition is a rounding error
  against the members' own reasoning cost, which is the design goal.
- **Part B build:** run it on the agent-core loop (tier-3), not this Anthropic session — orchestrator verifies.
