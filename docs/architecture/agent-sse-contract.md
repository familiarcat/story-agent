# Agent SSE contract — the backend boundary the front end consumes

This is the stable contract between the crew server (agent-core, served by the `mcp` ECS service) and
any front end (the Next.js `/agent` UI, the VS Code extension, the `story-agent` CLI). Source of truth:
[packages/mcp-server/src/agent-core/http-server.ts](../packages/mcp-server/src/agent-core/http-server.ts)
and the `AgentEvent` type in [loop.ts](../packages/mcp-server/src/agent-core/loop.ts). The UI should
code against THIS document, not re-derive the shape.

**Base URL:** `STORY_AGENT_AGENT_URL` (cloud ALB) with a localhost fallback (`http://localhost:3101`).
The Next.js UI proxies these through its own route handlers (the `/api/chat/stream` pattern) so the
browser never holds the service token.

## Auth

`Authorization: Bearer ${AGENT_SERVICE_TOKEN}` on `POST /agent`. When `AGENT_SERVICE_TOKEN` is unset
(local dev) the endpoint is open. The browser must NOT see this token — the Next proxy attaches it
server-side.

## Endpoints

| Method | Path | Purpose | Response |
|---|---|---|---|
| `POST` | `/agent` | Run the autonomous loop; streams the transcript | `text/event-stream` |
| `POST` | `/agent/approve` | Resolve a pending WorfGate gate | `200 {ok,id,decision}` / `404 {error:"no_pending_approval"}` |
| `GET`  | `/agent/health` | Liveness | `200 {ok:true,service,port}` |
| `GET`  | `/cost` | Cost observatory (spend by provider/model, savings vs frontier baseline) | `200 json` |
| `GET`  | `/learnings` | Recent agent-run feedback cards (self-learning RAG) | `200 {count,cards[]}` |
| `GET`  | `/symphony` | Posture snapshot: client hierarchy, WorfGate creds (presence only), tool coverage, recent invocations | `200 json` |

### `POST /agent` request body

```jsonc
{
  "input": "string (required) — the task",
  "clientId": "string | null — scopes RAG + client policy",
  "workspace": "string — absolute path (server-side)",
  "tier": 3,                  // optional Quark capability tier; default 3
  "requireApproval": false    // opt-in: pause yellow/red gates for an explicit operator decision
}
```

`400 {error:"input_required"}` if `input` is empty; `400 {error:"bad_json"}`; `401 {error:"unauthorized"}`.

## SSE stream

Each frame is `data: <json>\n\n`. Most frames are an `AgentEvent` with a `type`; the terminal frame is
named `event: done` (full `AgentRunResult`), and a fatal error is `event: error`. Render by `type`:

| `type` | Key fields | UI rendering |
|---|---|---|
| `model` | `model` | badge — which OpenRouter model Quark picked |
| `lens` | `text` | which focused tool subset was composed |
| `text` | `text` | streamed assistant reasoning |
| `tool_call` | `tool`, `args` | tool-call card (read/edit/run/search/git) |
| `gate` | `tool`, `tier` (green/yellow/red), `remediations[]`, `needsApproval?`, `approvalId?` | WorfGate chip; if `needsApproval`, show **Approve / Deny** |
| `tool_result` | `tool`, `text`, `tier` | result card |
| `escalation` | `tool?`, `text` | "escalated to crew" / withheld notice |
| `retry` | `attempt`, `text` | transient retry notice |
| `cost` | `costUSD`, `text` | running-spend indicator (review-threshold crossed) |
| `error` | `text` | error banner |
| (terminal) `event: done` | `AgentRunResult` (`model`, `iterations`, `toolCalls[]`, `totalCostUSD`, `totalTokens`, `escalated`, `budgetExceeded`, `observatory`) | final summary + cost footer |

### Interactive approvals (Wave 2)

When `requireApproval:true`, a proceed-able `yellow`/`red` op emits a `gate` frame with
`needsApproval:true` + `approvalId`. The UI then calls:

```
POST /agent/approve   { "id": "<approvalId>", "decision": "approve" | "deny" }
```

This is brokered through **Redis pub/sub** (`approval:<id>`), so the approve POST may land on a
DIFFERENT Fargate task than the one holding the SSE stream and still resolve it. Falls back to an
in-process Map with no Redis. **Auto-denies after `AGENT_APPROVAL_TIMEOUT_MS` (default 180s)** so a
closed tab can never hang the loop. (This is the path secured by the Redis TLS cutover — see
[runbooks/redis-tls-cutover.md](runbooks/redis-tls-cutover.md).)

## What's verified vs. pending (front-end readiness)

- ✅ Loop, model selection, WorfGate gating, cost ledger, RAG feedback cards — exercised live.
- ✅ Approval registry in-process fallback — unit tested (4/4).
- 🔶 Redis pub/sub approval round-trip — integration test committed
  ([approval-registry.integration.test.ts](../packages/mcp-server/src/agent-core/approval-registry.integration.test.ts));
  runs in CI / post-cutover with a reachable `REDIS_URL`.
- 🔶 Full HTTP→SSE path — smoke scaffold committed
  ([agent-sse.integration.test.ts](../packages/mcp-server/src/agent-core/agent-sse.integration.test.ts));
  runs when `STORY_AGENT_AGENT_URL` points at a live server.

The UI work can proceed against this contract now; the 🔶 items are deploy-gated verifications, not
contract changes.
