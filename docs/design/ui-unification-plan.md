# Cross-Platform UI/UX Unification Plan

**Crew-planned in the Observation Lounge** (transcript:
[observation-lounge/ui-unification-2026-06-25012412.md](observation-lounge/ui-unification-2026-06-25012412.md);
recorded to RAG — obs `d7bfbc0a`, Troi decision_note). This is the synthesis: information architecture,
a VS Code feature-parity matrix, the Aha integration model, and a phased build plan.

Goal: **one consistent crew experience across the general dashboard and the VS Code extension**, with the
extension reaching **Claude Code / Copilot / Continue parity** *and* integrating Aha + story management.

## 1. Unified Information Architecture (shared by web + VS Code)

The same primary objects, labels, and navigation on both surfaces — only the *renderer* differs.

| Domain object | Web (Next.js `packages/ui`) | VS Code (`packages/vscode-extension`) |
|---|---|---|
| **Crew** (11 officers) | `/crew` grid + profile | Activity-bar tree: officers + status |
| **Missions / Observation Lounge** | `/observation-lounge` | Chat participant `@crew` + lounge webview panel |
| **Stories / Epics / Sprints** (Aha) | `/dashboard`, `/story`, `/sprint` | Activity-bar tree (Explorer-style) + story context |
| **Cost (Quark)** | cost panel | status-bar item + cost on each run |
| **Security (WorfGate)** | posture badge | status-bar gate indicator + audit on actions |
| **RAG / Memory** | memory views | `@memory` context provider |

**Navigation principle (Troi):** mirror Aha's `firm → client → project → epic → story → task`
hierarchy *natively* on both surfaces — a collapsible tree in the VS Code activity bar (like the
Explorer), and the VS Code **command palette** pattern adopted in the web UI for cross-platform muscle
memory. Avoid an "Aha bolted on" feel in the IDE.

## 2. VS Code feature-parity matrix (Data's anchor — versioned scope)

Mapped to our **agent-core loop** (`packages/mcp-server/src/agent-core`) + the **VS Code Chat API**.
`current` = exists today, `planned` = v1 parity scope, `deferred` = post-v1.

| Capability | Claude Code | Copilot | Continue | Story Agent status | Notes |
|---|:--:|:--:|:--:|---|---|
| Chat participant (`@crew`) | ✓ | ✓ | ✓ | **current** | `participant.ts` + `chatEngine.ts` |
| Agentic loop (read/edit/shell/search) | ✓ | ✓ (agent) | ✓ (agent) | **current** | `agentClient.ts` → `/agent` SSE |
| Multi-file edits / apply | ✓ | ✓ | ✓ | **current** | agent-core `apply_patch` (atomic) |
| Slash commands (`/plan` `/fix` `/tests`) | ✓ | ✓ | ✓ | **planned** | register on the chat participant |
| `@` context providers (`@file`/`@codebase`/`@memory`) | ✓ | ✓ | ✓ | **planned** | Chat API references + RAG recall |
| Plan mode + diff/plan review | ✓ | ✓ | ~ | **planned** | surface agent-core plan events as a review panel |
| Inline chat (Ctrl+I in editor) | ✓ | ✓ | ✓ | **planned** | editor inline chat over agent-core |
| Inline completions (ghost text) | – | ✓ | ✓ | **deferred** | needs an `InlineCompletionItemProvider` (separate from chat) |
| MCP integration | ✓ | ~ | ✓ | **current** | we *are* an MCP server |
| Subagents / agent teams | ✓ | – | – | **current** | crew mission pipeline (Picard→Riker→Quark→crew) |
| Cost surfacing (Quark) | – | – | ~ | **planned** | unique to us — status bar + per-run |
| Security gating (WorfGate) | hooks | – | – | **planned** | unique to us — visible gate state |
| Aha story → mission → PR | – | – | – | **planned** | unique to us — the integration differentiator |

**Bounded v1 parity (Picard's definition-of-done):** chat participant + agent mode + multi-file edits
+ slash commands + `@` context + plan/diff review + inline chat. Inline ghost-text completion is
**deferred** (separate provider, high effort) so parity isn't an indefinite moving target.

## 3. Aha + story management integration (both surfaces)

- **Single canonical API layer** (Data): stories/epics/tasks are first-class entities served by one
  API, with platform-specific renderers — never two drifting data models.
- **Local cache + background sync** (Geordi): the VS Code tree reads from a local cache instantly and
  reconciles with Aha asynchronously, so live coding never stalls on webhook/API latency.
- **Core flow** on both surfaces: *browse/select a story → run a crew mission → open PR → sync status*,
  with the full hierarchy visible.
- **Shared taxonomy doc** (Uhura): align Aha (`epic/story/task`) ↔ IDE task vocabulary before build.

## 4. Shared design system & state model

- A shared package (tokens, crew theming, status semantics) consumed by both the Next.js app and the
  extension webviews, so the two surfaces can't visually diverge. Per-surface adapters only at the edges
  (Chat API rendering vs React DOM).
- One canonical client for `/agent` SSE + mission pipeline + Aha, reused by both surfaces.

> Pivot note: the web dashboard remains the general-purpose crew surface; chat is no longer a first-class
> dashboard navigation item. High-frequency conversational work is expected to live in VS Code.

## 5. Cost & security woven into the UX

- **Quark (cost):** real-time spend on each run + a status-bar/dashboard indicator; alerts on spikes.
- **WorfGate (security):** platform-scoped, short-lived tokens — a VS Code session must **not** silently
  inherit web session privileges (Worf); gate state (green/yellow/red) is visible, and controlled-data
  actions are audited.

## 6. Phased build plan (Riker — integration checkpoints, Yar QA gates)

> Phases advance only after explicit **Aha ↔ VS Code ↔ Web** integration sign-off (Data + Yar).

- **Phase 0 — Anchor:** Data publishes the parity matrix above as the living scope/QA checklist; Uhura
  publishes the shared taxonomy.
- **Phase 1 — Shared shell:** shared design-system package + canonical client + unified navigation model
  (web command palette + VS Code activity-bar tree). *Owners: Troi, Geordi.*
- **Phase 2 — VS Code core parity:** slash commands, `@` context providers, inline chat, plan/diff
  review over agent-core; Aha story context in the tree (cache + background sync); WorfGate
  platform-scoped tokens. *Owners: Geordi, Worf.*
- **Phase 3 — Instrumentation + flows:** Quark cost dashboards (both surfaces); end-to-end
  story → mission → PR → status sync; O'Brien hardens CI for incremental web+extension builds with
  per-phase rollback. *Owners: Quark, O'Brien.*
- **Deferred:** inline ghost-text completion (`InlineCompletionItemProvider`).

## Sources (crew research)

- [VS Code Chat Extension API](https://code.visualstudio.com/api/extension-guides/chat)
- [GitHub Copilot features in VS Code](https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features)
- [Continue customization overview](https://docs.continue.dev/customize/overview)
- [Claude Code overview](https://code.claude.com/docs/en/overview)
