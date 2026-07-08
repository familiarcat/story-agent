# Story Agent Chat Integration Architecture

Story Agent now exposes multiple integration lanes that intentionally solve different problems.

## The lanes

### 1. MCP tool lane

Use MCP when the client supports tool calling and wants access to the crew's tools, memory, Aha, WorfGate, and mission orchestration.

- Primary audience: Claude Code and other MCP-aware clients
- Entry point: [.mcp.json](../.mcp.json)
- Docs: [docs/claude-code-mcp.md](./claude-code-mcp.md)
- Purpose: tools and orchestration
- Non-goal: replacing the chat model backend for every client

### 2. Canonical chat brain

Use the server-side canonical chat brain when the client wants Story Agent's NL intelligence layer: Quark model selection, crew memory recall, server-side policy, and unified cost accounting.

Before dispatching to OpenRouter, the canonical chat brain now performs a local preflight inside Story Agent itself. By default that includes two layers: a lightweight prompt-optimization pass and a crew self-organization pass. The optimizer is intentionally narrow: whitespace cleanup and a missing-context guard for short ambiguous prompts. The crew preflight self-organizes in parallel, can place the same crew member on multiple teams, and can blend global RAG with crew-member personal memories before the final OpenRouter answer is generated.

- Entry point: `POST /chat`
- Implementation anchors:
  - [packages/mcp-server/src/agent-core/chat.ts](../packages/mcp-server/src/agent-core/chat.ts)
  - [packages/mcp-server/src/agent-core/http-server.ts](../packages/mcp-server/src/agent-core/http-server.ts)
- Purpose: server-owned chat behavior for all Story Agent surfaces

### 3. VS Code participant lane

Use the existing Story Agent participant when you want deterministic routing into Story Agent from VS Code without depending on native model-provider selection.

- Entry point: `@story-agent`
- Implementation anchors:
  - [packages/vscode-extension/src/participant.ts](../packages/vscode-extension/src/participant.ts)
  - [packages/vscode-extension/src/agentClient.ts](../packages/vscode-extension/src/agentClient.ts)
- Purpose: stable compatibility path

### 4. VS Code native provider lane

Use the native provider lane when VS Code's chat/model-provider APIs are available and you want Story Agent to appear as a first-class chat provider in the Chat view.

- Feature flag: `storyAgent.chat.nativeProviderEnabled`
- Implementation anchors:
  - [packages/vscode-extension/src/nativeChatProvider.ts](../packages/vscode-extension/src/nativeChatProvider.ts)
  - [packages/vscode-extension/src/extension.ts](../packages/vscode-extension/src/extension.ts)
- Purpose: native VS Code integration while still routing to the canonical Story Agent chat brain
- Non-goal: globally overriding GitHub Copilot Auto routing

### 5. OpenAI-compatible facade

Use the OpenAI-compatible facade when an external client expects an OpenAI-style chat-completions API but should still inherit Story Agent's server-side routing and memory behavior.

- Entry point: `POST /v1/chat/completions`
- Implementation anchors:
  - [packages/mcp-server/src/agent-core/chat.ts](../packages/mcp-server/src/agent-core/chat.ts)
  - [packages/mcp-server/src/agent-core/http-server.ts](../packages/mcp-server/src/agent-core/http-server.ts)
- Primary audience: Continue, Cline, Roo, or other OpenAI-compatible clients

## OpenAI-compatible facade contract

This is a minimal compatibility surface. It intentionally adapts into the canonical Story Agent chat brain instead of exposing raw OpenRouter behavior.

### Supported request fields

- `messages`: required
- `clientId`: optional Story Agent-specific extension
- `metadata.clientId`: optional alternative place to pass the Story Agent client scope
- `stream`: only `false` is supported currently

### Current limitations

- `stream: true` is rejected for now
- `model` may be supplied by the client but is not authoritative; Story Agent still chooses the actual backend model server-side via Quark
- only text message content is used; non-text multimodal parts are ignored in this first pass
- tool calling is not exposed through this facade

### Response behavior

- returns a standard chat-completions-style response object
- returns the actual Story Agent-selected model in the response `model` field
- usage metadata is returned when available from the canonical chat path

For direct `POST /chat` callers, the canonical response also includes `promptOptimization`, `crewSelfOrganization`, and `costAnalysis` metadata so local and deployed clients can inspect which guards ran, which teams were formed, which personal-memory joins were available, and what each prompt cost end to end.

Short activation phrases are also supported on `POST /chat`. If a caller sends a turn such as `make it so`, `engage`, or `next steps` with enough recent conversation history, Story Agent promotes that turn into the crew's end-to-end `plan_then_execute` path instead of treating it as a normal chat answer. The returned metadata includes `executionActivation` so clients can tell that the crew moved from analysis into execution.

## Recommended client mapping

- Claude Code: use MCP
- VS Code Chat with `@story-agent`: use the participant lane
- VS Code Chat with experimental native model selection: enable `storyAgent.chat.nativeProviderEnabled`
- Continue/Cline/Roo: point to Story Agent's OpenAI-compatible facade, not raw OpenRouter, when you want crew routing and memory

## Important boundary

Do not treat MCP as the same thing as the chat-model provider. MCP is the tool and orchestration lane. The canonical Story Agent chat brain is the intelligence lane. They work together, but they are not interchangeable.

## Local and deployed tandem

- Local development should prefer `pnpm dev` for full-stack work or `pnpm chat:start` for chat-only validation. Both paths keep the canonical Story Agent brain on `http://localhost:3103` active so local chat clients, the web UI, and Story Agent itself all exercise the same OpenRouter-backed routing path.
- Deployed surfaces should point `STORY_AGENT_AGENT_URL` or the client base URL at the deployed Story Agent agent service, not at raw OpenRouter, when you want crew routing, recall, and server-side cost accounting.
- In both environments, the ownership split stays the same: MCP is the tool lane, `/chat` and `/v1/chat/completions` are the NL intelligence lanes, and Quark remains the model selector behind them.

## Related artifacts

- [docs/chat-client-capability-matrix.md](./chat-client-capability-matrix.md)
- [docs/chat-client-implementation-roadmap.md](./chat-client-implementation-roadmap.md)
- [docs/chat-client-integration-recipes.md](./chat-client-integration-recipes.md)
- [docs/chat-client-rollout-checklist.md](./chat-client-rollout-checklist.md)