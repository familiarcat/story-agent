/**
 * Sync selected keys from an AWS Secrets Manager JSON payload into GitHub repo secrets.
 *
 * Direction: AWS (source of truth) -> GitHub (consumer mirror)
 * Safety defaults:
 * - Dry-run unless --apply is set
 * - Never prints secret values
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';

type Mapping = { awsKey: string; githubSecret: string };

function parseArgs(argv: string[]) {
  const out = {
    secretId: process.env.AWS_AHA_SECRET_ID || process.env.AWS_WORFGATE_SECRET_ID || 'story-agent/aha',
    repo: process.env.GITHUB_REPOSITORY || 'familiarcat/story-agent',
    apply: false,
    region: process.env.AWS_REGION || 'us-east-2',
    mappings: [] as Mapping[],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--secret-id' && argv[i + 1]) out.secretId = argv[++i];
    else if (a === '--repo' && argv[i + 1]) out.repo = argv[++i];
    else if (a === '--region' && argv[i + 1]) out.region = argv[++i];
    else if (a === '--map' && argv[i + 1]) {
      const raw = argv[++i];
      const [awsKey, githubSecret] = raw.split(':').map(s => s.trim());
      if (!awsKey || !githubSecret) {
        throw new Error(`invalid --map '${raw}' (expected AWS_KEY:GITHUB_SECRET)`);
      }
      out.mappings.push({ awsKey, githubSecret });
    }
  }

  if (!out.mappings.length) {
    out.mappings.push(
      { awsKey: 'AHA_DOMAIN', githubSecret: 'AHA_DOMAIN' },
      { awsKey: 'AHA_API_KEY', githubSecret: 'AHA_API_KEY' },
    );
  }

  return out;
}

function run(command: string, args: string[], opts?: { env?: Record<string, string>; input?: string }) {
  const r = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...(opts?.env || {}) },
    input: opts?.input,
  });
  return {
    ok: r.status === 0,
    status: r.status ?? 1,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

function redactFingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function readAwsSecret(secretId: string, region: string): Record<string, unknown> {
  const read = run(
    'aws',
    ['secretsmanager', 'get-secret-value', '--secret-id', secretId, '--query', 'SecretString', '--output', 'text'],
    { env: { AWS_REGION: region } },
  );
  if (!read.ok) {
    throw new Error(`failed to read AWS secret '${secretId}': ${read.stderr || read.stdout || `exit ${read.status}`}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(read.stdout);
  } catch {
    throw new Error(`secret '${secretId}' is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`secret '${secretId}' JSON payload must be an object`);
  }
  return parsed as Record<string, unknown>;
}

function requireGhAuth() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN or GITHUB_TOKEN is required for GitHub secret sync');
  }
}

function syncOne(repo: string, name: string, value: string) {
  const res = run('gh', ['secret', 'set', name, '--repo', repo], { input: value });
  if (!res.ok) {
    throw new Error(`gh secret set ${name} failed: ${res.stderr || res.stdout || `exit ${res.status}`}`);
  }
}

function asString(value: unknown, key: string): string {
  if (typeof value !== 'string' || !value) {
    throw new Error(`AWS key '${key}' is missing or empty in secret payload`);
  }
  return value;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const payload = readAwsSecret(args.secretId, args.region);
  const plan = args.mappings.map(m => {
    const value = asString(payload[m.awsKey], m.awsKey);
    return {
      ...m,
      value,
      fingerprint: redactFingerprint(value),
    };
  });

  console.log(`🔐 Source secret: ${args.secretId} (${args.region})`);
  console.log(`📍 Target repo: ${args.repo}`);
  console.log(`🧭 Mappings: ${args.mappings.map(m => `${m.awsKey}->${m.githubSecret}`).join(', ')}`);
  for (const p of plan) {
    console.log(`   - ${p.githubSecret}: sha256:${p.fingerprint}`);
  }

  if (!args.apply) {
    console.log('\nDRY RUN — would sync AWS payload keys into GitHub repo secrets.');
    return;
  }

  requireGhAuth();
  for (const p of plan) {
    syncOne(args.repo, p.githubSecret, p.value);
  }
  console.log(`✅ synced ${plan.length} secret(s) from AWS '${args.secretId}' to GitHub repo '${args.repo}'.`);
}

try {
  main();
} catch (err) {
  console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
