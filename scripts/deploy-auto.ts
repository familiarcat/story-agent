/**
 * deploy-auto — one-command, daemon-free, WorfGate-brokered deployment orchestrator.
 *
 * Crew-blessed in the Observation Lounge (see docs/observation-lounge + RAG memory
 * `deployment-runbook`). Chains the SAFE, idempotent prep steps automatically and keeps the
 * single BILLABLE action (terraform apply, run in CI) behind an explicit `--apply` gate, in line
 * with the standing rule: live external actions require explicit authorization.
 *
 * Phases (O'Brien owns ops, Worf brokers creds, Quark watches cost, Data pins digests):
 *   0. Presence check         — activation:status (never prints a secret value)
 *   1. OIDC bootstrap         — IAM provider + deploy role (NON-billable); sets repo vars
 *   2. Secrets → AWS          — aws-secrets:put (idempotent; values never printed)
 *   3. Terraform plan         — preview only (NON-billable), WorfGate-brokered AWS creds
 *   4. Apply (BILLABLE)       — only with --apply: dispatches the digest-pinned CI deploy
 *   5. Post-apply             — REDIS_URL reminder
 *
 * Usage:
 *   zsh -ic 'pnpm deploy:auto'              # prep + plan only (safe; default)
 *   zsh -ic 'pnpm deploy:auto -- --apply'  # also dispatch the billable CI apply
 *   zsh -ic 'pnpm deploy:auto -- --skip-secrets'   # skip phase 2
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPO || 'familiarcat/story-agent';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SKIP_SECRETS = args.includes('--skip-secrets');
const FOLLOW = APPLY && !args.includes('--no-follow');
const FOLLOW_INTERVAL_SECONDS = Number(process.env.DEPLOY_FOLLOW_INTERVAL_SECONDS || 8);
const FOLLOW_MAX_POLLS = Number(process.env.DEPLOY_FOLLOW_MAX_POLLS || 120);

const c = { dim: '\x1b[2m', red: '\x1b[31m', grn: '\x1b[32m', yel: '\x1b[33m', cyn: '\x1b[36m', rst: '\x1b[0m', bold: '\x1b[1m' };
const h = (n: number, t: string) => console.log(`\n${c.bold}${c.cyn}━━ Phase ${n}: ${t}${c.rst}`);
const ok = (m: string) => console.log(`  ${c.grn}✅ ${m}${c.rst}`);
const warn = (m: string) => console.log(`  ${c.yel}⚠️  ${m}${c.rst}`);
const info = (m: string) => console.log(`  ${c.dim}${m}${c.rst}`);

function run(cmd: string, cmdArgs: string[], opts: { allowFail?: boolean } = {}): boolean {
  info(`$ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env: process.env });
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`  ${c.red}✗ exited ${r.status}${c.rst}`);
  }
  return r.status === 0;
}
function capture(cmd: string, cmdArgs: string[]): string {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : '';
}

function captureJson<T>(cmd: string, cmdArgs: string[], envExtra?: Record<string, string>): T | null {
  const r = spawnSync(cmd, cmdArgs, {
    encoding: 'utf8',
    env: { ...process.env, ...(envExtra || {}) },
  });
  if (r.status !== 0) return null;
  const raw = (r.stdout || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

interface RunSummary {
  status: string;
  conclusion: string | null;
  updated_at: string;
  html_url: string;
}

interface JobSummary {
  name: string;
  status: string;
  conclusion: string | null;
}

function followRunInChatFormat(runId: string): boolean {
  const ghEnv = { TERM: 'dumb', GH_PAGER: 'cat', PAGER: 'cat' };
  let lastSignature = '';

  for (let i = 0; i < FOLLOW_MAX_POLLS; i++) {
    const run = captureJson<RunSummary>(
      'gh',
      ['api', `repos/${REPO}/actions/runs/${runId}`, '--jq', '{status: .status, conclusion: .conclusion, updated_at: .updated_at, html_url: .html_url}'],
      ghEnv,
    );

    if (!run) {
      warn(`Polling failed for run ${runId}; retrying.`);
      spawnSync('sleep', [String(FOLLOW_INTERVAL_SECONDS)]);
      continue;
    }

    const jobs = captureJson<JobSummary[]>(
      'gh',
      ['api', `repos/${REPO}/actions/runs/${runId}/jobs`, '--jq', '.jobs | map({name: .name, status: .status, conclusion: .conclusion})'],
      ghEnv,
    ) ?? [];

    const signature = JSON.stringify({ status: run.status, conclusion: run.conclusion, jobs });
    if (signature !== lastSignature) {
      lastSignature = signature;
      console.log('');
      console.log('CHAT DEPLOY STATUS');
      console.log(`run: ${runId}`);
      console.log(`status: ${run.status}`);
      console.log(`conclusion: ${run.conclusion ?? 'pending'}`);
      console.log(`updated_at: ${run.updated_at}`);
      console.log(`url: ${run.html_url}`);
      if (jobs.length) {
        console.log('jobs:');
        for (const job of jobs) {
          console.log(`- ${job.name}: ${job.status}${job.conclusion ? ` (${job.conclusion})` : ''}`);
        }
      }
    }

    if (run.status === 'completed') return run.conclusion === 'success';
    spawnSync('sleep', [String(FOLLOW_INTERVAL_SECONDS)]);
  }

  warn(`Polling limit reached for run ${runId}; monitor manually: ${`https://github.com/${REPO}/actions/runs/${runId}`}`);
  return false;
}

console.log(`\n${c.bold}🚀 Story Agent — automated deployment (${APPLY ? `${c.red}BILLABLE apply${c.rst}${c.bold}` : 'prep + plan only'})${c.rst}`);
console.log(`${c.dim}WorfGate brokers every credential; billable apply is gated behind --apply.${c.rst}`);

// ── Phase 0: presence check ────────────────────────────────────────────────
h(0, 'Activation status (WorfGate presence-only)');
run('npx', ['tsx', 'scripts/activation-status.ts'], { allowFail: true });

// ── Phase 1: OIDC bootstrap (non-billable) ─────────────────────────────────
h(1, 'OIDC bootstrap — IAM provider + deploy role (non-billable)');
const ghVars = capture('gh', ['variable', 'list', '--repo', REPO]);
if (ghVars.includes('AWS_DEPLOY_ROLE_ARN')) {
  ok('AWS_DEPLOY_ROLE_ARN already set — OIDC already bootstrapped, skipping.');
} else {
  warn('Deploy role not yet wired — running bootstrap (creates IAM + sets repo vars).');
  if (!run('bash', ['scripts/bootstrap-oidc.sh'], { allowFail: true })) {
    warn('OIDC bootstrap did not complete (likely AWS creds not authorized). Continuing prep.');
  }
}

// ── Phase 2: secrets → AWS Secrets Manager (idempotent) ────────────────────
h(2, 'Secrets → AWS Secrets Manager (idempotent; values never printed)');
if (SKIP_SECRETS) {
  info('--skip-secrets given, skipping.');
} else {
  run('bash', ['scripts/aws-secrets-put.sh'], { allowFail: true });
}

// ── Phase 3: terraform plan (non-billable preview) ─────────────────────────
h(3, 'Terraform plan — preview (non-billable, WorfGate-brokered)');if (!run('npx', ['tsx', 'scripts/worfgate-terraform.ts', 'init'])) {
  console.error('❌ Terraform init failed; aborting deploy-auto.');
  process.exit(1);
}run('npx', ['tsx', 'scripts/worfgate-terraform.ts', 'plan'], { allowFail: true });

// ── Phase 4: apply (BILLABLE) ──────────────────────────────────────────────
h(4, 'Apply — create/update the Fargate stack (BILLABLE)');
if (!APPLY) {
  warn('Skipped (no --apply). This is the only billable step.');
  info('When ready, run ONE of:');
  info(`  zsh -ic 'pnpm deploy:auto -- --apply'                    # dispatch the digest-pinned CI deploy`);
  info(`  gh workflow run deploy.yml --repo ${REPO} -f apply=true   # equivalent, direct`);
} else {
  warn('Dispatching the digest-pinned CI deploy (deploy.yml, apply=true) — this provisions billable AWS resources.');
  if (run('gh', ['workflow', 'run', 'deploy.yml', '--repo', REPO, '-f', 'apply=true'], { allowFail: true })) {
    ok('Dispatched.');
    if (FOLLOW) {
      info('Following the deploy — chat-style polling (non-interactive, pager-safe):');
      let runId = '';
      for (let i = 0; i < 12 && !runId; i++) {
        spawnSync('sleep', ['3']);
        runId = capture('gh', ['run', 'list', '--repo', REPO, '--workflow', 'deploy.yml', '--event', 'workflow_dispatch', '--limit', '1', '--json', 'databaseId', '-q', '.[0].databaseId']);
      }
      if (runId) {
        info(`Run ${runId} — emitting chat-friendly snapshots until completion:`);
        const okFollow = followRunInChatFormat(runId);
        if (okFollow) ok('Deploy run completed successfully.');
        else warn('Deploy run did not report success before polling completed.');
      } else {
        warn('Could not resolve the run id; poll manually with: TERM=dumb GH_PAGER=cat PAGER=cat gh run list --repo ' + REPO);
      }
    } else {
      info('Watch: gh run watch --repo ' + REPO);
    }
  } else {
    warn('Dispatch failed — ensure `gh auth status` is healthy and deploy.yml exists on the default branch.');
  }
}

// ── Phase 5: post-apply ────────────────────────────────────────────────────
h(5, 'Post-apply');
info('After the stack is up, point the app at ElastiCache:');
info("  echo 'export REDIS_URL=redis://<elasticache-endpoint>:6379' >> ~/.alexai-secrets/api-keys.env");
info('  (~/.zshrc already sources it; WorfGate reads it from process.env — do not paste into ~/.zshrc.)');

console.log(`\n${c.grn}${c.bold}✔ deploy-auto complete.${c.rst} ${APPLY ? '' : `${c.dim}(prep only — re-run with --apply to provision)${c.rst}`}\n`);
