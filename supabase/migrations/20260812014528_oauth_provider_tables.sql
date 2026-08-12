-- OAuth 2.1 authorization endpoint (Path B, 2026-08-12) — dynamically registered clients,
-- single-use authorization codes, and a revocation blocklist for the self-issued JWT tokens.
-- See packages/shared/src/oauth-db.ts and packages/mcp-server/src/agent-core/oauth-provider.ts.

-- oauth_clients: RFC 7591 dynamically-registered clients (Claude.ai's connector setup self-registers
-- here on first connection attempt). Public clients only — PKCE, no client_secret ever stored.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT,
  redirect_uris TEXT[] NOT NULL,
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none' CHECK (token_endpoint_auth_method = 'none'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- oauth_authorization_codes: short-lived (60s), SINGLE-USE codes binding a PKCE code_challenge to a
-- client + redirect_uri. `consumed` is the actual replay-attack boundary — always updated via a
-- conditional UPDATE...WHERE consumed=false, never read-then-write (see consumeAuthorizationCode).
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  resource TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expiry ON oauth_authorization_codes(expires_at);

-- oauth_revoked_tokens: access/refresh tokens are self-verifying signed JWTs (no row per issued
-- token — that's the whole point of a JWT), so revocation blocklists the token's `jti` instead.
-- expires_at lets a cleanup job drop rows for tokens that would have expired naturally anyway.
CREATE TABLE IF NOT EXISTS oauth_revoked_tokens (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_revoked_expiry ON oauth_revoked_tokens(expires_at);

-- Housekeeping: expired authorization codes and long-revoked tokens are safe to prune. No cron is
-- wired yet — these tables are small (one row per auth attempt / revocation) and prod scale here
-- is "one operator", so this is a documented follow-up, not a blocker.
COMMENT ON TABLE oauth_authorization_codes IS 'Expired rows (expires_at < now()) are safe to delete; no automatic cleanup job wired yet.';
COMMENT ON TABLE oauth_revoked_tokens IS 'Rows past expires_at are safe to delete (the token would be rejected on expiry alone); no automatic cleanup job wired yet.';
