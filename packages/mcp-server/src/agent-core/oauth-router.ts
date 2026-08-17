/**
 * Assembles the OAuth 2.1 authorization surface as a standalone Express app, mounted into the
 * existing raw-http server (see index.ts) only for the specific paths ALB already allowlists
 * (terraform/alb.tf's mcp_http rule) — this does NOT replace the existing raw http.createServer
 * setup, it sits alongside it. See oauth-provider.ts for the provider implementation and the
 * trust-model rationale (single-owner passphrase gate, not a full IdP).
 */
import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { storyAgentOAuthProvider, verifyPendingAuthorization, checkOwnerPassphrase } from './oauth-provider.js';
import { createAuthorizationCode } from '@story-agent/shared';

const ISSUER = process.env.STORY_AGENT_OAUTH_ISSUER || 'https://storyagent.pbradygeorgen.com';

export function buildOAuthApp(): express.Express {
  const app = express();
  // FIX (found 2026-08-16, via a real production failure — Claude.ai's connector authorization
  // kept failing with no visible error until this was found in live server logs):
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR — the SDK's built-in rate limiter (used by the /token
  // handler) correctly refuses to trust the ALB's X-Forwarded-For header when Express's own
  // 'trust proxy' setting is unconfigured (defaults to false) — that refusal is a real, deliberate
  // guard against IP-spoofing, not a bug in the rate limiter. The actual topology here is exactly
  // one reverse-proxy hop (client -> ALB -> this ECS task), so `1` is the correct, precise value —
  // trusts exactly that one hop's X-Forwarded-For entry as the real client IP, not "trust anything."
  app.set('trust proxy', 1);
  app.use(express.urlencoded({ extended: false }));

  // Standard MCP-spec endpoints (metadata, /authorize GET, /token, /register, /revoke) — the SDK
  // owns request validation, PKCE code_verifier comparison, and error-shape correctness here.
  app.use(mcpAuthRouter({
    provider: storyAgentOAuthProvider,
    issuerUrl: new URL(ISSUER),
    resourceName: 'Story Agent Crew',
    scopesSupported: ['crew:deliberate', 'crew:memory', 'crew:tasks'],
  }));

  // Our own addition: the POST target for the consent form oauth-provider.ts's authorize() renders.
  // Not part of the MCP spec — purely this server's own single-owner consent step.
  app.post('/authorize/confirm', async (req, res) => {
    const pending = typeof req.body?.pending === 'string' ? req.body.pending : '';
    const passphrase = typeof req.body?.passphrase === 'string' ? req.body.passphrase : '';

    let claim;
    try {
      claim = await verifyPendingAuthorization(pending);
    } catch (err) {
      console.log('[OAUTH-DIAG] /authorize/confirm: pending token rejected', { errName: err instanceof Error ? err.constructor.name : typeof err, errMessage: err instanceof Error ? err.message : String(err), pendingPrefix: pending.slice(0, 16), ts: Date.now() });
      res.status(400).type('html').send('<p>Authorization request expired or invalid — go back and try connecting again.</p>');
      return;
    }
    console.log('[OAUTH-DIAG] /authorize/confirm: pending token verified', { clientId: claim.clientId, redirectUri: claim.redirectUri, ts: Date.now() });

    if (!checkOwnerPassphrase(passphrase)) {
      console.log('[OAUTH-DIAG] /authorize/confirm: passphrase check failed', { clientId: claim.clientId });
      // Deliberately generic — don't leak whether the passphrase was close, don't leak whether
      // STORY_AGENT_OAUTH_OWNER_PASSPHRASE is even configured.
      res.status(401).type('html').send('<p>Incorrect passphrase.</p>');
      return;
    }

    const code = await createAuthorizationCode({
      clientId: claim.clientId,
      codeChallenge: claim.codeChallenge,
      codeChallengeMethod: 'S256',
      redirectUri: claim.redirectUri,
      resource: claim.resource || null,
      scopes: claim.scope.split(' ').filter(Boolean),
    });
    console.log('[OAUTH-DIAG] /authorize/confirm: code issued, redirecting', { clientId: claim.clientId, codePrefix: code.slice(0, 8) });

    const redirect = new URL(claim.redirectUri);
    redirect.searchParams.set('code', code);
    if (claim.state) redirect.searchParams.set('state', claim.state);
    res.redirect(302, redirect.toString());
  });

  return app;
}

/** Path prefixes this app should handle — used by index.ts to decide whether to dispatch here. */
export const OAUTH_PATH_PREFIXES = ['/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource', '/authorize', '/token', '/register', '/revoke'];
