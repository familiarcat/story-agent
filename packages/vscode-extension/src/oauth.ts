/**
 * Provider-agnostic OAuth 2.0 (Authorization Code + PKCE) for the Story Agent extension.
 *
 * Two entry points (see participant/extension wiring):
 *  - runOAuthFlow(provider): opens the system browser to the provider's standard login
 *    (Aha!, Google, AWS Cognito, Okta, …), captures the redirect on a localhost loopback
 *    server, and exchanges the code (+ PKCE verifier) for tokens.
 *  - connectProviderInteractive(...): the VS Code UI — pick a provider, run the flow with a
 *    progress notification, and store tokens in SecretStorage.
 *
 * Uses a loopback redirect (http://127.0.0.1:<port>/callback) because that's what real
 * providers (Google, AWS) accept — not custom vscode:// URIs. PKCE means no client secret is
 * required for public clients.
 */
import * as vscode from 'vscode';
import * as http from 'http';
import { AddressInfo } from 'net';
import { createHash, randomBytes } from 'crypto';

export interface OAuthProviderConfig {
  id: string;
  name: string;
  /** Optional OIDC/OAuth discovery doc; if set, endpoints are auto-filled from it. */
  discoveryUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  /** Optional resource indicator (RFC 8707), e.g. the Aha! MCP endpoint. */
  resource?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  obtained_at: number;
}

const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

/** Resolve authorization/token endpoints, preferring an explicit config, else discovery. */
async function resolveEndpoints(p: OAuthProviderConfig): Promise<{ authorizationEndpoint: string; tokenEndpoint: string }> {
  if (p.authorizationEndpoint && p.tokenEndpoint) {
    return { authorizationEndpoint: p.authorizationEndpoint, tokenEndpoint: p.tokenEndpoint };
  }
  if (p.discoveryUrl) {
    const resp = await fetch(p.discoveryUrl, { headers: { Accept: 'application/json' } });
    if (resp.ok) {
      const d: any = await resp.json();
      if (d.authorization_endpoint && d.token_endpoint) {
        return { authorizationEndpoint: d.authorization_endpoint, tokenEndpoint: d.token_endpoint };
      }
    }
    throw new Error(`Discovery failed for ${p.name} (${p.discoveryUrl}). Set authorizationEndpoint + tokenEndpoint explicitly in settings.`);
  }
  throw new Error(`${p.name}: provide either discoveryUrl, or authorizationEndpoint + tokenEndpoint, in storyAgent.oauthProviders.`);
}

/** Start a one-shot loopback server that resolves with the auth code from the redirect. */
function startCallbackServer(expectedState: string): Promise<{ port: number; waitForCode: Promise<string>; close: () => void }> {
  return new Promise((resolve, reject) => {
    let settle: (code: string) => void;
    let fail: (err: Error) => void;
    const waitForCode = new Promise<string>((res, rej) => { settle = res; fail = rej; });

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '', 'http://127.0.0.1');
        if (!url.pathname.startsWith('/callback')) { res.writeHead(404); res.end(); return; }
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (error) { res.end(`<h2>Authorization failed</h2><p>${error}</p><p>You can close this tab.</p>`); fail(new Error(`Provider returned error: ${error}`)); return; }
        if (!code || state !== expectedState) { res.end('<h2>Invalid callback</h2><p>State mismatch. You can close this tab.</p>'); fail(new Error('OAuth state mismatch or missing code (possible CSRF).')); return; }
        res.end('<h2>✅ Connected</h2><p>Authorization complete — you can close this tab and return to VS Code.</p>');
        settle(code);
      } catch (e) {
        res.writeHead(500); res.end(); fail(e instanceof Error ? e : new Error(String(e)));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ port, waitForCode, close: () => server.close() });
    });
  });
}

/** Run the full Authorization Code + PKCE flow. Opens the browser; resolves with tokens. */
export async function runOAuthFlow(provider: OAuthProviderConfig, token?: vscode.CancellationToken): Promise<OAuthTokens> {
  if (!provider.clientId) {
    throw new Error(`${provider.name}: no clientId configured. Register an OAuth app with the provider and set it in storyAgent.oauthProviders.`);
  }
  const { authorizationEndpoint, tokenEndpoint } = await resolveEndpoints(provider);
  const { verifier, challenge } = pkce();
  const state = b64url(randomBytes(16));
  const { port, waitForCode, close } = await startCallbackServer(state);
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  try {
    const authUrl = new URL(authorizationEndpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    if (provider.scopes.length) authUrl.searchParams.set('scope', provider.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    if (provider.resource) authUrl.searchParams.set('resource', provider.resource);

    await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

    const code = await Promise.race([
      waitForCode,
      new Promise<string>((_, rej) => {
        const t = setTimeout(() => rej(new Error('OAuth timed out after 5 minutes.')), 5 * 60_000);
        token?.onCancellationRequested(() => { clearTimeout(t); rej(new Error('OAuth cancelled.')); });
      }),
    ]);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: provider.clientId,
      code_verifier: verifier,
    });
    if (provider.clientSecret) body.set('client_secret', provider.clientSecret);

    const resp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    if (!resp.ok) throw new Error(`Token exchange failed (${resp.status}): ${(await resp.text()).slice(0, 300)}`);
    const tokens: any = await resp.json();
    return { ...tokens, obtained_at: Date.now() };
  } finally {
    close();
  }
}

/** Refresh an access token using a stored refresh token. */
export async function refreshOAuth(provider: OAuthProviderConfig, refreshToken: string): Promise<OAuthTokens> {
  const { tokenEndpoint } = await resolveEndpoints(provider);
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: provider.clientId });
  if (provider.clientSecret) body.set('client_secret', provider.clientSecret);
  const resp = await fetch(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body });
  if (!resp.ok) throw new Error(`Refresh failed (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  const tokens: any = await resp.json();
  return { refresh_token: refreshToken, ...tokens, obtained_at: Date.now() };
}

// ── Provider registry (settings + sensible defaults) ─────────────────────────

const DEFAULT_PROVIDERS = (ahaDomain: string): OAuthProviderConfig[] => [
  {
    id: 'aha', name: 'Aha! MCP',
    discoveryUrl: ahaDomain ? `https://${ahaDomain}/.well-known/oauth-authorization-server` : undefined,
    clientId: '', scopes: [],
    resource: ahaDomain ? `https://${ahaDomain}/api/v1/mcp` : undefined,
  },
  { id: 'google', name: 'Google', discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration', clientId: '', scopes: ['openid', 'email', 'profile'] },
  { id: 'aws', name: 'AWS Cognito', clientId: '', scopes: ['openid', 'email'] }, // set discoveryUrl to your Cognito domain's openid-configuration
];

/** Merge user-configured providers over the defaults (by id). */
export function getConfiguredProviders(): OAuthProviderConfig[] {
  const cfg = vscode.workspace.getConfiguration('storyAgent');
  const ahaDomain = (process.env.AHA_DOMAIN ?? cfg.get<string>('ahaDomain') ?? '').trim();
  const defaults = DEFAULT_PROVIDERS(ahaDomain);
  const user = cfg.get<OAuthProviderConfig[]>('oauthProviders') ?? [];
  const byId = new Map(defaults.map(p => [p.id, p]));
  for (const u of user) byId.set(u.id, { ...byId.get(u.id), ...u });
  return [...byId.values()];
}

/** VS Code UI: pick a provider, run the flow, store tokens in SecretStorage. */
export async function connectProviderInteractive(context: vscode.ExtensionContext): Promise<void> {
  const providers = getConfiguredProviders();
  const picked = await vscode.window.showQuickPick(
    providers.map(p => ({
      label: p.name,
      description: p.clientId ? '$(key) clientId configured' : '$(warning) needs clientId in settings',
      detail: p.discoveryUrl ?? p.authorizationEndpoint ?? '(configure endpoints)',
      provider: p,
    })),
    { placeHolder: 'Connect an OAuth provider (browser sign-in)', matchOnDetail: true },
  );
  if (!picked) return;
  const provider = picked.provider;

  if (!provider.clientId) {
    const open = await vscode.window.showWarningMessage(
      `${provider.name} has no clientId. Register an OAuth app with the provider, then set it under storyAgent.oauthProviders.`,
      'Open Settings',
    );
    if (open) vscode.commands.executeCommand('workbench.action.openSettings', 'storyAgent.oauthProviders');
    return;
  }

  try {
    const tokens = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Connecting ${provider.name}…`, cancellable: true },
      (_p, token) => runOAuthFlow(provider, token),
    );
    await context.secrets.store(`storyAgent.oauth.${provider.id}.access_token`, tokens.access_token);
    if (tokens.refresh_token) await context.secrets.store(`storyAgent.oauth.${provider.id}.refresh_token`, tokens.refresh_token);
    await context.secrets.store(`storyAgent.oauth.${provider.id}.meta`, JSON.stringify({ obtained_at: tokens.obtained_at, expires_in: tokens.expires_in, scope: tokens.scope }));
    vscode.window.showInformationMessage(`✅ Connected to ${provider.name}. Token stored securely (SecretStorage).`);
  } catch (e) {
    vscode.window.showErrorMessage(`${provider.name} OAuth failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Retrieve a stored access token (for callers that bridge to the provider's API/MCP). */
export async function getStoredAccessToken(context: vscode.ExtensionContext, providerId: string): Promise<string | undefined> {
  return context.secrets.get(`storyAgent.oauth.${providerId}.access_token`);
}
