/**
 * WorfGate secret source audit + optional reconcile.
 *
 * Verifies three sources in one run:
 * 1) Local shell source hints (~/.zshrc)
 * 2) AWS Secrets Manager payload (source of truth)
 * 3) GitHub repository secrets (consumer mirror)
 *
 * Safety defaults:
 * - Read-only by default
 * - Never prints secret values
 * - Optional --apply reconciles GitHub secrets from AWS values
 */
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type Mapping = { awsKey: string; githubSecret: string };

type Args = {
  secretIds: string[];
  repo: string;
  region: string;
  apply: boolean;
  mappings: Mapping[];
  requireLocal: string[];
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    secretIds: [process.env.AWS_AHA_SECRET_ID || process.env.AWS_WORFGATE_SECRET_ID || 'story-agent/aha'],
    repo: process.env.GITHUB_REPOSITORY || 'familiarcat/story-agent',
    region: process.env.AWS_REGION || 'us-east-2',
    apply: false,
    mappings: [
      { awsKey: 'AHA_DOMAIN', githubSecret: 'AHA_DOMAIN' },
      { awsKey: 'AHA_API_KEY', githubSecret: 'AHA_API_KEY' },
    ],
    requireLocal: ['CREW_LLM_APPROVED_KEY', 'AHA_API_KEY', 'SUPABASE_ACCESS_TOKEN'],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if ((a === '-h' || a === '--help')) {
      printHelp();
      process.exit(0);
    } else if (a === '--secret-id' && argv[i + 1]) {
      const v = argv[++i].trim();
      if (v) out.secretIds.push(v);
    }
    else if (a === '--repo' && argv[i + 1]) out.repo = argv[++i];
    else if (a === '--region' && argv[i + 1]) out.region = argv[++i];
    else if (a === '--map' && argv[i + 1]) {
      const raw = argv[++i];
      const [awsKey, githubSecret] = raw.split(':').map(s => s.trim());
      if (!awsKey || !githubSecret) {
        throw new Error(`invalid --map '${raw}' (expected AWS_KEY[:AWS_FALLBACK_KEY...]:GITHUB_SECRET)`);
      }
      if (out.mappings.some(m => m.githubSecret === githubSecret)) {
        out.mappings = out.mappings.filter(m => m.githubSecret !== githubSecret);
      }
      out.mappings.push({ awsKey, githubSecret });
    } else if (a === '--require-local' && argv[i + 1]) {
      const key = argv[++i].trim();
      if (key && !out.requireLocal.includes(key)) out.requireLocal.push(key);
    }
  }

  out.secretIds = Array.from(new Set(out.secretIds.filter(Boolean)));
  return out;
}

function printHelp() {
  console.log([
    'Usage: npx tsx scripts/worfgate-secret-source-audit.ts [options]',
    '',
    'Options:',
    '  --secret-id <id>          AWS Secrets Manager secret id (repeatable)',
    '  --repo <owner/name>       GitHub repository (default: familiarcat/story-agent)',
    '  --region <aws-region>     AWS region (default: us-east-2)',
    '  --map A:B                 Map AWS JSON key A -> GitHub secret B (repeatable)',
    '  --map A|B:C               Try AWS key A then B -> GitHub secret C',
    '  --require-local <VAR>     Require local env VAR to be present (repeatable)',
    '  --apply                   Reconcile GitHub secrets from AWS source',
  ].join('\n'));
}

function run(command: string, args: string[], env?: Record<string, string>) {
  const res = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...(env || {}) },
    stdio: 'pipe',
  });
  return {
    ok: res.status === 0,
    status: res.status ?? 1,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

function checkZshrcSignals(): { path: string; exists: boolean; hasSecretsSourceSignal: boolean; hasExportsSignal: boolean } {
  const zshrcPath = path.join(os.homedir(), '.zshrc');
  if (!fs.existsSync(zshrcPath)) {
    return { path: zshrcPath, exists: false, hasSecretsSourceSignal: false, hasExportsSignal: false };
  }

  const body = fs.readFileSync(zshrcPath, 'utf8');
  const hasSecretsSourceSignal =
    /alexai-secrets/i.test(body) ||
    /source\s+\$HOME\/.+secrets/i.test(body) ||
    /source\s+~\/.+secrets/i.test(body);
  const hasExportsSignal =
    /export\s+CREW_LLM_APPROVED_KEY\s*=/.test(body) ||
    /export\s+AHA_API_KEY\s*=/.test(body) ||
    /export\s+SUPABASE_ACCESS_TOKEN\s*=/.test(body);

  return {
    path: zshrcPath,
    exists: true,
    hasSecretsSourceSignal,
    hasExportsSignal,
  };
}

function presentLocalEnv(keys: string[]): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  for (const key of keys) {
    const value = (process.env[key] || '').trim();
    if (value) present.push(key);
    else missing.push(key);
  }
  return { present, missing };
}

function readAwsSecretPayload(secretId: string, region: string): Record<string, unknown> {
  const res = run(
    'aws',
    ['secretsmanager', 'get-secret-value', '--secret-id', secretId, '--query', 'SecretString', '--output', 'text'],
    { AWS_REGION: region },
  );
  if (!res.ok) {
    throw new Error(`unable to read AWS secret '${secretId}': ${res.stderr || res.stdout || `exit ${res.status}`}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    throw new Error(`AWS secret '${secretId}' is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`AWS secret '${secretId}' payload must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function readMergedAwsSecretPayload(secretIds: string[], region: string): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const secretId of secretIds) {
    const payload = readAwsSecretPayload(secretId, region);
    for (const [k, v] of Object.entries(payload)) {
      if (!(k in merged)) merged[k] = v;
    }
  }
  return merged;
}

function listGithubSecrets(repo: string): string[] {
  const res = run('gh', ['api', `repos/${repo}/actions/secrets`, '--jq', '.secrets[].name']);
  if (!res.ok) {
    throw new Error(`unable to list GitHub secrets for ${repo}: ${res.stderr || res.stdout || `exit ${res.status}`}`);
  }
  return res.stdout
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function resolveAwsValue(payload: Record<string, unknown>, keyExpr: string): { value: string; sourceKey: string } {
  const candidates = keyExpr
    .split('|')
    .map(k => k.trim())
    .filter(Boolean);

  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return { value, sourceKey: key };
    }
  }

  throw new Error(`AWS payload is missing required non-empty key(s): ${candidates.join(' | ')}`);
}

function setGithubSecret(repo: string, name: string, value: string): void {
  const res = spawnSync('gh', ['secret', 'set', name, '--repo', repo], {
    encoding: 'utf8',
    input: value,
    env: { ...process.env },
    stdio: 'pipe',
  });
  if ((res.status ?? 1) !== 0) {
    const reason = (res.stderr || res.stdout || '').trim() || `exit ${res.status ?? 1}`;
    throw new Error(`gh secret set ${name} failed: ${reason}`);
  }
}

function reconcileGithubFromAwsMerged(payload: Record<string, unknown>, args: Args) {
  for (const m of args.mappings) {
    const resolved = resolveAwsValue(payload, m.awsKey);
    setGithubSecret(args.repo, m.githubSecret, resolved.value);
  }
  console.log('   ✅ GitHub reconcile completed (AWS merged sources -> GitHub).');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('\n=== WorfGate Secret Source Audit ===\n');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`AWS source(s): ${args.secretIds.join(', ')} (${args.region})`);
  console.log(`GitHub repo: ${args.repo}`);
  console.log(`Mappings: ${args.mappings.map(m => `${m.awsKey}->${m.githubSecret}`).join(', ')}`);

  console.log('\n1) Local shell source check (~/.zshrc)');
  const z = checkZshrcSignals();
  if (!z.exists) throw new Error(`missing ${z.path}`);
  if (!z.hasSecretsSourceSignal && !z.hasExportsSignal) {
    throw new Error(`${z.path} has no obvious secrets-source/export signal`);
  }
  const local = presentLocalEnv(args.requireLocal);
  console.log(`   ✅ ${z.path} exists with secrets loading signal`);
  console.log(`   ✅ local env present: ${local.present.join(', ') || '(none)'}`);
  if (local.missing.length) {
    throw new Error(`missing required local env vars: ${local.missing.join(', ')}`);
  }

  console.log('\n2) AWS secret payload check');
  const awsPayload = readMergedAwsSecretPayload(args.secretIds, args.region);
  const awsKeysChecked: string[] = [];
  for (const m of args.mappings) {
    const resolved = resolveAwsValue(awsPayload, m.awsKey);
    awsKeysChecked.push(`${m.githubSecret}<-${resolved.sourceKey}`);
  }
  console.log(`   ✅ AWS payload includes: ${awsKeysChecked.join(', ')}`);

  console.log('\n3) GitHub secret mirror check');
  const ghNames = new Set(listGithubSecrets(args.repo));
  const missingGh = args.mappings
    .map(m => m.githubSecret)
    .filter(name => !ghNames.has(name));
  if (missingGh.length) {
    console.log(`   ⚠ missing GitHub secrets: ${missingGh.join(', ')}`);
  } else {
    console.log('   ✅ required GitHub secrets are present');
  }

  if (args.apply) {
    console.log('\n4) Reconcile GitHub secrets from AWS');
    reconcileGithubFromAwsMerged(awsPayload, args);
  }

  if (missingGh.length && !args.apply) {
    throw new Error('GitHub mirror is incomplete (run with --apply to reconcile from AWS)');
  }

  console.log(`\nResult: ${args.apply ? 'APPLY' : 'DRY-RUN'} successful.`);
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
