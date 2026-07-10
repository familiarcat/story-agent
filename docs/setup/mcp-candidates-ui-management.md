# MCP candidates for multi-client UI management — crew values + Quark cost analysis

> Crew-discovered from the **live official MCP registry** (`registry.modelcontextprotocol.io/v0/servers`)
> + verified web, then deliberated in the Observation Lounge (architecture fit + integration cost).
> Grounded, not invented. RAG: this analysis is stored for Quark's overall cost model.

## Capability test result (the honest finding)
The crew's `discover_mcp_tools` was **broken — returned 0 candidates**. Two real bugs, both fixed:
1. **Query over-stuffing** — [buildRegistryQuery](../packages/mcp-server/src/lib/mcp-discovery.ts) joined 6 words into one `search=` string; the registry does phrase matching, so it matched nothing. Fixed: `buildRegistrySearchTerms` searches each focused term **separately** and merges.
2. **Wrong response shape** — [normalizeServer](../packages/mcp-server/src/lib/mcp-registry-client.ts) read `raw.name`, but the v0 API nests fields under `.server`; every server's name came back `''` and was dropped. Fixed: read from `.server` (back-compat with flat).

After the fix the crew pulls **14 real candidates** for UI keywords. Regression test added (19/19 pass).
Note: the crew mission pipeline is pure-LLM (no web) and would hallucinate; **`discover_mcp_tools` is
the grounded path** (real registry → Worf/Quark/Picard evaluation → RAG tool-card).

## Quark cost analysis — ADOPT / TRIAL / PARK
Integration cost: **stdio-local free = LOW · remote+OAuth/paid = HIGHER**. Value vs our existing stack
(official Figma MCP already approved + the LCARS DTCG Tokens Studio git-sync loop already built).

| Server | Transport / cost | Arch fit | Verdict | Rationale |
|---|---|---|---|---|
| **io.github.GLips/Figma-Context-MCP** | stdio, free (Figma API token) | strong — Figma→code, feeds our scaffold | **ADOPT (first)** | ~13k-star design→code; LOW integration cost; complements (not duplicates) the official Figma MCP by giving richer layout data to the scaffold pipeline |
| **jpisnice/shadcn-ui-mcp-server** | stdio, free | good *if* we use shadcn/ui | **TRIAL** | free, local; only worth it if a client UI adopts shadcn alongside LCARS |
| **io.github.KyuRish/mcp-dashboards** | stdio, free | situational — chart/KPI widgets | **TRIAL** | free, local; useful for dashboard chart scaffolding; low risk |
| **zeroheight MCP** | remote, OAuth (paid tiers) | partial overlap — design-system docs | **TRIAL (gated)** | docs/usage-rules layer *could* complement tokens, but remote+OAuth = higher cost + Worf gate; overlaps our token loop |
| **app.zaklad/design-system** | remote http, OAuth | **redundant** — tokens/themes | **PARK** | our LCARS DTCG + Tokens Studio git-sync already owns tokens as source of truth |
| **com.figma.mcp/mcp** (remote) | remote http, OAuth | — | **PARK (have it)** | already crew-approved as the **local** variant (remote was Worf-vetoed for egress) |
| **com.mcparmory/figma** | stdio, free | redundant | **PARK** | duplicates official Figma export/design-data |
| **UI5 webcomponents-mcp(-react)** | stdio, **free (Apache-2.0)** | niche vs LCARS | **PARK** | free (no licensing fee — tier-3 crew mis-stated this), but UI5's component model competes with LCARS |

## First adoption (Picard) — ✅ DONE
**io.github.GLips/Figma-Context-MCP** — crew-approved via `evaluate_tool_for_crew`
(`figma-context-mcp-glips`: **3 approvals, no veto, qualityScore 1.00**) and **wired into
[.mcp.json](../.mcp.json)** as the `figma-context` **stdio-local** server (`npx figma-developer-mcp`),
auth via `FIGMA_API_KEY` from `~/.alexai-secrets` (WorfGate-governed, never committed; egress = Figma
API only). **To activate:** set `FIGMA_API_KEY`, then reconnect (`/mcp`). It adds richer Figma layout
data to the scaffold pipeline without duplicating the token loop.

## Redundancy guardrail (Data)
Our **single source of truth stays the in-repo LCARS DTCG tokens** (Tokens Studio git-sync loop). Any
adopted server must *feed* that model, never introduce a competing token store — which is why zaklad +
zeroheight's token layers are PARK/TRIAL-gated, not adopt.

## For Quark's overall cost model
- Adopting only **free stdio-local** tools (GLips now; shadcn/dashboards on demand) adds **$0 licensing**
  and no new egress surface — the cheapest way to extend UI capability.
- Remote/OAuth tools (zeroheight) are the only ones with recurring cost + a Worf gate; defer until a
  concrete multi-client docs need justifies it.
