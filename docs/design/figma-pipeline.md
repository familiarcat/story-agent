# Figma → Design → Scaffold pipeline (crew-run, cost-shifted off Claude Code)

> Crew-designed in the Observation Lounge (`run_crew_mission_pipeline`, stored to RAG). The point:
> the **OpenRouter crew** autonomously turns Figma designs into LCARS code for **both** surfaces
> (Next.js dashboards + VS Code extension), shifting design/scaffold work **off Claude Code** onto
> cheap OpenRouter tiers. Cost figures are illustrative until benchmarked.

## What we build on (already exists)
- **Design system:** [Lcars.tsx](../packages/ui/src/components/Lcars.tsx) + ~15 components (NavBar, ProjectManagerDashboard, DeveloperStoryWorkspace, HierarchyTree, SprintBoard, WorkflowStatus…).
- **Geordi's scaffold tools:** `geordi_scaffold-lcars-component` (web LCARS) + `geordi_scaffold-vscode-tool` (extension) — the codegen keystones.
- **MCP onboarding + governance:** `discover_mcp_tools` / `evaluate_tool_for_crew` / `recall_taught_tools`; WorfGate gates (`worf_veto-scaffolding`, `yar_audit-scaffolding`).
- **Tier-aware routing:** Quark runs design/scaffold on cheap tiers (deepseek/llama); frontier reserved for enterprise/high-stakes only.

## Selected Figma MCP (crew-decided)
The crew **selected the official Figma MCP, LOCAL desktop server** (`http://127.0.0.1:3845/mcp`) — wired into [.mcp.json](../.mcp.json).
- **Crew-approved** via `evaluate_tool_for_crew` (`figma-mcp-local`): **3 approvals, no veto, qualityScore 1.00**.
- The **REMOTE** server (`https://mcp.figma.com/mcp`, Figma-hosted OAuth) was **Worf-vetoed** — external egress / controlled-data leakage risk. Localhost loopback keeps design data on-machine and resolved the veto.
- **Requires:** the Figma desktop app running with Dev Mode MCP enabled (Figma → Preferences → *Enable Dev Mode MCP Server*). Read-only; scope = non-controlled UI frames only, never `sa_*`/client data.

## Bidirectional interop — one source of truth (Figma ↔ project)
"Build Figma files interoperable with the project building system" = a **round-trip**, not just import:
```
        ┌──────────────── single source of truth: LCARS design tokens (versioned in-repo) ───────────────┐
        ▼                                                                                                  ▲
  Figma frames ──(Figma MCP, read, localhost)──▶ crew → LCARS contract → scaffold (web + extension)       │
        ▲                                                                                                  │
        └──(code/tokens → Figma: Figma REST API / plugin, separately WorfGate-gated WRITE)────────────────┘
```
- **Read side (now):** Figma MCP (above) — design → code.
- **Write side (next):** publish LCARS tokens/component contracts back **into** Figma via the Figma REST API or a plugin, so generated/maintained Figma files stay interoperable with the build system. Writes are a **separate, separately-gated** step (Worf gates external writes distinctly from localhost reads).
- **Drift guard (Riker):** a `figma-lock.json` pins the token/contract version; CI flags Figma↔code mismatches early. **Lint-on-import (Troi):** flag design anti-patterns (e.g. absolute positioning) before they reach codegen.

## The pipeline (Figma → code, crew-driven)
```
Figma frame ──(Figma MCP: read frames/components/tokens)──▶ crew maps to LCARS contract
   ├─▶ geordi_scaffold-lcars-component  → Next.js dashboard component
   └─▶ geordi_scaffold-vscode-tool      → VS Code extension view (mirrored)
                         │
                 WorfGate + yar_audit-scaffolding (quality/fidelity/security gate)
                         │
                 staging preview → Troi/Uhura UX validation → merge
```
- **Data (one source of truth):** a **design-token / contract bridge** — annotate Figma layers (e.g. `@lcars:data-table`) → generate the shared TS contract, so the web component and the *mirrored* extension view stay consistent from one design.
- **Troi/Uhura (user-friendly):** preserve the LCARS grid language + persona fit — **management** dashboards (portfolio rollups) vs **developer** VS Code (story-tunnel); accessibility; a layout-fidelity checkpoint so the translation never feels "off-brand."

## Security & quality (Worf/Yar)
- **WorfGate-evaluate the Figma MCP before adoption** (3rd-party tool: token scope, least privilege, no controlled-data egress). Strip sensitive metadata before any design leaves to a 3rd-party API.
- **Audit the scaffolded output** (`yar_audit-scaffolding`) — generated code must meet our standards; reject malformed LCARS props / spacing before merge.

## Cost (Quark — the reason)
- Design + scaffold run on **cheap OpenRouter tiers** (deepseek/llama), not Claude Code → large Anthropic-cost reduction (~50–60% illustrative). Reserve frontier models for the cases the tier-escalation already flags (enterprise/high-stakes). Quark audits token spend.

## Approved path forward (Picard)
1. ~~**Add + WorfGate-evaluate a Figma MCP**~~ ✅ **DONE** — official Figma MCP (local desktop) crew-selected, crew-approved, wired into [.mcp.json](../.mcp.json). (Remote was Worf-vetoed.)
2. **Enable + connect:** turn on the Figma desktop Dev Mode MCP server; restart Claude Code / the crew so the `figma` MCP is reachable. *(Next move — needs the human: Figma desktop running.)*
3. **Pilot:** scaffold **one dashboard screen** (Next.js LCARS) **and one extension view** from a single Figma frame — through the full gate (WorfGate + `yar_audit-scaffolding` + Troi/Uhura validation).
4. **Design-token bridge** (Data): Figma variables ↔ shared LCARS-token contract, so web + extension derive from one design; `figma-lock.json` pins the version.
5. **Write side** (Riker): publish tokens/contracts **back into Figma** via the Figma REST API / plugin (separately WorfGate-gated) — completes the round-trip.
6. **CI hook** (O'Brien): on a Figma update, the crew scaffolds to a **staging** preview (GitHub Actions — the repo's CI), default-routed to cheap OpenRouter tiers, frontier only on gate rejection.
7. **Measure** (Quark): Claude-cost delta vs the crew-run pipeline; expand once the pilot proves fidelity + savings.

## Next move
The Figma MCP is selected, approved, and wired. To activate: **start the Figma desktop app with Dev Mode MCP enabled**, reconnect the `figma` MCP, then run the pilot (one dashboard screen + one extension view) entirely on the OpenRouter crew.
