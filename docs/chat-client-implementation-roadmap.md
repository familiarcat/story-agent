# Story Agent Chat Client Implementation Roadmap

This roadmap builds on the current repo state:

- the canonical server-side chat brain exists
- the OpenAI-compatible facade exists
- the VS Code participant lane exists
- the VS Code native provider lane exists behind a feature flag
- MCP remains the tool and orchestration lane

The remaining work is to harden these lanes, clarify client boundaries, and roll out client-specific defaults without changing the user's familiar chat UX.

## Phase 1: Foundation

### Actions

- Treat the canonical server-side chat brain as the single intelligence source for all chat lanes.
- Keep CRUD ownership explicit per client: client-native where the host already has a strong editing model, Story Agent-governed only when execution is intentionally delegated.
- Document client handoff rules across provider, participant, facade, and MCP lanes.
- Add focused smoke coverage for the OpenAI-compatible facade and the VS Code native provider flag path.

### Expected outcomes

- Story Agent has a stable control-plane story: chat intelligence is centralized, but user interaction remains native to each client.
- Teams stop conflating MCP with chat-model transport.
- Future client integrations have a clear boundary for when chat stays chat and when governed execution starts.

### Validation signals

- Existing VS Code participant behavior is unchanged.
- The native provider lane can be toggled on without breaking the participant lane.
- `POST /v1/chat/completions` reaches the canonical chat path rather than a parallel model-selection implementation.

## Phase 2: Compatibility

### Actions

- Publish client-specific connection guidance for Continue, Cline, and Roo using the OpenAI-compatible facade.
- Document supported and unsupported facade fields clearly, especially non-streaming and text-only behavior.
- Add lightweight compatibility examples for external clients so teams stop pointing those clients directly at raw OpenRouter when they want Story Agent behavior.
- Add a small response-contract test around the facade format to guard against accidental breaking changes.

### Expected outcomes

- OpenAI-compatible clients can adopt Story Agent as their intelligence backend without requiring a custom frontend.
- External clients inherit Quark routing and crew memory without losing their familiar interaction model.

### Validation signals

- A sample Continue-style config works against the facade.
- Client docs state clearly that the facade is for intelligence and not a replacement for MCP tool orchestration.
- Facade contract changes fail tests if they break expected OpenAI-compatible response structure.

## Phase 3: Tooling And Governance

### Actions

- Define a standard handoff rule for governed execution: chat-only clients stay chat-only unless they explicitly escalate into Story Agent-controlled execution.
- Keep Claude Code on the MCP lane and document it as the reference integration for tool-aware orchestration.
- Clarify how approval paths differ between host-native CRUD and Story Agent-governed execution.
- Add telemetry fields that identify which lane served each interaction: provider, participant, facade, or MCP-driven execution.

### Expected outcomes

- Teams can reason about where filesystem CRUD lives for each client.
- Governance becomes explicit instead of accidental.
- Observability can compare adoption and failure modes by lane.

### Validation signals

- Metrics can distinguish chat-only traffic from governed execution traffic.
- Claude Code MCP workflows remain unaffected.
- Documentation explains approval boundaries for each lane without ambiguity.

## Phase 4: Rollout

### Actions

- Keep the VS Code native provider lane feature-flagged until it has enough real-world validation.
- Default internal teams to the existing participant lane for governed execution in VS Code.
- Introduce the OpenAI-compatible facade first to teams already using Continue-like clients.
- Roll out client configuration docs and sample configs before attempting any client-specific automation.

### Expected outcomes

- Adoption grows without forcing users to learn a new interface.
- Story Agent becomes the backend intelligence layer while the front-end experience remains familiar.

### Validation signals

- Internal users can switch lanes without losing familiar UX.
- Adoption grows first in the lowest-friction clients.
- No rollout step depends on replacing Copilot Auto globally.

## Phase 5: Optimization

### Actions

- Add streaming support to the OpenAI-compatible facade once the contract is stable.
- Expand the facade cautiously to support more content-part shapes only if real clients require them.
- Compare lane-level telemetry to determine which clients should stay client-native for CRUD and which benefit from deeper Story Agent-governed execution.
- Revisit whether the native provider lane should move from experimental to supported after usage and stability data is available.

### Expected outcomes

- The system remains minimal where possible and only adds complexity where there is proven client value.
- Story Agent optimization stays centralized while each client keeps a familiar UX.

### Validation signals

- Streaming support can be added without forking chat logic.
- Lane-specific metrics show where Story Agent adds value versus where the host client should stay in control.
- The native provider lane graduates only after clear stability evidence.

## Delivery Priority

1. Keep the canonical chat brain and MCP lane stable.
2. Harden and document the OpenAI-compatible facade.
3. Use the VS Code participant lane as the default governed execution path.
4. Treat the VS Code native provider lane as additive and experimental until validated.
5. Expand only after contract tests, telemetry, and client docs are in place.