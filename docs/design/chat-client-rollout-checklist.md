# Story Agent Chat Client Rollout Checklist

Use this checklist before rolling Story Agent chat integration out to any client.

## Scope

This checklist assumes the current Story Agent architecture:

- MCP is the tool and orchestration lane
- the canonical server-side chat brain is the intelligence lane
- the OpenAI-compatible facade is the chat backend for Continue-like clients
- the VS Code participant lane remains the stable governed execution lane
- the VS Code native provider lane is additive and optional

## 1. Choose the right lane

Before configuring a client:

1. Read [docs/design/chat-client-guide.md](./chat-client-capability-matrix.md)
2. Confirm the client's natural CRUD and tool model
3. Read [docs/design/chat-client-recipes.md](./chat-client-integration-recipes.md)
4. Confirm you are not trying to force a client into the wrong lane

Decision rule:

- Use MCP for tool-aware orchestration clients such as Claude Code
- Use the OpenAI-compatible facade for Continue, Cline, Roo, and similar OpenAI-style chat clients
- Use the VS Code participant lane for governed execution in VS Code
- Use the VS Code native provider lane only when the feature flag and host support are both present

## 2. Verify runtime prerequisites

The local facade rollout requires the Story Agent server to be running.

Example local startup:

```bash
pnpm chat:start
```

This script pins the validated local agent port to `3103` and starts the MCP server with the agent HTTP lane enabled.

If your deployment uses a different base URL, substitute it consistently in the client config and smoke checks.

## 3. Run the shared smoke check

Run:

```bash
pnpm chat:smoke
```

Expected result:

- the script prints `story-agent facade smoke OK`
- the response includes a non-empty assistant message preview
- the response includes `model` and `usage` fields

If it fails:

1. Check whether the Story Agent server is running on `localhost:3103`
2. Check whether the deployment uses a different `STORY_AGENT_OPENAI_BASE_URL`
3. Check whether `AGENT_SERVICE_TOKEN` is required
4. Do not proceed with client rollout until the smoke check passes

## 4. Configure the client

Apply the appropriate recipe from [docs/design/chat-client-recipes.md](./chat-client-integration-recipes.md).

Minimum facade values:

- Base URL: `http://localhost:3103/v1`
- Model: `story-agent/crew-chat`
- API key: `AGENT_SERVICE_TOKEN` if auth is enabled, otherwise a client-acceptable placeholder if required

## 5. Validate the client behavior

For the target client:

1. Send a simple prompt
2. Confirm the response behaves like normal chat for that client
3. Confirm routine editing and CRUD remain native to the client where expected
4. Confirm no one is bypassing Story Agent and pointing directly at raw OpenRouter when Story Agent behavior is desired

## 6. Confirm limitations are understood

Current facade limits must be acknowledged before rollout:

- non-streaming only
- text-only content handling
- no tool calling through the facade
- no global GitHub Copilot Auto hijack

If the target client requires one of the unsupported capabilities, stop and document the gap instead of silently degrading expectations.

## 7. Capture the result

After a successful rollout or validation pass:

1. Store any durable client-specific findings to crew memory if write tools are available
2. If shared memory writes are unavailable, preserve the finding in repo memory and docs
3. Update the recipes doc only if the client config or observed limitation changed

## 8. Exit criteria

The rollout is ready only when:

- the correct lane was chosen from the matrix
- the runtime smoke check passed
- the client behaved normally with Story Agent as the intelligence backend
- CRUD ownership stayed explicit and unsurprising
- all known limitations were documented rather than hidden