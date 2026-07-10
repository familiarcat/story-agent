# Connecting our MCP server directly to the Aha! MCP server

**Status:** REST lane is live now (crew automates Aha! via `aha:*` tools using `AHA_API_KEY`).
This doc isolates the steps to additionally make **our MCP server an MCP _client_ of the Aha!
remote MCP server** (`https://familiarcat.use3.aha.io/api/v1/mcp`).

## Why it's not just "add a Bearer header"
Probing the endpoint with the API key returns **HTTP 401 — "provide a valid OAuth access
token."** The Aha! remote MCP server speaks **OAuth 2.1**, not API-key auth. So a server-to-server
bridge needs an OAuth client + token lifecycle, which includes one interactive (browser) step.

## Steps to implement the bridge

1. **OAuth discovery.** GET the protected-resource / authorization-server metadata the MCP server
   advertises (per MCP auth spec): `https://familiarcat.use3.aha.io/.well-known/oauth-authorization-server`
   (and/or the `WWW-Authenticate` header on the 401). Capture `authorization_endpoint`,
   `token_endpoint`, `registration_endpoint`, supported scopes.
2. **Client registration.** Use Dynamic Client Registration (RFC 7591) against `registration_endpoint`
   if supported; otherwise register an OAuth app in Aha! and store the `client_id`/`client_secret`.
3. **Authorization Code + PKCE (one-time, interactive).** Generate PKCE verifier/challenge, open the
   `authorization_endpoint` in the user's browser, capture the `code` from the localhost callback,
   exchange at `token_endpoint` for an **access token + refresh token**. (Same UX as the Supabase MCP
   OAuth we already do.)
4. **Store tokens via WorfGate.** Persist `AHA_MCP_ACCESS_TOKEN` / `AHA_MCP_REFRESH_TOKEN` in
   `~/.alexai-secrets/api-keys.env` (never committed). Add a refresh routine that swaps the refresh
   token before expiry so subsequent runs are fully autonomous.
5. **MCP client connection.** In our MCP server, use `@modelcontextprotocol/sdk` `Client` +
   `StreamableHTTPClientTransport` pointed at `/api/v1/mcp` with `Authorization: Bearer <access token>`;
   run `initialize` → `tools/list`. (This is the handshake that 401'd with the API key.)
6. **Re-expose / proxy.** Either (a) proxy the discovered Aha! MCP tools through our server so the crew
   calls them by their native names (`get_record`, `get_page`, `search_documents`, `create_feature`…),
   or (b) keep our typed `aha:*` REST tools as the crew API and use the Aha! MCP only for the IDE
   assistant. Recommended: keep REST for crew autonomy (no token refresh in the hot path); use the MCP
   bridge for richer read surfaces (pages, document search) the REST tools don't cover.
7. **WorfGate governance.** Same controls as REST writes: confirm-gate on mutations, immutable audit,
   rate-limit circuit breaker (Aha! limit: 300/min, 20/sec).

## Discovery probe findings (2026-06)
Probed the live endpoint to build the server-to-server OAuth client:
- `POST /api/v1/mcp` (no token) → **401** with `WWW-Authenticate: Bearer realm="mcp",
  resource_metadata="https://familiarcat.use3.aha.io/.well-known/oauth-protected-resource/api/v1/mcp"`.
- That advertised `resource_metadata` URL, and the standard `/.well-known/oauth-authorization-server`
  + `/.well-known/openid-configuration` paths, **all return 404 / Aha HTML** on both the regional
  (`use3.aha.io`) and canonical (`familiarcat.aha.io` / `secure.aha.io`) hosts.

**Conclusion:** Aha! advertises OAuth 2.1 but its discovery metadata does not resolve cleanly to
server-side probing, and the authorization step is interactive (browser) regardless. Hand-rolling a
Node OAuth client is therefore both blocked (no resolvable discovery doc) and redundant — the **IDE
MCP client (Claude / VS Code) performs this OAuth handshake natively** when it connects to the server
declared in `.mcp.json` (the same way it handles the Supabase MCP). That is the supported path for the
crew/assistant to reach Aha!'s native MCP tools (pages, knowledge-base search).

## Decision (current)
- **Crew autonomy → REST** (`aha:*` tools, key-based, headless) — done.
- **Aha! MCP server → OAuth**, configured in repo `.mcp.json` for the **IDE/Claude assistant** lane
  (browser OAuth on first use).
- **Server-to-server MCP bridge** (steps 1–7) is the upgrade path when we want the crew to use Aha!'s
  own MCP tools (pages, knowledge-base search) rather than only the REST surface.
