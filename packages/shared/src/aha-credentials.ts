/**
 * Unified Aha! credential resolver — implements the crew's debated decision:
 *
 *   1. AWS Secrets Manager (single source of truth, runtime fetch) — when AWS_AHA_SECRET_ID is set.
 *      Rotation propagates without redeploy; the key never has to live in ECS task-env metadata.
 *   2. Environment (AHA_DOMAIN + AHA_API_KEY/AHA_API_TOKEN) — direct-Aha fallback. Covers both
 *      local dev AND the simpler ECS "Secrets Manager → task-env injection" deployment (Option A).
 *   3. Hard error — and in production, an AWS fetch FAILURE is fatal (never silently fall back to env).
 *
 * The AWS SDK is an OPTIONAL dependency: imported dynamically, so this works locally without it
 * (falls through to env). Install @aws-sdk/client-secrets-manager on the AWS image to enable path 1.
 */

export type AhaCredSource = 'aws-secrets-manager' | 'env';
export interface AhaCredentials {
  domain: string;
  apiKey: string;
  source: AhaCredSource;
}

/** Heuristic: are we running inside an AWS execution environment (ECS/Lambda)? */
function isProductionAws(): boolean {
  return Boolean(
    process.env.AWS_EXECUTION_ENV ||
    process.env.ECS_CONTAINER_METADATA_URI ||
    process.env.ECS_CONTAINER_METADATA_URI_V4 ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.env.NODE_ENV === 'production' && process.env.AWS_REGION),
  );
}

async function fromAwsSecretsManager(): Promise<AhaCredentials | null> {
  const secretId = (process.env.AWS_AHA_SECRET_ID || process.env.AWS_AHA_SECRET_ARN || '').trim();
  if (!secretId) return null; // path 1 not requested
  try {
    // Variable specifier keeps tsc from resolving an optional dep at build time.
    const sdkName = '@aws-sdk/client-secrets-manager';
    const mod: any = await import(sdkName);
    const client = new mod.SecretsManagerClient({ region: process.env.AWS_REGION });
    const out = await client.send(new mod.GetSecretValueCommand({ SecretId: secretId }));
    const raw: string | undefined = out.SecretString;
    if (!raw) return null;
    const j = JSON.parse(raw);
    const domain = String(j.AHA_DOMAIN ?? j.domain ?? '').trim();
    const apiKey = String(j.AHA_API_KEY ?? j.AHA_API_TOKEN ?? j.apiKey ?? '').trim();
    if (domain && apiKey) return { domain, apiKey, source: 'aws-secrets-manager' };
    return null;
  } catch (err) {
    // In a real AWS runtime, a configured secret that won't fetch is fatal — do NOT leak to env.
    if (isProductionAws()) {
      throw new Error(`AWS Secrets Manager fetch failed for '${secretId}' in production: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null; // local/dev (or SDK not installed): fall through to env
  }
}

function fromEnv(): AhaCredentials | null {
  const domain = (process.env.AHA_DOMAIN ?? '').trim();
  const apiKey = (process.env.AHA_API_KEY ?? process.env.AHA_API_TOKEN ?? '').trim();
  return domain && apiKey ? { domain, apiKey, source: 'env' } : null;
}

let _cached: AhaCredentials | null = null;

/**
 * Resolve Aha! credentials via the debated chain. Cached after first success; pass {refresh:true}
 * to re-pull (e.g. after a Secrets Manager rotation).
 */
export async function resolveAhaCredentials(opts?: { refresh?: boolean }): Promise<AhaCredentials> {
  if (_cached && !opts?.refresh) return _cached;
  const creds = (await fromAwsSecretsManager()) ?? fromEnv();
  if (!creds) {
    throw new Error(
      'No Aha! credentials. Set AWS_AHA_SECRET_ID (AWS Secrets Manager, single source of truth) ' +
      'or AHA_DOMAIN + AHA_API_KEY/AHA_API_TOKEN (direct-Aha fallback).',
    );
  }
  _cached = creds;
  return creds;
}

/** Diagnostics: where creds would resolve from, without exposing the secret. */
export async function ahaCredentialSource(): Promise<{ source: AhaCredSource | 'none'; domain: string; awsConfigured: boolean; productionAws: boolean }> {
  const awsConfigured = Boolean((process.env.AWS_AHA_SECRET_ID || process.env.AWS_AHA_SECRET_ARN || '').trim());
  try {
    const c = await resolveAhaCredentials({ refresh: true });
    return { source: c.source, domain: c.domain, awsConfigured, productionAws: isProductionAws() };
  } catch {
    return { source: 'none', domain: '', awsConfigured, productionAws: isProductionAws() };
  }
}
