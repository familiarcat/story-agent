/**
 * OAuthServerProvider for the Story Agent MCP server (Path B, 2026-08-12 — a minimal self-issued
 * provider, not a proxy to an external IdP; see the scoping conversation for why: this is
 * single-operator infra, and standing up AWS Cognito would be more total work than this, plus
 * Cognito has known friction with RFC 7591 dynamic client registration).
 *
 * Implements exactly the interface @modelcontextprotocol/sdk's mcpAuthRouter expects
 * (server/auth/provider.js's OAuthServerProvider) — the SDK owns the actual HTTP endpoints,
 * request validation, and PKCE code_verifier↔code_challenge comparison; this file owns identity
 * (who's allowed to authorize) and token issuance/verification only.
 *
 * Trust model: there is exactly one resource owner (you). The `authorize()` step does not silently
 * auto-approve — see oauth-router.ts's consent page — because this endpoint is public on the
 * internet; without an explicit gate, ANYONE who discovers it could complete a fake authorization
 * flow and mint themselves a valid token. The gate is a shared passphrase you already hold
 * (STORY_AGENT_OAUTH_OWNER_PASSPHRASE), not a full identity provider — appropriate for one owner,
 * not appropriate if this ever needs to serve multiple distinct humans.
 *
 * Tokens are symmetric-key signed JWTs (HS256 via `jose`) — both issuer and verifier are this same
 * service, so there's no need for asymmetric keys here. If this ever needs to be verified by a
 * THIRD service (not just this server checking its own tokens), that's the trigger to move to
 * RS256/EdDSA with a published JWKS — noted here so it isn't a silent landmine later.
 */
import { Response } from 'express';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { randomUUID } from 'node:crypto';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import {
  registerOAuthClient,
  getOAuthClient,
  createAuthorizationCode,
  peekAuthorizationCode,
  consumeAuthorizationCode,
  revokeTokenJti,
  isTokenRevoked,
} from '@story-agent/shared';

const ISSUER = process.env.STORY_AGENT_OAUTH_ISSUER || 'https://storyagent.pbradygeorgen.com';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes — short-lived by design; refresh to renew
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DEFAULT_SCOPES = ['crew:deliberate', 'crew:memory', 'crew:tasks']; // deliberately excludes any mutating-file scope — see hosted-workspace guard, which still applies regardless of scope

function signingKey(): Uint8Array {
  const secret = process.env.STORY_AGENT_OAUTH_SIGNING_KEY;
  if (!secret) throw new Error('STORY_AGENT_OAUTH_SIGNING_KEY not set — cannot sign or verify OAuth tokens');
  return new TextEncoder().encode(secret);
}

async function signToken(payload: {
  sub: string;
  client_id: string;
  scope: string;
  token_type: 'access' | 'refresh';
  resource?: string;
}, ttlSeconds: number): Promise<{ token: string; jti: string; expiresAt: number }> {
  const jti = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setSubject(payload.sub)
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(signingKey());
  return { token, jti, expiresAt };
}

async function verifyToken(token: string, expectedType: 'access' | 'refresh') {
  const { payload } = await jwtVerify(token, signingKey(), { issuer: ISSUER, audience: ISSUER });
  if (payload.token_type !== expectedType) {
    throw new Error(`expected a ${expectedType} token, got ${String(payload.token_type)}`);
  }
  if (typeof payload.jti === 'string' && (await isTokenRevoked(payload.jti))) {
    throw new Error('token has been revoked');
  }
  return payload;
}

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const record = await getOAuthClient(clientId);
    if (!record) return undefined;
    return {
      client_id: record.client_id,
      client_name: record.client_name ?? undefined,
      redirect_uris: record.redirect_uris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    };
  },
  async registerClient(client) {
    console.log('[OAUTH-DIAG] registerClient: entry', { clientName: client.client_name, redirectUris: client.redirect_uris, ts: Date.now() });
    const record = await registerOAuthClient({
      clientName: client.client_name ?? null,
      redirectUris: client.redirect_uris,
    });
    return {
      client_id: record.client_id,
      client_name: record.client_name ?? undefined,
      redirect_uris: record.redirect_uris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_id_issued_at: Math.floor(new Date(record.created_at).getTime() / 1000),
    };
  },
};

export const storyAgentOAuthProvider: OAuthServerProvider = {
  clientsStore,

  /**
   * Does NOT auto-approve. Renders nothing itself — the actual consent page lives in
   * oauth-router.ts (a plain HTML form gated on STORY_AGENT_OAUTH_OWNER_PASSPHRASE), because the
   * SDK's `authorize()` contract expects either a completed redirect OR a page the SDK doesn't
   * otherwise control. Encoding the pending request into a short-lived signed JWT (rather than a
   * DB row) keeps the GET step stateless; the single-use security boundary is still enforced later,
   * on the authorization CODE itself (oauth-db.ts's consumeAuthorizationCode), not on this step.
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    console.log('[OAUTH-DIAG] authorize: rendering consent page', { clientId: client.client_id, redirectUri: params.redirectUri, resource: params.resource?.toString(), ts: Date.now() });
    const pending = await new SignJWT({
      client_id: client.client_id,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      state: params.state ?? '',
      resource: params.resource?.toString() ?? '',
      scope: (params.scopes ?? DEFAULT_SCOPES).join(' '),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m') // the consent page has 5 minutes to be submitted, not browsed indefinitely
      .sign(signingKey());

    res.status(200).type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Story Agent — Authorize</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:80px auto;color:#e6e6e6;background:#0a0e14}
input{width:100%;padding:10px;margin:8px 0;background:#131822;border:1px solid #2a3441;color:#e6e6e6;border-radius:6px;box-sizing:border-box}
button{width:100%;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600}
h1{font-size:18px;color:#9d7bea}</style></head>
<body>
<h1>🖖 Story Agent — Authorize ${client.client_name ?? client.client_id}</h1>
<p>This will grant deliberation, memory-recall, and task-organization access — no local file writes
(that boundary is enforced server-side, not by this consent step).</p>
<form method="POST" action="/authorize/confirm">
  <input type="hidden" name="pending" value="${pending}" />
  <label>Owner passphrase</label>
  <input type="password" name="passphrase" autofocus required />
  <button type="submit">Authorize</button>
</form>
</body></html>`);
  },

  /** Returns the STORED challenge for the SDK's own PKCE comparison — does not verify it here. */
  async challengeForAuthorizationCode(_client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const pending = await peekAuthorizationCode(authorizationCode);
    if (!pending) throw new Error('unknown, expired, or already-consumed authorization code');
    return pending.code_challenge;
  },

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL,
  ): Promise<OAuthTokens> {
    console.log('[OAUTH-DIAG] exchangeAuthorizationCode: entry', { clientId: client.client_id, codePrefix: authorizationCode.slice(0, 8), ts: Date.now() });
    // Consuming (not peeking) here is the actual single-use guarantee — see consumeAuthorizationCode's
    // own comment for why this must be a conditional UPDATE, not a read-then-write.
    const consumed = await consumeAuthorizationCode(authorizationCode);
    if (!consumed) {
      console.log('[OAUTH-DIAG] exchangeAuthorizationCode: code already used, expired, or unknown', { clientId: client.client_id, codePrefix: authorizationCode.slice(0, 8) });
      throw new Error('authorization code already used, expired, or unknown');
    }
    if (consumed.client_id !== client.client_id) {
      console.log('[OAUTH-DIAG] exchangeAuthorizationCode: client_id mismatch', { presentedClientId: client.client_id, codeIssuedToClientId: consumed.client_id });
      throw new Error('authorization code was not issued to this client');
    }
    console.log('[OAUTH-DIAG] exchangeAuthorizationCode: code consumed ok, issuing tokens', { clientId: client.client_id });

    const scope = consumed.scopes.join(' ') || DEFAULT_SCOPES.join(' ');
    const access = await signToken({ sub: 'story-agent-owner', client_id: client.client_id, scope, token_type: 'access', resource: consumed.resource ?? undefined }, ACCESS_TOKEN_TTL_SECONDS);
    const refresh = await signToken({ sub: 'story-agent-owner', client_id: client.client_id, scope, token_type: 'refresh', resource: consumed.resource ?? undefined }, REFRESH_TOKEN_TTL_SECONDS);

    return {
      access_token: access.token,
      refresh_token: refresh.token,
      token_type: 'bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope,
    };
  },

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    console.log('[OAUTH-DIAG] exchangeRefreshToken: entry', { clientId: client.client_id, tokenPrefix: refreshToken.slice(0, 12), ts: Date.now() });
    let payload;
    try {
      payload = await verifyToken(refreshToken, 'refresh');
    } catch (err) {
      console.log('[OAUTH-DIAG] exchangeRefreshToken: verifyToken rejected', { clientId: client.client_id, tokenPrefix: refreshToken.slice(0, 12), errName: err instanceof Error ? err.constructor.name : typeof err, errMessage: err instanceof Error ? err.message : String(err) });
      throw err;
    }
    if (payload.client_id !== client.client_id) {
      console.log('[OAUTH-DIAG] exchangeRefreshToken: client_id mismatch', { presentedClientId: client.client_id, tokenIssuedToClientId: payload.client_id });
      throw new Error('refresh token was not issued to this client');
    }
    const scope = scopes?.length ? scopes.join(' ') : (typeof payload.scope === 'string' ? payload.scope : DEFAULT_SCOPES.join(' '));

    const access = await signToken({ sub: 'story-agent-owner', client_id: client.client_id, scope, token_type: 'access', resource: resource?.toString() }, ACCESS_TOKEN_TTL_SECONDS);
    // Rotate the refresh token too (best practice — limits the blast radius of a leaked refresh token).
    const newRefresh = await signToken({ sub: 'story-agent-owner', client_id: client.client_id, scope, token_type: 'refresh', resource: resource?.toString() }, REFRESH_TOKEN_TTL_SECONDS);
    if (typeof payload.jti === 'string') {
      await revokeTokenJti(payload.jti, new Date((payload.exp ?? Math.floor(Date.now() / 1000)) * 1000));
    }
    console.log('[OAUTH-DIAG] exchangeRefreshToken: success, rotated', { clientId: client.client_id, revokedJti: typeof payload.jti === 'string' ? payload.jti.slice(0, 12) : null, newRefreshPrefix: newRefresh.token.slice(0, 12) });

    return {
      access_token: access.token,
      refresh_token: newRefresh.token,
      token_type: 'bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope,
    };
  },

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    let payload;
    try {
      payload = await verifyToken(token, 'access');
    } catch (err) {
      console.log('[OAUTH-DIAG] verifyAccessToken: rejected', { errName: err instanceof Error ? err.constructor.name : typeof err, errMessage: err instanceof Error ? err.message : String(err), tokenPrefix: token.slice(0, 12) });
      if (err instanceof joseErrors.JWTExpired) throw new Error('access token expired');
      throw new Error(`invalid access token: ${err instanceof Error ? err.message : String(err)}`);
    }
    return {
      token,
      clientId: String(payload.client_id),
      scopes: typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : [],
      expiresAt: payload.exp,
      resource: typeof payload.resource === 'string' && payload.resource ? new URL(payload.resource) : undefined,
    };
  },

  async revokeToken(_client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    try {
      const { payload } = await jwtVerify(request.token, signingKey(), { issuer: ISSUER, audience: ISSUER });
      if (typeof payload.jti === 'string') {
        await revokeTokenJti(payload.jti, new Date((payload.exp ?? Math.floor(Date.now() / 1000) + 3600) * 1000));
      }
    } catch {
      // Per RFC 7009: an invalid/already-expired token is a no-op, not an error.
    }
  },
};

/** Exported for oauth-router.ts's POST /authorize/confirm handler. */
export async function verifyPendingAuthorization(pendingToken: string): Promise<{
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  resource: string;
  scope: string;
}> {
  const { payload } = await jwtVerify(pendingToken, signingKey(), { issuer: ISSUER, audience: ISSUER });
  return {
    clientId: String(payload.client_id),
    redirectUri: String(payload.redirect_uri),
    codeChallenge: String(payload.code_challenge),
    state: String(payload.state ?? ''),
    resource: String(payload.resource ?? ''),
    scope: String(payload.scope ?? DEFAULT_SCOPES.join(' ')),
  };
}

export function checkOwnerPassphrase(candidate: string): boolean {
  const expected = process.env.STORY_AGENT_OAUTH_OWNER_PASSPHRASE;
  if (!expected) return false; // fail closed — no passphrase configured means nobody gets in
  // Constant-time-ish compare via length check + full compare; a timing side-channel here is a low
  // (single-owner, low-value) risk, but there's no reason not to be careful for free.
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
