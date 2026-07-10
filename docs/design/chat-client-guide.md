# Chat Client Guide

How to use Story Agent as the intelligence layer behind familiar chat clients while preserving
each host's native interaction model, and the roadmap for hardening those integration lanes.

Current repo state:

- the canonical server-side chat brain exists
- the OpenAI-compatible facade exists
- the VS Code participant lane exists
- the VS Code native provider lane exists behind a feature flag
- MCP remains the tool and orchestration lane

## Capability Matrix

| Client | Chat transport | Model / intelligence source | Context source | Filesystem CRUD path | Tool execution path | Approval / governance path | Best fit | Major limitations | Recommended default Story Agent integration mode |
|---|---|---|---|---|---|---|---|---|---|
| VS Code native Chat provider lane | VS Code `LanguageModelChatProvider` | Story Agent canonical chat brain via server-side `/chat` with Quark routing and crew memory | VS Code chat request history plus any context the host passes into the provider | Keep host-native file editing and workspace actions; do not move normal editor CRUD into Story Agent by default | Use the host chat for chat-only turns; hand off governed execution to Story Agent participant or `/agent` flows when needed | Host workspace trust plus Story Agent server-side policy when escalating beyond chat | Native-feeling chat inside VS Code without changing the Chat pane mental model | Provider APIs are version-sensitive; does not globally replace Copilot Auto; chat lane itself is not a full tool lane | Enable `storyAgent.chat.nativeProviderEnabled` and route answers through `/chat`; keep CRUD native |
| VS Code `@story-agent` participant lane | VS Code chat participant | Story Agent canonical chat brain and agent services via extension client | Active editor context, chat history, Aha tree, and workspace-aware prompts assembled by the extension | Extension-mediated edits and agent-driven CRUD when the user explicitly invokes `/agent` or related commands | Story Agent agent-core and MCP-backed capabilities when requested by participant commands | Story Agent WorfGate / agent approvals where applicable, plus host workspace trust | Deterministic Story Agent experience with explicit commands and governed automation | Not the same as built-in provider selection; requires the user to invoke the participant | Keep as the stable compatibility lane and primary governed execution surface in VS Code |
| Claude Code | MCP stdio / HTTP tool calls | Claude Code orchestrator with Story Agent crew reached through MCP tools | Claude session context plus Story Agent RAG memories and repo context | Primarily host-native file operations through Claude Code; Story Agent informs planning and tool decisions | MCP tools for crew memory, Aha, WorfGate, and mission orchestration | Claude Code's existing approval model plus Story Agent tool governance | Tool-rich orchestration where the host already supports repo editing well | Not a generic chat-model replacement lane; depends on MCP support and session approval | Keep Claude Code on MCP for tools and orchestration, not on the OpenAI-compatible facade |
| Continue | OpenAI-compatible chat API | Story Agent OpenAI-compatible facade adapting into canonical `/chat` | Continue's prompt/history/context injection plus Story Agent server-side memory | Prefer Continue's native workspace and edit primitives when configured; do not duplicate routine CRUD in the facade | Use Continue-native tools where available; escalate to Story Agent-controlled execution only through explicit separate flows | Continue-side approvals if present, plus Story Agent policy only for delegated execution services | Standard chat UX with minimal friction while inheriting Story Agent routing and memory | Current facade is non-streaming and text-only; tool calling is not exposed through the facade yet | Point Continue at `POST /v1/chat/completions`; keep editing in Continue unless a governed Story Agent lane is explicitly needed |
| Cline | OpenAI-compatible chat API or client-specific provider config | Story Agent OpenAI-compatible facade as the default intelligence source | Cline-managed session and file context plus Story Agent server-side memory | Prefer Cline's native code CRUD and workspace affordances; use Story Agent-controlled CRUD only if Cline is intentionally wired into a governed execution lane | Client-native tool use where supported; otherwise pair with a separate Story Agent agent lane rather than forcing CRUD into plain chat | Client approval model first; Story Agent approvals only when tool/governed execution is delegated | Familiar autonomous coding UX backed by Story Agent routing | Client-specific capabilities vary by version; facade does not yet expose streaming or tool calling | Use the facade for intelligence and preserve Cline's native UX for edits and context |
| Roo | OpenAI-compatible chat API or client-specific provider config | Story Agent OpenAI-compatible facade as the default intelligence source | Roo-managed prompt, workspace, and conversation context plus Story Agent server-side memory | Prefer Roo's native file CRUD model where available; reserve Story Agent-governed CRUD for explicit execution handoffs | Roo-native tools first; Story Agent tools through a separate governed lane when required | Roo approval model first; Story Agent governance only for delegated execution | Familiar agentic chat UX without forcing users into a Story Agent-specific frontend | Same facade limits as other OpenAI-compatible clients; integration quality depends on Roo's provider support | Use the facade as the chat brain and keep Roo's native interaction model intact |

### Notes

- MCP and chat transport are separate concerns. MCP is the Story Agent tool and orchestration lane, not the generic chat-model lane.
- The canonical Story Agent chat brain should stay server-side so Quark routing, crew memory recall, and policy behavior remain consistent across clients.
- Filesystem CRUD should stay client-native where the host already provides a strong editing model. Story Agent-controlled CRUD should be reserved for explicit governed execution flows rather than forced into every chat turn.
- OpenAI-compatible clients should point to Story Agent's facade when they want Story Agent intelligence, not directly to raw OpenRouter.
- No recommended integration path depends on globally hijacking GitHub Copilot Auto.

## Implementation Roadmap

The remaining work is to harden these lanes, clarify client boundaries, and roll out
client-specific defaults without changing the user's familiar chat UX.

### Phase 1: Foundation

#### Actions

- Treat the canonical server-side chat brain as the single intelligence source for all chat lanes.
- Keep CRUD ownership explicit per client: client-native where the host already has a strong editing model, Story Agent-governed only when execution is intentionally delegated.
- Document client handoff rules across provider, participant, facade, and MCP lanes.
- Add focused smoke coverage for the OpenAI-compatible facade and the VS Code native provider flag path.

#### Expected outcomes

- Story Agent has a stable control-plane story: chat intelligence is centralized, but user interaction remains native to each client.
- Teams stop conflating MCP with chat-model transport.
- Future client integrations have a clear boundary for when chat stays chat and when governed execution starts.

#### Validation signals

- Existing VS Code participant behavior is unchanged.
- The native provider lane can be toggled on without breaking the participant lane.
- `POST /v1/chat/completions` reaches the canonical chat path rather than a parallel model-selection implementation.

### Phase 2: Compatibility

#### Actions

- Publish client-specific connection guidance for Continue, Cline, and Roo using the OpenAI-compatible facade.
- Document supported and unsupported facade fields clearly, especially non-streaming and text-only behavior.
- Add lightweight compatibility examples for external clients so teams stop pointing those clients directly at raw OpenRouter when they want Story Agent behavior.
- Add a small response-contract test around the facade format to guard against accidental breaking changes.

#### Expected outcomes

- OpenAI-compatible clients can adopt Story Agent as their intelligence backend without requiring a custom frontend.
- External clients inherit Quark routing and crew memory without losing their familiar interaction model.

#### Validation signals

- A sample Continue-style config works against the facade.
- Client docs state clearly that the facade is for intelligence and not a replacement for MCP tool orchestration.
- Facade contract changes fail tests if they break expected OpenAI-compatible response structure.

### Phase 3: Tooling And Governance

#### Actions

- Define a standard handoff rule for governed execution: chat-only clients stay chat-only unless they explicitly escalate into Story Agent-controlled execution.
- Keep Claude Code on the MCP lane and document it as the reference integration for tool-aware orchestration.
- Clarify how approval paths differ between host-native CRUD and Story Agent-governed execution.
- Add telemetry fields that identify which lane served each interaction: provider, participant, facade, or MCP-driven execution.

#### Expected outcomes

- Teams can reason about where filesystem CRUD lives for each client.
- Governance becomes explicit instead of accidental.
- Observability can compare adoption and failure modes by lane.

#### Validation signals

- Metrics can distinguish chat-only traffic from governed execution traffic.
- Claude Code MCP workflows remain unaffected.
- Documentation explains approval boundaries for each lane without ambiguity.

### Phase 4: Rollout

#### Actions

- Keep the VS Code native provider lane feature-flagged until it has enough real-world validation.
- Default internal teams to the existing participant lane for governed execution in VS Code.
- Introduce the OpenAI-compatible facade first to teams already using Continue-like clients.
- Roll out client configuration docs and sample configs before attempting any client-specific automation.

#### Expected outcomes

- Adoption grows without forcing users to learn a new interface.
- Story Agent becomes the backend intelligence layer while the front-end experience remains familiar.

#### Validation signals

- Internal users can switch lanes without losing familiar UX.
- Adoption grows first in the lowest-friction clients.
- No rollout step depends on replacing Copilot Auto globally.

### Phase 5: Optimization

#### Actions

- Add streaming support to the OpenAI-compatible facade once the contract is stable.
- Expand the facade cautiously to support more content-part shapes only if real clients require them.
- Compare lane-level telemetry to determine which clients should stay client-native for CRUD and which benefit from deeper Story Agent-governed execution.
- Revisit whether the native provider lane should move from experimental to supported after usage and stability data is available.

#### Expected outcomes

- The system remains minimal where possible and only adds complexity where there is proven client value.
- Story Agent optimization stays centralized while each client keeps a familiar UX.

#### Validation signals

- Streaming support can be added without forking chat logic.
- Lane-specific metrics show where Story Agent adds value versus where the host client should stay in control.
- The native provider lane graduates only after clear stability evidence.

## Delivery Priority

1. Keep the canonical chat brain and MCP lane stable.
2. Harden and document the OpenAI-compatible facade.
3. Use the VS Code participant lane as the default governed execution path.
4. Treat the VS Code native provider lane as additive and experimental until validated.
5. Expand only after contract tests, telemetry, and client docs are in place.
