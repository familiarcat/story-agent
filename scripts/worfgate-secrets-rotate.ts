/**
 * WorfGate-governed secret sync/rotation runner.
 *
 * Purpose:
 * 1) Resolve credential values through WorfGate (audited, never logged)
 * 2) Upsert a JSON secret in AWS Secrets Manager
 * 3) Optionally trigger managed rotation when already configured on the secret
 *
 * Defaults are intentionally safe:
 * - Dry-run unless --apply is passed
 * - No secret values printed
 * - Explicit --trigger-rotation required to invoke rotate-secret
 *
 * Example:
 *   npx tsx scripts/worfgate-secrets-rotate.ts
 *   npx tsx scripts/worfgate-secrets-rotate.ts --apply
 *   npx tsx scripts/worfgate-secrets-rotate.ts --apply --trigger-rotation
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { resolveWorfGateCredentialAsync, type CredentialOperation } from '../packages/shared/src/worfgate-credentials.js';

type Mapping = { envName: string; jsonKey: string };

function parseArgs(argv: string[]) {
  const out = {
    secretId: process.env.AWS_AHA_SECRET_ID || process.env.AWS_WORFGATE_SECRET_ID || 'story-agent/aha',
    crewId: (process.env.WORFGATE_CREW_ID || 'worf').toLowerCase(),
    apply: false,
    triggerRotation: false,
    region: process.env.AWS_REGION || '',
    mappings: [] as Mapping[],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--trigger-rotation') out.triggerRotation = true;
    else if (a === '--secret-id' && argv[i + 1]) out.secretId = argv[++i];
    else if (a === '--crew-id' && argv[i + 1]) out.crewId = argv[++i].toLowerCase();
    else if (a === '--region' && argv[i + 1]) out.region = argv[++i];
    else if (a === '--map' && argv[i + 1]) {
      const raw = argv[++i];
      const [envName, jsonKey] = raw.split(':').map(s => s.trim());
      if (!envName || !jsonKey) {
        throw new Error(`invalid --map '${raw}' (expected ENV_NAME:json_key)`);
      }
      out.mappings.push({ envName, jsonKey });
    }
  }

  if (!out.mappings.length) {
    out.mappings.push(
      { envName: 'AHA_DOMAIN', jsonKey: 'AHA_DOMAIN' },
      { envName: 'AHA_API_KEY', jsonKey: 'AHA_API_KEY' },
    );
  }

  return out;
}

function inferOperation(envName: string): CredentialOperation {
  if (envName.startsWith('AHA_')) return 'aha:write';
  if (envName === 'SUPABASE_URL' || envName === 'SUPABASE_KEY' || envName === 'SUPABASE_CLOUD_URL' || envName === 'SUPABASE_CLOUD_KEY') return 'supabase:query';
  if (envName.startsWith('SUPABASE_')) return 'supabase:migrate';
  if (envName.startsWith('AWS_')) return 'aws:secrets';
  if (envName.startsWith('CREW_LLM_')) return 'llm:call';
  if (envName === 'GITHUB_TOKEN' || envName === 'TOKENS_STUDIO_GITHUB_PAT') return 'github:push';
  if (envName === 'FIGMA_API_KEY') return 'figma:read';
  return 'aws:secrets';
}

function runAws(args: string[], env: Record<string, string>) {
  const r = spawnSync('aws', args, { encoding: 'utf8', env: { ...process.env, ...env } });
  return {
    ok: r.status === 0,
    status: r.status ?? 1,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

async function resolvePayload(mappings: Mapping[], crewId: string): Promise<Record<string, string>> {
  const payload: Record<string, string> = {};
  for (const m of mappings) {
    const op = inferOperation(m.envName);
    const cred = await resolveWorfGateCredentialAsync(m.envName, { operation: op, crewId });
    if (!cred.authorized) throw new Error(`WorfGate refused ${m.envName}: ${cred.reason}`);
    if (!cred.available || !cred.value) throw new Error(`WorfGate missing ${m.envName}: ${cred.reason}`);
    payload[m.jsonKey] = cred.value;
  }
  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.region) {
    const regionCred = await resolveWorfGateCredentialAsync('AWS_REGION', { operation: 'aws:secrets', crewId: args.crewId });
    if (regionCred.authorized && regionCred.available && regionCred.value) args.region = regionCred.value;
  }
  if (!args.region) args.region = 'us-east-2';

  const awsEnv: Record<string, string> = { AWS_REGION: args.region };
  for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'] as const) {
    const c = await resolveWorfGateCredentialAsync(key, { operation: 'aws:secrets', crewId: args.crewId });
    if (c.authorized && c.available && c.value) awsEnv[key] = c.value;
  }

  const payload = await resolvePayload(args.mappings, args.crewId);
  const payloadStr = JSON.stringify(payload);
  const payloadHash = createHash('sha256').update(payloadStr).digest('hex').slice(0, 16);
  const mappedNames = args.mappings.map(m => `${m.envName}->${m.jsonKey}`).join(', ');

  console.log(`🛡️  WorfGate resolved ${args.mappings.length} credential(s) for ${args.crewId}.`);
  console.log(`📦 Secret target: ${args.secretId} (region ${args.region})`);
  console.log(`🧭 Mapping: ${mappedNames}`);
  console.log(`🔎 Payload fingerprint: sha256:${payloadHash} (values redacted)`);

  const exists = runAws(['secretsmanager', 'describe-secret', '--secret-id', args.secretId], awsEnv).ok;
  const action = exists ? 'put-secret-value' : 'create-secret';

  if (!args.apply) {
    console.log(`\nDRY RUN — would execute aws secretsmanager ${action} for ${args.secretId}.`);
    if (args.triggerRotation) console.log('DRY RUN — would also call aws secretsmanager rotate-secret --rotate-immediately.');
    return;
  }

  let upsert;
  if (exists) {
    upsert = runAws(['secretsmanager', 'put-secret-value', '--secret-id', args.secretId, '--secret-string', payloadStr], awsEnv);
  } else {
    upsert = runAws([
      'secretsmanager', 'create-secret', '--name', args.secretId,
      '--description', 'Story Agent — WorfGate synchronized secret payload',
      '--secret-string', payloadStr,
    ], awsEnv);
  }

  if (!upsert.ok) {
    throw new Error(`aws secretsmanager ${action} failed: ${upsert.stderr || upsert.stdout || `exit ${upsert.status}`}`);
  }
  console.log(`✅ aws secretsmanager ${action} succeeded for ${args.secretId}.`);

  const verify = runAws(['secretsmanager', 'get-secret-value', '--secret-id', args.secretId, '--query', 'SecretString', '--output', 'text'], awsEnv);
  if (!verify.ok) throw new Error(`post-write verification failed: ${verify.stderr || verify.stdout || `exit ${verify.status}`}`);
  const verifyHash = createHash('sha256').update(verify.stdout).digest('hex').slice(0, 16);
  if (verifyHash !== payloadHash) {
    throw new Error('post-write verification mismatch (payload fingerprint differs)');
  }
  console.log(`✅ verification fingerprint matched sha256:${verifyHash}.`);

  if (args.triggerRotation) {
    const rotate = runAws(['secretsmanager', 'rotate-secret', '--secret-id', args.secretId, '--rotate-immediately'], awsEnv);
    if (!rotate.ok) {
      throw new Error(`rotate-secret failed: ${rotate.stderr || rotate.stdout || `exit ${rotate.status}`}`);
    }
    console.log(`✅ rotation triggered for ${args.secretId}.`);
  }
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
