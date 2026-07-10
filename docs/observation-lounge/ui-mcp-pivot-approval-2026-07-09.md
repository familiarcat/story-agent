# Observation Lounge: UI MCP Pivot Approval (2026-07-09)

Scope: VS Code extension + web dashboard UI focus.

## Process Executed
1. Each crew member identified UI-relevant MCP candidates aligned to role, skills, and prior RAG-guided cost/governance findings.
2. WorfGate adjudicated each candidate with explicit acceptance or denial reasoning.
3. Observation Lounge presented findings and rulings.
4. Approved slate compiled.
5. Human approval gate executed.

## Crew Findings and WorfGate Rulings
- Picard
  - Candidate: io.github.GLips/Figma-Context-MCP
  - Reasoning: strongest strategic leverage for design-to-code velocity and cross-surface UI consistency.
  - WorfGate: APPROVED (already approved in prior cycle; retained).

- Data
  - Candidate: app.zaklad/design-system
  - Reasoning: design-system metadata value considered.
  - WorfGate: DENIED (duplicates LCARS token source-of-truth and adds architecture drift risk).

- Riker
  - Candidate: io.github.KyuRish/mcp-dashboards
  - Reasoning: faster tactical dashboard KPI/chart scaffolding for delivery execution.
  - WorfGate: APPROVED as TRIAL (stdio-local, low blast radius).

- Geordi
  - Candidate: jpisnice/shadcn-ui-mcp-server
  - Reasoning: component scaffolding acceleration for UI implementation lanes.
  - WorfGate: APPROVED as TRIAL (stdio-local, no remote OAuth).

- O'Brien
  - Candidate: no new external request
  - Reasoning: transport/integration tooling already owned in internal toolset.
  - WorfGate: NO CHANGE.

- Worf
  - Candidate: com.figma.mcp/mcp (remote)
  - Reasoning: compared against local official Figma MCP.
  - WorfGate: DENIED (external egress and controlled-data governance concerns; local Figma path already approved).

- Yar
  - Candidate: com.mcparmory/figma
  - Reasoning: additional testability surface reviewed.
  - WorfGate: DENIED (redundant with official/local Figma + figma-context stack).

- Troi
  - Candidate: zeroheight MCP
  - Reasoning: stakeholder documentation and design-system communication value.
  - WorfGate: DENIED for now (remote OAuth + overlap; reconsider only if docs-specific gap appears).

- Crusher
  - Candidate: UI5 webcomponents MCP
  - Reasoning: component reliability ecosystem considered.
  - WorfGate: DENIED (introduces parallel component paradigm and maintenance burden).

- Uhura
  - Candidate: zeroheight MCP
  - Reasoning: communication and documentation consistency benefit.
  - WorfGate: DENIED for now (governance and cost not justified at current phase).

- Quark
  - Candidate posture: cost lane governance
  - Reasoning: preserve low-cost local stdio strategy for UI pivot.
  - WorfGate: ENFORCED (only low-cost, low-egress additions approved).

## Compiled Approved Additions
- jpisnice/shadcn-ui-mcp-server (TRIAL)
- io.github.KyuRish/mcp-dashboards (TRIAL)

## Retained Approved Servers
- story-agent MCP
- Aha MCP
- official local Figma MCP
- io.github.GLips/Figma-Context-MCP

## Human Approval Outcome
- Decision: APPROVED RECOMMENDED SLATE
- Outcome: apply the two trial additions above and keep denied list unchanged.

## Applied Configuration
- Updated MCP configuration in [../.mcp.json](../../.mcp.json):
  - Added shadcn-ui trial server entry (npm package @jpisnice/shadcn-ui-mcp-server)
  - Added dashboards trial server entry (npm package mcp-dashboards)
  - Both marked stdio-local with WorfGate trial constraints in comments.
