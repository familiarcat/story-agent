# Crew Memory Recall Protocol

**Standing rule: every Claude Code or Story Agent natural-language prompt should RECALL crew memory
before acting, and STORE durable conclusions after.** The crew's value compounds only if each turn
builds on what the crew already knows. This applies to the Anthropic-orchestrated Claude Code session
*and* to the OpenRouter Story Agent loop.

## The loop

```
NL prompt → RECALL (crew RAG) → act (crew/agent-core) → STORE (crew RAG) → next prompt recalls it
```

## Two memory stores

| Store | Function | Holds |
|---|---|---|
| Crew-wide shared | `storeObservationMemory` / `getRelevantObservationMemories` (`packages/shared/src/db.ts`) | deliberations, mission plans, tool-cards, persona self-references — embedded, recallable by anyone |
| Per-member personal | `storeCrewPersonalMemory` | a member's insights, discoveries, persona reflection |

Both use 64-dim embeddings (OpenRouter key reuse, hash fallback) and are WorfGate-redacted before
persistence + `clientId`-scoped for isolation.

## Where recall happens (the consumers)

- **agent-core `/agent` loop** — `rag_recall` is an always-on lens tool; `crew_deliberate` escalates
  hard tasks. (`packages/mcp-server/src/agent-core/loop.ts`, `bridges.ts`)
- **`/chat`** — `buildBridges(clientId).ragRecall(message, 4)` injects context.
- **Tool discovery/teaching** — `recall_taught_tools` reuses a peer's found MCP tool;
  `discover_mcp_tools` writes crew-wide tool-cards. (`mcp-discovery.ts`)
- **Self-learning** — every agent run stores a feedback card (`recordFeedback`); future runs recall it.
- **Mission pipeline** — each `runMissionPipeline` result is stored (MEM 22+) so later missions stay
  consistent with earlier rulings.
- **Persona** — each member's self-reference (Memory Alpha refresh) grounds their voice/judgment.
- **UI windows** — `/learnings`, `/crew/memories` surface the same RAG to humans.

## What it buys

1. **Don't re-litigate** prior decisions (e.g., deny-by-default security, Redis-TLS ruling).
2. **Capability reuse** — recall a taught tool instead of re-discovering it.
3. **In-character, role-appropriate** deliberation (persona memory).
4. **Cross-surface continuity** — VS Code, web portals, CLI share one RAG.
5. **Cost discipline** — recall prevents redundant deliberation/discovery.

## How to apply (every NL prompt)

1. **Recall first** — `rag_recall` (agent), or `getRelevantObservationMemories` / `recall_taught_tools`
   (scripts/tools), keyed to the task. Cite what you found.
  For **chat-client integration work**, also recall the saved client-capability matrix decision and
  review [docs/chat-client-capability-matrix.md](./chat-client-capability-matrix.md) before choosing
  a lane or recommending a client configuration.
2. **Act** — via the crew (`runMissionPipeline`) or the agent-core loop, per the dogfooding mandate.
3. **Store** — durable conclusions back to RAG (`storeObservationMemory` + a per-member note), tagged
   for recall.

When in doubt, recall. A prompt answered without checking crew memory is a missed compounding step.
