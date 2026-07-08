# System Test Guide — view crew results in the web UI + VS Code extension

A step-by-step walkthrough to bring up the whole stack and **see crew results** in both surfaces:
the Next.js web UI and the VS Code extension. Authored by the crew (Uhura — comms/walkthrough;
Yar — PASS/FAIL checks; O'Brien + Geordi — infra/wiring; Picard — ordering) via
`run_crew_mission_pipeline`, grounded in the verified runtime.

Each step has a **✅ PASS** check (Yar) so you know it actually worked.

---

## 0. Prerequisites

- `pnpm install` has run; you can build (`pnpm run build`).
- Crew creds are in your shell (`~/.zshrc` / `~/.alexai-secrets`) — the key ones:
  - `CREW_LLM_APPROVED_KEY` (OpenRouter) — crew LLM + embeddings. Without it the crew runs in demo
    mode and live jams/missions won't produce real output.
  - `SUPABASE_URL` + `SUPABASE_KEY` (or service key) — RAG reads (observation + crew memories).
  - `AHA_DOMAIN` + `AHA_API_KEY` — optional, only for the Aha hierarchy/story views.

> ✅ PASS: `echo $CREW_LLM_APPROVED_KEY | cut -c1-6` prints a prefix (not empty).

---

## 1. Start the stack

**One command (recommended):**
```bash
cd ~/Developer/story-agent
pnpm dev
```
This brings up the MCP server (stdio) + agent-core SSE (**:3103**) + RAG read service (**:3102**) +
web UI (**:3000**).

`pnpm dev` is the canonical local parity path: chat clients, the web UI, and Story Agent orchestration all target the same local Story Agent brain on `http://localhost:3103`, which is where Quark routing and OpenRouter-backed memory-aware chat behavior live.

**Or two terminals (for debugging):**
```bash
# Terminal 1 — MCP + agent + RAG
pnpm mcp
# Terminal 2 — web UI
STORY_AGENT_AGENT_URL=http://localhost:3103 STORY_AGENT_RAG_URL=http://localhost:3102 \
  pnpm --filter @story-agent/ui dev
```

> ✅ PASS: `curl -s localhost:3103/agent/health` → `{ "ok": true, ... }`, and `localhost:3000`
> loads the LCARS home. (If `:3103` isn't listening, you didn't set `STORY_AGENT_AGENT_PORT`.)

---

## 2. Generate something to look at

If RAG is empty, create results first:
```bash
# Innovation Lounge — 11 persona pitches → debate → portfolio (≈$0.04, ≈90s)
npx tsx scripts/innovation-lounge.ts "the future of the Story Agent platform"
```
This stores each pitch to `crew_personal_memory` and the session to `observation_memory`
(storyId `innovation-lounge`), and writes `docs/observation-lounge/innovation-lounge-*.md`.

> ✅ PASS: the script prints `obs=<uuid>` and a `📄 docs/observation-lounge/...md` path.

---

## 3. Web UI walkthrough (http://localhost:3000)

| # | Go to | You should see | ✅ PASS |
|---|---|---|---|
| 3.1 | **/innovation-lounge** | Latest crew jam: Picard's resolution + portfolio, the 11 pitches, the debate. Session switcher if >1. | The pitch cards render with crew names; portfolio list is non-empty. |
| 3.2 | **/crew/memories** | Per-member RAG. Pick a member → their memories; the jam pitches appear (titled `Innovation Lounge pitch — …`). Search `innovation-lounge`. | Selecting `data`/`worf` shows their pitch memory. |
| 3.3 | **/observation-lounge** | 4-step wizard: load an Aha story → context → params → launch. Shows mission plan + debate + shared RAG memories. | A story loads and the mission-plan panel populates. |
| 3.4 | **/agent** | Live agent-core loop. Enter a task → SSE stream: model, tool calls, WorfGate gates, cost. | Events stream and a final cost appears. |
| 3.5 | **/dashboard** | Aha firm→client→project→story hierarchy + story statuses. | The hierarchy tree renders (needs `AHA_*`). |
| 3.6 | **/learnings**, **/cost** | Crew skill improvements; token/cost ledger. | Pages render without error. |

---

## 4. VS Code extension walkthrough

**Load it** (after a build — the new Innovation Lounge command needs the rebuilt bundle):
```bash
pnpm --filter story-agent-vscode build
pnpm ext:package && pnpm ext:install-local    # or: F5 "Run Extension" from the extension folder
```
Reload VS Code. The extension talks to the agent (**:3103**) + RAG (**:3102**); dashboard links open
**:3000**.

| # | Action | You should see | ✅ PASS |
|---|---|---|---|
| 4.1 | Command Palette → **"Story Agent: Open Innovation Lounge"** | Browser opens `localhost:3000/innovation-lounge`. | The jam view loads in the browser. |
| 4.2 | Command Palette → **"Story Agent: Open Observation Lounge"** | Browser opens `/observation-lounge`. | Wizard loads. |
| 4.3 | Chat view → `@story-agent /agent <task>` | Autonomous loop runs: tool calls, gates, cost, model. | Streams and finishes with a result. |
| 4.4 | Chat view → `@story-agent /prepare <Aha story>` | Loads the story → Observation Lounge brief + crew mission plan. | Brief renders. |
| 4.5 | Chat → `/symphony` | Live posture: firm→client→project, WorfGate creds, tool-theory coverage. | Posture prints. |
| 4.6 | Sidebar → **Aha tree** (storyAgent.projectStructure) | Products/releases/stories; right-click a story → Prepare. | Tree populates (needs `AHA_*`). |
| 4.7 | Chat → `/agent run the crew Innovation Lounge` | Triggers the `run_innovation_lounge` MCP tool; then refresh **/innovation-lounge** to see the new session. | A new session appears at the top of the web view. |

---

## 5. Where the Innovation Lounge results live (all four)

1. **Web** — `/innovation-lounge` (dedicated read-only view) and `/crew/memories` (per-pitch).
2. **Extension** — "Story Agent: Open Innovation Lounge" command; run live via `/agent`.
3. **RAG** — `observation_memory` (storyId `innovation-lounge`) + `crew_personal_memory` (the pitches).
4. **Repo** — `docs/observation-lounge/innovation-lounge-*.md` (full markdown transcript).

---

## 6. Smoke tests (Yar) — fast confidence without the UIs

```bash
curl -s localhost:3103/agent/health                      # agent up
curl -s "localhost:3000/api/innovation-lounge?limit=3"   # → { success:true, sessions:[…] }
curl -s "localhost:3000/api/crew/memories?crew=data"     # → { success:true, memories:[…] }
```
> ✅ PASS: all three return JSON (not a connection error); the lounge endpoint lists ≥1 session
> after step 2.

---

## 7. Activation notes

- The **extension Innovation Lounge command** ships in the rebuilt bundle (step 4) — reinstall/reload
  to get it.
- The **`run_innovation_lounge` MCP tool** appears in Claude Code only after a restart + `/mcp`
  re-approve (new tools load on connect).
- `/innovation-lounge` and its API route are live in the web build (no restart needed beyond `pnpm dev`).

## 8. Troubleshooting — `EADDRINUSE` on `pnpm dev`

If you see `listen EADDRINUSE: address already in use 0.0.0.0:3102` (or :3101/:3103/:8000), a previous
MCP instance still holds the port (a stale `node --watch`, or a second `pnpm dev`). As of the
`guardListen` hardening this is now a single non-fatal log line — the existing instance keeps serving,
so the UIs still reach RAG/agent. To make THIS process own the port instead:
```bash
lsof -nP -iTCP:3102 -sTCP:LISTEN     # see who holds it
lsof -ti:3102 | xargs kill           # free it (repeat for 3101/3103/3000/8000), then re-run pnpm dev
```
Only run one `pnpm dev` at a time. (Crew lesson: O'Brien RAG memory, tags `eaddrinuse`/`ports`.)

## 9. Dev Tour — guided walkthrough of every screen/component (DEV ONLY)

A developer-only overlay that cycles through the current screen and every opted-in component, showing
a **hovering card above each for 5 seconds**, scaled to the target, with prev/pause/next controls and a
5-second countdown. It's the fastest way to expose and sanity-check every screen + component.

**Enable it (local dev only):**
```bash
NEXT_PUBLIC_DEV_TOUR=1 pnpm --filter @story-agent/ui dev
# (or add NEXT_PUBLIC_DEV_TOUR=1 to packages/ui/.env.local, then pnpm dev)
```
A **"▶ Dev Tour"** button appears bottom-right. Click it to walk the current screen; navigate between
routes and re-run to cover all screens. Screen copy comes from the nav IA ([domains.ts](../packages/ui/src/components/domains.ts)).

**Add a component to the tour:** put `data-dev-tour="my-id"` on its root element and add a `my-id`
entry to [registry.ts](../packages/ui/src/components/dev-tour/registry.ts). No other wiring.

**⛔ Production safety (hard gate — do not weaken):** the tour renders only when
`NODE_ENV !== 'production'` **and** `NEXT_PUBLIC_DEV_TOUR === '1'`. In the prod Docker build
(`NODE_ENV=production`) the constant folds to `false` and the engine is **dead-code-eliminated** —
verified: the DevTour-unique strings are absent from `packages/ui/.next/static` after a prod build.
Never set `NEXT_PUBLIC_DEV_TOUR` in `terraform/*`, `docker/*`, or any deployed environment.
(Crew guardrail: Worf RAG memory, tags `never-ship`/`dev-tour`.)

---

*Crew portfolio for this work (mission pipeline, $0.0019): Geordi/O'Brien — verify ground truth +
minimal read-only wiring reusing existing routes; Data — read by memory tag/storyId, no new tables;
Yar — explicit PASS/FAIL per step; Uhura — the walkthrough; Quark — reuse existing endpoints, no new
infra; Picard — "Make it so."*
