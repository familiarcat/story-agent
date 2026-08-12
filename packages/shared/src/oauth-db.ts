/**
 * OAuth 2.1 data layer for the Story Agent MCP server's authorization endpoint (Path B from the
 * 2026-08-12 scoping: a minimal self-issued provider, not a proxy to an external IdP — see
 * packages/mcp-server/src/agent-core/oauth-provider.ts for the OAuthServerProvider implementation
 * that uses this module).
 *
 * Three concerns, each genuinely needing persistence (not just an in-memory Map — Fargate can run
 * more than one task, and a client registered against task A must be usable against task B):
 *   1. oauth_clients — RFC 7591 dynamically-registered clients (Claude.ai's connector setup
 *      self-registers here). Public clients only (PKCE, no client_secret) — this server has no
 *      confidential-client use case.
 *   2. oauth_authorization_codes — short-lived, SINGLE-USE codes binding a PKCE code_challenge to
 *      a redirect_uri + client. The single-use `consumed` flag is the actual security boundary
 *      here; a code reused after consumption is a replay attack, so consumeAuthorizationCode is an
 *      atomic UPDATE...WHERE consumed=false, not a read-then-write.
 *   3. oauth_revoked_tokens — access/refresh tokens are self-verifying signed JWTs (see
 *      oauth-provider.ts), so revocation can't rely on deleting a stored token — there isn't one.
 *      Revocation instead blocklists the token's `jti` here; verifyAccessToken checks both the
 *      signature AND that the jti isn't in this table.
 *
 * Reuses the same lazily-initialized Supabase singleton every other module in this package uses
 * (db(), exported from ./db.js) rather than opening a second connection.
 */
import { randomBytes } from 'node:crypto';
import { db } from './db.js';

export interface OAuthClientRecord {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  token_endpoint_auth_method: 'none'; // public clients only — no confidential-client path
  created_at: string;
}

export interface PendingAuthorizationCode {
  code: string;
  client_id: string;
  code_challenge: string;
  code_challenge_method: string;
  redirect_uri: string;
  resource: string | null;
  scopes: string[];
  expires_at: string;
}

const CODE_TTL_SECONDS = 60; // authorization codes are meant to be exchanged within seconds, not browsed

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Register a new public OAuth client (RFC 7591). Returns the assigned client_id. */
export async function registerOAuthClient(input: {
  clientName: string | null;
  redirectUris: string[];
}): Promise<OAuthClientRecord> {
  if (!input.redirectUris.length) throw new Error('redirect_uris must be non-empty');
  const client_id = `sa_${randomToken(16)}`;
  const row: OAuthClientRecord = {
    client_id,
    client_name: input.clientName,
    redirect_uris: input.redirectUris,
    token_endpoint_auth_method: 'none',
    created_at: new Date().toISOString(),
  };
  const supabase = await db();
  const { error } = await supabase.from('oauth_clients').insert(row);
  if (error) throw new Error(`registerOAuthClient failed: ${error.message}`);
  return row;
}

export async function getOAuthClient(clientId: string): Promise<OAuthClientRecord | null> {
  const supabase = await db();
  const { data, error } = await supabase.from('oauth_clients').select('*').eq('client_id', clientId).maybeSingle();
  if (error) throw new Error(`getOAuthClient failed: ${error.message}`);
  return (data as OAuthClientRecord | null) ?? null;
}

/** Issue a fresh, single-use authorization code bound to this PKCE challenge + redirect. */
export async function createAuthorizationCode(input: {
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  resource: string | null;
  scopes: string[];
}): Promise<string> {
  const code = randomToken(32);
  const supabase = await db();
  const { error } = await supabase.from('oauth_authorization_codes').insert({
    code,
    client_id: input.clientId,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    redirect_uri: input.redirectUri,
    resource: input.resource,
    scopes: input.scopes,
    consumed: false,
    expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) throw new Error(`createAuthorizationCode failed: ${error.message}`);
  return code;
}

/** Look up a code's stored PKCE challenge WITHOUT consuming it (SDK's challengeForAuthorizationCode). */
export async function peekAuthorizationCode(code: string): Promise<PendingAuthorizationCode | null> {
  const supabase = await db();
  const { data, error } = await supabase
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code', code)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`peekAuthorizationCode failed: ${error.message}`);
  return (data as PendingAuthorizationCode | null) ?? null;
}

/**
 * Atomically mark a code consumed and return its data — the actual replay-attack boundary.
 * `UPDATE ... WHERE code = ? AND consumed = false` returning the row: if two requests race to
 * redeem the same code, exactly one gets a non-empty result back; the other gets null and must
 * fail the exchange. This is why it's a conditional UPDATE, not a SELECT followed by an UPDATE.
 */
export async function consumeAuthorizationCode(code: string): Promise<PendingAuthorizationCode | null> {
  const supabase = await db();
  const { data, error } = await supabase
    .from('oauth_authorization_codes')
    .update({ consumed: true })
    .eq('code', code)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`consumeAuthorizationCode failed: ${error.message}`);
  return (data as PendingAuthorizationCode | null) ?? null;
}

/** Blocklist a token's jti so verifyAccessToken rejects it even though the signature is still valid. */
export async function revokeTokenJti(jti: string, expiresAt: Date): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from('oauth_revoked_tokens').insert({ jti, expires_at: expiresAt.toISOString() });
  // Revoking an already-revoked jti is a harmless no-op per the OAuth spec, not an error.
  if (error && !error.message.includes('duplicate')) throw new Error(`revokeTokenJti failed: ${error.message}`);
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  const supabase = await db();
  const { data, error } = await supabase.from('oauth_revoked_tokens').select('jti').eq('jti', jti).maybeSingle();
  if (error) throw new Error(`isTokenRevoked failed: ${error.message}`);
  return !!data;
}
