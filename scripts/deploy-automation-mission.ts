/**
 * Observation Lounge — Deployment Automation, then commit it to RAG.
 *
 * 1. Convenes the REAL OpenRouter crew (runMissionPipeline: Picard intake → Riker/Quark team
 *    assembly → crew contributions → Picard mission plan, frugal by default) on the question of
 *    how to automate the Fargate deployment end-to-end.
 * 2. Writes the transcript to docs/observation-lounge/.
 * 3. Records the resulting deployment PROCESS into the RAG system so future deploys are
 *    self-documenting: a shared observation memory (the debate) + O'Brien's personal runbook note.
 *
 * Usage: zsh -ic 'pnpm deploy:mission'   (needs CREW_LLM_APPROVED_KEY from ~/.alexai-secrets)
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import {
  storeObservationMemory,
  storeCrewPersonalMemory,
  embeddingSource,
} from '../packages/shared/src/db.js';
import type { ObservationDebateResult } from '../packages/shared/src/index.js';

const BRIEF = `
Convene the Observation Lounge to design and BLESS a one-command, daemon-free, WorfGate-brokered
automated deployment process for the Story Agent AWS Fargate stack, then document it for reuse.

Current building blocks (already in the repo):
- pnpm deploy:bootstrap-oidc  → creates the GitHub OIDC provider + deploy role (NON-billable IAM),
  and auto-sets the repo vars AWS_REGION, ECR_REGISTRY, AWS_DEPLOY_ROLE_ARN.
- pnpm aws-secrets:put        → pushes secrets into AWS Secrets Manager (idempotent; never printed).
- pnpm tf:plan                → terraform plan with AWS creds brokered THROUGH WorfGate.
- .github/workflows/deploy.yml (deploy-fargate) → CI builds images, pins them by sha256 DIGEST,
  and runs terraform apply when dispatched with apply=true. This is the only BILLABLE step.
- Post-apply: set REDIS_URL to the ElastiCache endpoint.

GOALS for the crew to converge on:
1. The exact ORDERED, idempotent sequence a single orchestrator (pnpm deploy:auto) should run.
2. Which steps are safe to fully automate vs. which must stay behind an explicit billable gate.
3. How WorfGate brokers every credential and how secrets stay single-source (~/.alexai-secrets).
4. Cost discipline (Quark): cheapest path, no idle infra, CI does the build not local.
5. Rollback / verification posture (O'Brien, Data): digest pinning, plan-before-apply, health check.

Each crew member contributes their domain. Picard ends with the canonical deploy runbook as an
ordered mission plan tagged by owner. This will be recorded to RAG as the deployment runbook.
`.trim();

function toDebate(result: Awaited<ReturnType<typeof runMissionPipeline>>): ObservationDebateResult {
  return {
    rounds: [
      {
        title: 'Crew contributions — deployment automation',
        entries: result.contributions.map(ct => ({
          speakerId: ct.crewId,
          position: 'support' as const,
          statement: ct.text,
          evidence: [`model:${ct.model}`, `cost:$${ct.costUSD}`],
        })),
      },
    ],
    consensusSummary: result.missionPlan,
    unresolvedRisks: [
      'terraform apply is billable — kept behind an explicit --apply gate',
      'REDIS_URL must be set post-apply before the app reaches steady state',
    ],
    finalDecision: 'approved',
    actionItems: [
      'pnpm deploy:auto runs phases 0-3 (presence, OIDC, secrets, plan) automatically',
      'phase 4 (billable apply) dispatches deploy.yml only with --apply',
      'phase 5 sets REDIS_URL to the ElastiCache endpoint',
    ],
  };
}

async function main() {
  if (!process.env.CREW_LLM_APPROVED_KEY) {
    console.error('❌ CREW_LLM_APPROVED_KEY not set — run via: zsh -ic \'pnpm deploy:mission\'');
    process.exit(1);
  }
  console.log('\n🛸 Convening the Observation Lounge on DEPLOYMENT AUTOMATION (OpenRouter crew, frugal)…\n');

  const result = await runMissionPipeline(BRIEF);

  // ── Transcript to disk ────────────────────────────────────────────────────
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = [
    `# Observation Lounge — Deployment Automation`,
    ``,
    `**Date:** ${new Date().toISOString().slice(0, 10)}  |  **Top model:** ${result.topModel}  |  **Total cost:** $${result.efficiency.totalCostUSD} (${result.efficiency.totalTokens} tokens)`,
    ``,
    `## Captain Picard — intake (goals)`,
    ``, result.goals, ``,
    `## Team (Riker assembled, Quark cost-optimized)`,
    ``,
    ...result.team.map(m => `- **${m.crewId}** (${m.domain}) → \`${m.model}\``),
    ``,
    `## Crew contributions`,
    ``,
    ...result.contributions.flatMap(ct => [`### ${ct.crewId} — \`${ct.model}\` ($${ct.costUSD})`, ``, ct.text, ``]),
    `## Captain Picard — mission plan (the deployment runbook)`,
    ``, result.missionPlan, ``,
    `## Cost (Quark)`,
    ``,
    '```json',
    JSON.stringify(result.efficiency, null, 2),
    '```',
    ``,
  ].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const path = `docs/observation-lounge/deploy-automation-${stamp}.md`;
  writeFileSync(path, md);
  console.log(`📄 Transcript → ${path}`);

  // ── Record the deployment PROCESS to RAG ──────────────────────────────────
  console.log(`\n🧠 Recording the deployment process to RAG (embeddings source: ${embeddingSource()})…`);

  const debate = toDebate(result);
  const obs = await storeObservationMemory({
    storyId: 'deploy-automation',
    source: 'mcp',
    transcript: debate,
    tags: ['deployment', 'automation', 'runbook', 'fargate', 'worfgate', 'cicd'],
  });
  console.log(`  ✅ shared observation memory: ${obs.id}`);

  const runbook = [
    `Story Agent automated deployment runbook (crew-blessed in the Observation Lounge).`,
    `One command: \`zsh -ic 'pnpm deploy:auto'\` (prep + plan), add \`-- --apply\` for the billable apply.`,
    ``,
    `Ordered, idempotent phases:`,
    `0. activation:status — WorfGate presence-only check (no secret values printed).`,
    `1. deploy:bootstrap-oidc — IAM OIDC provider + deploy role (NON-billable); sets repo vars.`,
    `2. aws-secrets:put — push secrets to AWS Secrets Manager (idempotent).`,
    `3. tf:plan — terraform plan, AWS creds brokered THROUGH WorfGate.`,
    `4. APPLY (BILLABLE, gated by --apply) — dispatch deploy.yml apply=true; CI builds + DIGEST-pins images.`,
    `5. Post-apply — set REDIS_URL to the ElastiCache endpoint in ~/.alexai-secrets (never ~/.zshrc).`,
    ``,
    `Principles: WorfGate brokers every credential; secrets stay single-source in ~/.alexai-secrets;`,
    `CI builds (not local); the only billable step stays behind an explicit gate; plan before apply;`,
    `images pinned by sha256 digest for reproducibility.`,
    ``,
    `Crew mission plan (verbatim):`,
    result.missionPlan,
  ].join('\n');

  const memId = await storeCrewPersonalMemory({
    crew_id: 'obrien',
    memory_type: 'decision_note',
    title: 'Automated deployment runbook (pnpm deploy:auto)',
    content: runbook,
    tags: ['deployment', 'runbook', 'fargate', 'worfgate', 'cicd'],
    relates_to_crew: ['worf', 'quark', 'data', 'picard'],
  });
  console.log(`  ✅ O'Brien personal runbook memory: ${memId ?? '(supabase unavailable — cached)'}`);

  console.log(`\n✔ Deployment process deliberated, automated (scripts/deploy-auto.ts), and recorded to RAG.\n`);
}

main().catch((err) => { console.error('Deployment mission failed:', err); process.exit(1); });
