# Story Agent Chat Client Integration Recipes

These recipes show how to keep each client's UX familiar while routing chat intelligence through Story Agent's OpenAI-compatible facade.

## Shared Story Agent facade values

Use these values as the canonical backend settings unless your deployment changes them:

- Base URL: `http://localhost:3103/v1`
- Chat completions endpoint: `http://localhost:3103/v1/chat/completions`
- Model: `story-agent/crew-chat`
- API key:
  - if `AGENT_SERVICE_TOKEN` is configured on the server, use that token
  - if the server is running locally without auth, use any non-empty placeholder only if the client requires one

### Important notes

- The `model` value is advisory for the client. Story Agent still selects the actual backend model server-side through Quark.
- The current facade is non-streaming and text-only.
- Tool calling is not exposed through the facade. Keep client-native editing/tooling where available.

## Continue

### Config snippet

Continue in this environment uses a `~/.continue/config.yaml` model list with `provider`, `model`, and `apiKey` fields. Add a model entry like this:

```yaml
name: Local Assistant
version: 1.0.0
schema: v1
models:
  - name: Story Agent Crew
    provider: openai
    model: story-agent/crew-chat
    apiBase: http://localhost:3103/v1
    apiKey: ${STORY_AGENT_TOKEN:-local-dev-token}
context:
  - provider: code
  - provider: docs
  - provider: diff
  - provider: terminal
  - provider: problems
  - provider: folder
  - provider: codebase
```

### Validation

1. Start the Story Agent server with the agent port enabled.
2. Restart Continue or reload its models.
3. Select `Story Agent Crew`.
4. Ask a short prompt and confirm Continue behaves normally as a chat client.
5. Confirm editing remains Continue-native rather than being forced through Story Agent tooling.
6. Optionally verify the facade directly:

```bash
curl -s http://localhost:3103/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "story-agent/crew-chat",
    "messages": [{"role": "user", "content": "Say hello from Story Agent."}]
  }' | jq
```

You can also run the repo smoke check:

```bash
pnpm chat:smoke
```

If the local facade is not already running, start it first:

```bash
pnpm chat:start
```

## Cline

### Configuration values

Use Cline's OpenAI-compatible provider option and set these values:

- Provider: `OpenAI Compatible` or `OpenAI`
- Base URL: `http://localhost:3103/v1`
- Model: `story-agent/crew-chat`
- API key: `AGENT_SERVICE_TOKEN` if enabled, otherwise a placeholder value if the UI requires one

### Template snippet

If your installed Cline build exposes JSON-backed provider settings, the equivalent values look like this:

```json
{
  "provider": "openai",
  "baseUrl": "http://localhost:3103/v1",
  "apiKey": "${STORY_AGENT_TOKEN:-local-dev-token}",
  "model": "story-agent/crew-chat"
}
```

### Validation

1. Select the OpenAI-compatible provider path in Cline.
2. Apply the Story Agent facade values above.
3. Send a prompt and confirm the response is normal chat output, not a custom Story Agent UI.
4. Confirm filesystem CRUD still follows Cline's native interaction model.
5. If Cline expects streaming and fails, keep the integration disabled until the client can work with non-streaming responses or the facade gains streaming support.

Recommended rollout check:

```bash
pnpm chat:smoke
```

## Roo

### Configuration values

Use Roo's OpenAI-compatible or OpenAI-style model configuration and set these values:

- Provider: `OpenAI Compatible` or equivalent
- Base URL: `http://localhost:3103/v1`
- Model: `story-agent/crew-chat`
- API key: `AGENT_SERVICE_TOKEN` if enabled, otherwise a placeholder value if required

### Template snippet

If Roo exposes JSON-style provider settings, the corresponding values are:

```json
{
  "provider": "openai",
  "baseUrl": "http://localhost:3103/v1",
  "apiKey": "${STORY_AGENT_TOKEN:-local-dev-token}",
  "model": "story-agent/crew-chat"
}
```

### Validation

1. Configure Roo to use the Story Agent facade values.
2. Ask a simple prompt and confirm the response succeeds through the standard Roo chat UX.
3. Confirm file edits, approvals, and workspace actions remain Roo-native unless you explicitly delegate execution elsewhere.
4. Treat any missing streaming/tool-calling support as a client-compatibility limitation, not as a reason to bypass Story Agent and point directly at raw OpenRouter.

Recommended rollout check:

```bash
pnpm chat:smoke
```

## Recommended usage rule

- Use the facade for chat intelligence.
- Keep routine editing and CRUD in the client when the client already provides that workflow naturally.
- Use MCP or Story Agent-governed execution only when the client explicitly needs tool orchestration, governed edits, or approval-aware automation.

## Cross-check before rollout

Before recommending a client integration, recall the client-capability matrix in [docs/design/chat-client-guide.md](./chat-client-capability-matrix.md) and confirm that the chosen lane matches the client's natural CRUD and tool model.