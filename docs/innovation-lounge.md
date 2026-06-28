# Innovation Lounge — the crew's creative jam

The Innovation Lounge is the crew **generating** ideas, not just analyzing tickets. Each of the 11
crew members invents an **original project in their canonical Memory-Alpha persona**, the whole crew
**debates** the slate, and Picard **resolves a portfolio**. It is the platform asserting itself
end-to-end: individual creativity → collective deliberation → owned decision.

It complements, and is distinct from, the two existing crew flows:

| Flow | Shape | Use |
|---|---|---|
| **Observation Lounge** ([crew-lounge.ts](../packages/mcp-server/src/lib/crew-lounge.ts)) | self-**reflection** (fixed 3 questions, hardcoded synthesis) | "what is this project for / what's my role / next steps" |
| **Mission pipeline** ([crew-mission-pipeline.ts](../packages/mcp-server/src/lib/crew-mission-pipeline.ts)) | **execute** a goal → owned, costed plan | turn a known goal into a plan |
| **Innovation Lounge** ([innovation-lounge.ts](../packages/mcp-server/src/lib/innovation-lounge.ts)) | **generate** + debate + resolve a portfolio | "what should we build? — let the crew dream, then decide" |

## How it works

1. **Pitch** — each member, on their Quark-selected cheapest-adequate OpenRouter model, invents a
   project: `PROJECT_NAME / ELEVATOR_PITCH / WHY_ME / WHAT_IT_BUILDS / FIRST_MILESTONE / CLOSING`.
   Persona drives it — Picard reaches for archetypes and archaeology, Data for invariants and
   precision, Worf for an adversarial red-team, Yar for stress-testing, Quark for cost. Each pitch is
   stored to cloud RAG (`crew_personal_memory`, tags `innovation-lounge` / `project-pitch`).
2. **Debate** — every member reads the full slate and reacts in-persona: `ENDORSE` (which pitch they
   champion) / `CHALLENGE` (the hard question from their domain) / `SYNERGY` (how two ideas combine).
3. **Resolve** — Picard reasons over all pitches + the debate and emits a **real** (LLM-driven, not
   hardcoded) portfolio: `SYNTHESIS / CLUSTERS / PURSUE_NOW / PURSUE_NEXT / PARK / DISSENT`. The whole
   session is stored to crew-wide RAG (`observation_memory`, tags `innovation-lounge` / `portfolio`).

Personas come from the canonical [crew-personas.ts](../packages/mcp-server/src/lib/crew-personas.ts)
records (Memory-Alpha-grounded traits, defining moments, specializations) — no live scrape needed.

## Run it

```bash
# CLI (writes a markdown artifact to docs/observation-lounge/ + stores to RAG)
npx tsx scripts/innovation-lounge.ts ["optional theme / arena"]
```

```jsonc
// MCP tool (crew-callable; needs a Claude Code restart + /mcp approve to appear)
run_innovation_lounge({ theme?: string, store?: boolean })
// → { pitches, portfolio: {pursueNow, pursueNext, park}, dissent, synthesis, efficiency, markdown }
```

A run is **frugal** — ~23 calls (11 pitches + 11 reactions + 1 synthesis), typically **~$0.04**
total; Anthropic is selected only for tier-4 members (Picard/Data/Worf), the rest run on
deepseek/llama. See [docs/observation-lounge/innovation-lounge-2026-06-28154349.md](observation-lounge/innovation-lounge-2026-06-28154349.md)
for a full example run (the crew converged on *narrative engineering*: Data's **Invariant Ledger** +
Worf's **WorfGate Sentinel** to pursue now; emotional-resonance ideas queued; cost tooling parked).

## Architecture notes

- The engine ([innovation-lounge.ts](../packages/mcp-server/src/lib/innovation-lounge.ts)) has **no
  `@story-agent/shared` import** — RAG persistence is **dependency-injected** so the same engine works
  under tsx (script injects from source) and in the built MCP server (tool injects from
  `@story-agent/shared/db`). This sidesteps the `./db` subpath resolving only under the built server.
- The MCP tool registers a `SkillTheory` (`run_innovation_lounge`, owner: Picard) per the repo's
  5W1H mandate, and is wired in [index.ts](../packages/mcp-server/src/index.ts).
- Pitches accumulate in RAG — a later run (or any recall) can ask "what has the crew already dreamed
  up?" so ideation compounds instead of repeating.

## Next step: instantiate the winners

The lounge produces *ideas + a decision*, not real PM records (low side-effects by design). To turn a
`PURSUE_NOW` winner into an actual project, onboard it under the firm (`onboard_client` / Aha
`create-feature`) — the documented follow-up to a lounge run.
