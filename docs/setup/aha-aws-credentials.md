# Aha! credentials: AWS single-source-of-truth + direct-Aha fallback

Implements the crew's debated decision ([crew debate ruling]). Resolver:
[packages/shared/src/aha-credentials.ts](../packages/shared/src/aha-credentials.ts) `resolveAhaCredentials()`.

## Resolution chain (automatic)
1. **AWS Secrets Manager (single source of truth)** — used when `AWS_AHA_SECRET_ID` (or `_ARN`) is set.
   Runtime fetch via the AWS SDK → rotation propagates without redeploy; the key never has to sit in
   task-env metadata.
2. **Environment** (`AHA_DOMAIN` + `AHA_API_KEY`/`AHA_API_TOKEN`) — direct-Aha fallback. Covers local
   dev (`~/.alexai-secrets`) AND the simpler ECS "Secrets Manager → task-env injection" deployment.
3. **Hard error in production** — if `AWS_AHA_SECRET_ID` is set but the fetch fails inside an AWS
   runtime (ECS/Lambda detected), the resolver throws rather than silently using env.

The app reads `process.env` only via this resolver, so all consumers (MCP server, scripts, UI) share it.

## Option B — runtime fetch (recommended; true SSOT, live rotation)
1. Create the secret:
   ```bash
   aws secretsmanager create-secret --name story-agent/aha \
     --secret-string '{"AHA_DOMAIN":"familiarcat.use3.aha.io","AHA_API_KEY":"<key>"}'
   ```
2. On the image: `pnpm add @aws-sdk/client-secrets-manager` (optional dep; resolver dynamic-imports it).
3. Task/role env: `AWS_AHA_SECRET_ID=story-agent/aha`, `AWS_REGION=...`; IAM task role allows
   `secretsmanager:GetSecretValue` on that ARN.
4. Rotation: update the secret value, then `resolveAhaCredentials({ refresh: true })` (no redeploy).

## Option A — ECS task-env injection (simplest; rotation needs task refresh)
ECS task definition maps the secret into env; the resolver picks it up at step 2 (no SDK, no IAM dance):
```json
"secrets": [
  { "name": "AHA_DOMAIN",  "valueFrom": "arn:aws:secretsmanager:...:story-agent/aha:AHA_DOMAIN::" },
  { "name": "AHA_API_KEY", "valueFrom": "arn:aws:secretsmanager:...:story-agent/aha:AHA_API_KEY::" }
]
```

## Local dev
Nothing to do — `AHA_DOMAIN`/`AHA_API_KEY` from `~/.alexai-secrets/api-keys.env` (via `~/.zshrc`) →
resolver returns `source: env`. (Do NOT put secrets in `~/.vscode` — it's VS Code's config dir.)

## Why not AWS Cognito as Aha's IdP (Option C)
The crew killed it: Aha! runs its own OAuth server and does not expose external OIDC/SAML IdP config
for API/MCP access, so Cognito cannot be federated as the identity provider. AWS is the secret *store*,
not the *IdP*, for Aha.

## Direct-Aha OAuth fallback (extension)
For Aha's native MCP tools (OAuth, not API key), the generic PKCE flow
([packages/vscode-extension/src/oauth.ts](../packages/vscode-extension/src/oauth.ts), command
"Connect OAuth Provider") stores tokens in VS Code SecretStorage — the direct-Aha credential path when
AWS is not in play.
