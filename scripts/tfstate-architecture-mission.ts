/**
 * Observation Lounge — Terraform remote-state architecture, then record to RAG.
 *
 * The Fargate deploy keeps failing because there is no remote Terraform backend: CI runs with
 * ephemeral state, re-creating bootstrap resources it can't, and orphaning stack resources it
 * created. This convenes the REAL OpenRouter crew (runMissionPipeline) to design the remote-state
 * architecture, then records the decision to RAG so the deploy process self-documents.
 *
 * Usage: zsh -ic 'pnpm tsx scripts/tfstate-architecture-mission.ts'
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
import type { ObservationDebateResult } from '../packages/shared/src/index.js';

const BRIEF = `
Convene the Observation Lounge to design the Terraform REMOTE-STATE architecture for the Story Agent
AWS Fargate deploy, then document the decision. The deploy fails repeatedly for one root cause: there
is NO remote state backend.

OBSERVED FACTS:
- terraform/ has no backend block. CI (deploy.yml) runs 'terraform init + plan + apply' with EPHEMERAL
  local state each run. So CI cannot see resources created previously.
- Bootstrap resources (aws_iam_openid_connect_provider.github + aws_iam_role.github_actions deploy role)
  are created LOCALLY with admin creds (scripts/bootstrap-oidc.sh) into a LOCAL state file. CI's OIDC
  auth DEPENDS on these existing before it runs.
- Because CI has empty state, its apply tried to RE-CREATE the OIDC provider (AccessDenied: the deploy
  role lacks iam:CreateOpenIDConnectProvider) and created stack resources that are now ORPHANED:
  an ACTIVE ECS cluster, an ALB, 3 target groups, and the ecs-execution + task IAM roles — none tracked
  by any state. The next apply would hit "already exists" cascades.
- Local Terraform is v1.5.7 (NO native S3 use_lockfile — that needs 1.11+). CI uses setup-terraform
  latest (1.x). Version skew on shared state is a risk.
- Secrets (story-agent/runtime, story-agent/aha) live in AWS Secrets Manager (single source of truth).
- AWS account 860268930466, region us-east-2. WorfGate brokers all AWS creds (scripts/worfgate-terraform.ts).

DECISIONS THE CREW MUST CONVERGE ON (Geordi=infra, Data=architecture, O'Brien=devops, Worf=security,
Quark=cost, Picard=command):
1. Remote backend: S3 (bucket name + key + region) and LOCKING strategy given the 1.5.7-vs-latest skew
   (DynamoDB lock table vs no-lock single-operator vs pinning a Terraform version). Pick one.
2. Bootstrap split: should the OIDC provider + deploy role live in a SEPARATE state/config (terraform/
   bootstrap/) that ONLY local admin applies, so CI never refreshes/creates them — OR share one state and
   grant CI iam:GetOpenIDConnectProvider? Recommend the cleaner of the two and say why.
3. Orphan cleanup: DELETE the empty orphaned resources (clean slate) vs terraform import them. They carry
   no traffic/data yet. Pick one and give the exact ordered steps.
4. Make it repeatable + cheap (Quark): least moving parts, no idle infra, CI does the apply.
5. Security (Worf): state bucket encryption + access; never expose secrets in state.

Picard ends with a concrete, ordered MISSION PLAN tagged by owner that I (Claude Code) will implement.
`.trim();

function toDebate(result: Awaited<ReturnType<typeof runMissionPipeline>>): ObservationDebateResult {
  return {
    rounds: [{
      title: 'Crew contributions — terraform remote-state architecture',
      entries: result.contributions.map(ct => ({
        speakerId: ct.crewId, position: 'support' as const, statement: ct.text,
        evidence: [`model:${ct.model}`, `cost:$${ct.costUSD}`],
      })),
    }],
    consensusSummary: result.missionPlan,
    unresolvedRisks: [
      'Terraform version skew (local 1.5.7 vs CI latest) on shared state',
      'Orphaned ACTIVE ECS cluster + ALB must be reconciled before a clean apply',
    ],
    finalDecision: 'approved',
    actionItems: ['Implement the crew remote-state plan, then re-dispatch deploy.yml apply=true'],
  };
}

async function main() {
  if (!process.env.CREW_LLM_APPROVED_KEY) { console.error('❌ CREW_LLM_APPROVED_KEY not set'); process.exit(1); }
  console.log('\n🛸 Observation Lounge — TERRAFORM REMOTE-STATE ARCHITECTURE (OpenRouter crew, frugal)…\n');

  const result = await runMissionPipeline(BRIEF);

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = [
    `# Observation Lounge — Terraform Remote-State Architecture`, ``,
    `**Date:** ${new Date().toISOString().slice(0, 10)}  |  **Top model:** ${result.topModel}  |  **Cost:** $${result.efficiency.totalCostUSD} (${result.efficiency.totalTokens} tokens)`, ``,
    `## Captain Picard — intake (goals)`, ``, result.goals, ``,
    `## Team (Riker assembled, Quark cost-optimized)`, ``,
    ...result.team.map(m => `- **${m.crewId}** (${m.domain}) → \`${m.model}\``), ``,
    `## Crew contributions`, ``,
    ...result.contributions.flatMap(ct => [`### ${ct.crewId} — \`${ct.model}\` ($${ct.costUSD})`, ``, ct.text, ``]),
    `## Captain Picard — mission plan`, ``, result.missionPlan, ``,
    `## Cost (Quark)`, ``, '```json', JSON.stringify(result.efficiency, null, 2), '```', ``,
  ].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const path = `docs/observation-lounge/tfstate-architecture-${stamp}.md`;
  writeFileSync(path, md);
  console.log(`📄 Transcript → ${path}`);

  console.log(`\n🧠 Recording to RAG (embeddings: ${embeddingSource()})…`);
  const obs = await storeObservationMemory({
    storyId: 'tfstate-architecture', source: 'mcp', transcript: toDebate(result),
    tags: ['deployment', 'terraform', 'remote-state', 'backend', 'architecture', 'cicd'],
  });
  console.log(`  ✅ shared observation memory: ${obs.id}`);
  const memId = await storeCrewPersonalMemory({
    crew_id: 'geordi', memory_type: 'decision_note',
    title: 'Terraform remote-state architecture (S3 backend + bootstrap split)',
    content: `Crew decision on Story Agent terraform remote state (Observation Lounge).\n\n${result.missionPlan}`,
    tags: ['terraform', 'remote-state', 'backend', 'deployment'],
    relates_to_crew: ['data', 'obrien', 'worf', 'quark', 'picard'],
  });
  console.log(`  ✅ Geordi personal memory: ${memId ?? '(cached)'}`);
  console.log(`\n✔ Architecture deliberated + recorded. Implementing per the crew plan next.\n`);
}

main().then(() => process.exit(0)).catch((err) => { console.error('Mission failed:', err); process.exit(1); });
