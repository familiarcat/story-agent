/**
 * External secret providers for the WorfGate Credential Broker.
 *
 * These plug HashiCorp Vault and AWS Secrets Manager into the broker's provider chain. Both are
 * OPTIONAL and config-gated — if their env config is absent they report inactive and the chain
 * falls through to the env provider (~/.zshrc). WorfGate's authorization + audit are unchanged;
 * these only add WHERE a secret can be sourced from.
 *
 * Vault:           VAULT_ADDR + VAULT_TOKEN + VAULT_SECRET_PATH (KV v2, e.g. "secret/data/story-agent")
 * Secrets Manager: AWS_WORFGATE_SECRET_ID (a JSON secret of name→value) + AWS_REGION
 */
import { registerCredentialProvider } from './worfgate-credentials.js';

// Small TTL cache so we don't hit the backend on every resolve.
function makeCache(ttlMs = 60_000) {
  let at = 0;
  let bundle: Record<string, string> | null = null;
  return {
    async get(loader: () => Promise<Record<string, string>>, now: number): Promise<Record<string, string>> {
      if (bundle && now - at < ttlMs) return bundle;
      bundle = await loader();
      at = now;
      return bundle;
    },
  };
}

// ── HashiCorp Vault (KV v2, via HTTP — no SDK dependency) ─────────────────────
const vaultCache = makeCache();
export const vaultCredentialProvider = {
  name: 'vault',
  priority: 50, // consulted before env when active
  isActive: () => Boolean(process.env.VAULT_ADDR && process.env.VAULT_TOKEN && process.env.VAULT_SECRET_PATH),
  async get(name: string): Promise<string | undefined> {
    const addr = process.env.VAULT_ADDR!.replace(/\/$/, '');
    const path = process.env.VAULT_SECRET_PATH!.replace(/^\//, '');
    const bundle = await vaultCache.get(async () => {
      const resp = await fetch(`${addr}/v1/${path}`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN! } });
      if (!resp.ok) throw new Error(`Vault ${resp.status}`);
      const j: any = await resp.json();
      // KV v2 nests under data.data; KV v1 under data.
      return (j?.data?.data ?? j?.data ?? {}) as Record<string, string>;
    }, Date.now());
    return bundle[name];
  },
};

// ── AWS Secrets Manager (JSON secret of name→value; SDK imported dynamically) ──
const smCache = makeCache();
export const awsSecretsManagerCredentialProvider = {
  name: 'aws-secrets-manager',
  priority: 60,
  isActive: () => Boolean(process.env.AWS_WORFGATE_SECRET_ID),
  async get(name: string): Promise<string | undefined> {
    const bundle = await smCache.get(async () => {
      const sdkName = ['@aws-sdk', 'client-secrets-manager'].join('/'); // avoid static bundler resolution
      const mod: any = await import(sdkName);
      const client = new mod.SecretsManagerClient({ region: process.env.AWS_REGION });
      const out = await client.send(new mod.GetSecretValueCommand({ SecretId: process.env.AWS_WORFGATE_SECRET_ID }));
      return JSON.parse(out.SecretString || '{}') as Record<string, string>;
    }, Date.now());
    return bundle[name];
  },
};

/**
 * Register all configured external providers. Idempotent — call once at startup. Inactive
 * providers register but report isActive()=false, so the chain harmlessly skips them.
 */
export function initWorfGateCredentialProviders(): string[] {
  registerCredentialProvider(vaultCredentialProvider);
  registerCredentialProvider(awsSecretsManagerCredentialProvider);
  return [vaultCredentialProvider, awsSecretsManagerCredentialProvider]
    .filter(p => p.isActive())
    .map(p => p.name);
}
