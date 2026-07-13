/**
 * WorfGate local<->production bridge for 1:1 secure development flow.
 *
 * Goals:
 * - Keep local MCP config aligned with committed project MCP config
 * - Verify required WorfGate-managed credentials are present
 * - Validate AWS (source of truth) -> GitHub secret mirror path
 * - Optionally apply the mirror path from local with explicit flag
 *
 * Safe by default: dry-run only.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { worfGateHasCredential } from '../packages/shared/src/worfgate-credentials.js';

type Args = {
  apply: boolean;
  secretId: string;
  repo: string;
  region: string;
  syncMcp: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    secretId: process.env.AWS_AHA_SECRET_ID || process.env.AWS_WORFGATE_SECRET_ID || 'story-agent/aha',
    repo: process.env.GITHUB_REPOSITORY || 'familiarcat/story-agent',
    region: process.env.AWS_REGION || 'us-east-2',
    syncMcp: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--no-sync-mcp') out.syncMcp = false;
    else if (a === '--secret-id' && argv[i + 1]) out.secretId = argv[++i];
    else if (a === '--repo' && argv[i + 1]) out.repo = argv[++i];
    else if (a === '--region' && argv[i + 1]) out.region = argv[++i];
  }

  return out;
}

function run(command: string, args: string[], goal: string) {
  const res = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env },
    stdio: 'pipe',
  });
  if (res.status !== 0) {
    const reason = (res.stderr || res.stdout || '').trim() || `exit ${res.status ?? 1}`;
    throw new Error(`${goal} failed: ${reason}`);
  }
  return (res.stdout || '').trim();
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function requiredCredsPresent() {
  const required = ['CREW_LLM_APPROVED_KEY', 'AHA_API_KEY', 'SUPABASE_ACCESS_TOKEN'];
  const optional = ['STORY_AGENT_MCP_BEARER', 'STORY_AGENT_MCP_SESSION_ID'];

  const missingRequired = required.filter(k => !worfGateHasCredential(k));
  const missingOptional = optional.filter(k => !worfGateHasCredential(k));

  return { missingRequired, missingOptional };
}

function assertMcpParity(repoRoot: string) {
  const projectPath = path.join(repoRoot, '.mcp.json');
  const vscodePath = path.join(repoRoot, '.vscode', 'mcp.json');

  const project = readJson(projectPath) as { mcpServers?: Record<string, Record<string, unknown>> };
  const vscode = readJson(vscodePath) as { servers?: Record<string, Record<string, unknown>> };

  const projectServers = project.mcpServers || {};
  const vscodeServers = vscode.servers || {};

  const checks = ['story-agent', 'supabase', 'aha'];
  const failures: string[] = [];

  for (const name of checks) {
    if (!projectServers[name]) failures.push(`.mcp.json missing ${name}`);
    if (!vscodeServers[name]) failures.push(`.vscode/mcp.json missing ${name}`);
  }

  const projectStory = projectServers['story-agent'];
  const vscodeStory = vscodeServers['story-agent'];
  if (projectStory && vscodeStory) {
    const pCommand = String(projectStory.command || '');
    const vCommand = String(vscodeStory.command || '');
    if (pCommand && vCommand && pCommand !== vCommand) {
      failures.push(`story-agent command mismatch (${pCommand} vs ${vCommand})`);
    }
  }

  const projectSupabase = projectServers.supabase;
  const vscodeSupabase = vscodeServers.supabase;
  if (projectSupabase && vscodeSupabase) {
    const pUrl = String(projectSupabase.url || '');
    const vUrl = String(vscodeSupabase.url || '');
    if (pUrl && vUrl && pUrl !== vUrl) {
      failures.push('supabase URL mismatch between .mcp.json and .vscode/mcp.json');
    }
  }

  if (failures.length) {
    throw new Error(`MCP parity check failed: ${failures.join('; ')}`);
  }
}

function runAwsSourceMirrorDry(secretId: string, repo: string, region: string) {
  run(
    'pnpm',
    ['run', 'secrets:sync:github-from-aws:dry', '--', '--secret-id', secretId, '--repo', repo, '--region', region],
    'AWS->GitHub secret mirror dry-run',
  );
}

function runAwsSourceMirrorApply(secretId: string, repo: string, region: string) {
  run(
    'pnpm',
    ['run', 'secrets:sync:github-from-aws', '--', '--secret-id', secretId, '--repo', repo, '--region', region],
    'AWS->GitHub secret mirror apply',
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  console.log('\n=== WorfGate local<->production 1:1 bridge ===\n');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Secret source: ${args.secretId} (${args.region})`);
  console.log(`GitHub target: ${args.repo}`);

  if (args.syncMcp) {
    console.log('\n1) Sync VS Code MCP config from project MCP config');
    run('node', ['scripts/sync-vscode-mcp.mjs'], 'MCP sync');
    console.log('   ✅ synced .mcp.json -> .vscode/mcp.json');
  }

  console.log('\n2) Verify MCP parity on critical servers');
  assertMcpParity(repoRoot);
  console.log('   ✅ story-agent/supabase/aha parity checks passed');

  console.log('\n3) Verify WorfGate credential baseline');
  const creds = requiredCredsPresent();
  if (creds.missingRequired.length) {
    throw new Error(`missing required credentials: ${creds.missingRequired.join(', ')}`);
  }
  console.log('   ✅ required credentials present');
  if (creds.missingOptional.length) {
    console.log(`   ℹ optional hosted MCP creds missing: ${creds.missingOptional.join(', ')}`);
  }

  console.log('\n4) Validate AWS(source)->GitHub mirror path');
  runAwsSourceMirrorDry(args.secretId, args.repo, args.region);
  console.log('   ✅ mirror dry-run succeeded');

  if (!args.apply) {
    console.log('\nResult: DRY-RUN complete. Use --apply to execute AWS->GitHub mirror write path.');
    return;
  }

  console.log('\n5) Apply AWS(source)->GitHub mirror');
  runAwsSourceMirrorApply(args.secretId, args.repo, args.region);
  console.log('   ✅ mirror apply succeeded');

  console.log('\nResult: APPLY complete. Local and published secret consumers are now synchronized from AWS source of truth.');
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
