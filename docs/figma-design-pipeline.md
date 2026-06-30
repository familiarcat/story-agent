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
- **Gap:** **no Figma MCP is configured yet** — step 1 adds + evaluates one.

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
1. **Add + WorfGate-evaluate a Figma MCP** (e.g. Figma Dev Mode MCP) via `evaluate_tool_for_crew` → register in `.mcp.json` once it passes. *(First move.)*
2. **Pilot:** scaffold **one dashboard screen** (Next.js LCARS) **and one extension view** from a single Figma frame — through the full gate (WorfGate + audit + Troi/Uhura validation).
3. **Design-token bridge** (Data): Figma annotations → shared contract, so web + extension derive from one design.
4. **CI hook** (O'Brien): on a Figma update, the crew scaffolds to a **staging** preview (GitHub Actions — the repo's CI), default-routed to cheap OpenRouter tiers, frontier only on gate rejection.
5. **Measure** (Quark): Claude-cost delta vs the crew-run pipeline; expand once the pilot proves fidelity + savings.

## First move
`evaluate_tool_for_crew` on a Figma MCP → if it passes WorfGate, wire it into `.mcp.json` and run the pilot (one dashboard screen + one extension view).
