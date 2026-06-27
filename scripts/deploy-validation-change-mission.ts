import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'fargate deploy cicd health version endpoint image sha verify rollout ecs deploy.yml',
    clientId: null, limit: 5,
  });
  const recall = mems.length ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 260) ?? ''}`).join('\n') : '(none)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 800));

  const BRIEF = `Observation Lounge — propose ONE small, SAFE, app-touching change to push through the CICD -> Fargate pipeline as a DEPLOY VALIDATION. Decisive + FRUGAL.

PRIOR MEMORY:
${recall}

PIPELINE GROUND TRUTH:
- .github/workflows/deploy.yml (deploy-fargate) triggers on push to main touching packages/** | docker/** | terraform/**. It builds ARM64 images (story-agent-mcp, story-agent-ui) to ECR tagged :latest and :<git-sha>, then terraform plan. terraform APPLY is gated behind manual workflow_dispatch apply=true. audit-check.yml runs WorfGate security audit on every push.
- Fargate: 2 ECS services (mcp + ui) on us-east-2, ElastiCache Redis, Secrets Manager. The deploy reuses the live image on infra-only changes; an app change rolls a new task.
- The MCP server already serves an Agent HTTP server on :3103/agent and a RAG service on :3102. (See packages/mcp-server/src/agent-core/http-server.ts.)

CONVERGE ON (terse):
1. Riker/Geordi — THE CHANGE: propose ONE minimal, low-risk, app-touching change that is genuinely USEFUL for operating Fargate AND lets us verify the rollout. Strong candidate: add a tiny /health (or /version) GET to the Agent HTTP server (packages/mcp-server/src/agent-core/http-server.ts) returning { status:'ok', gitSha: process.env.GIT_SHA ?? 'dev', startedAt } so we can curl the live ECS task and confirm WHICH image is deployed. Specify the EXACT file + the handler + how the git sha gets in (env var set in the Dockerfile/task def, or 'dev' fallback). If a better minimal change exists, pick it — but keep it one file, additive, no behavior change to existing routes.
2. Worf — SECURITY: the new endpoint must be unauthenticated-safe (no secrets, no internal paths leaked), read-only, and pass the audit-check. Confirm.
3. Quark — cheapest: smallest diff that still triggers the image build (touches packages/**); no new deps.
4. Picard — the SINGLE change (file + exact addition) + ACCEPTANCE CHECK (how we confirm it's live on Fargate post-apply: curl the ECS/ALB /health and see status ok + the new git sha) + ROLLBACK (revert the commit; redeploy prior image). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== CREW FEEDBACK =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} | ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 420)); }
  console.log('\n[PICARD | PLAN]\n' + r.missionPlan.slice(0, 1500) + '\n=====');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Fargate deploy-validation change', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\``, '', c.text, '']), '## Picard — plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/deploy-validation-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'fargate-deploy-validation', source: 'mcp',
    transcript: { rounds: [{ title: 'deploy-validation change for Fargate CICD', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['change must touch packages/** to trigger image build', 'endpoint must pass audit-check + leak nothing', 'terraform apply is gated behind workflow_dispatch apply=true'], finalDecision: 'approved', actionItems: ['implement the single proposed change', 'push to main -> build+plan + audit', 'dispatch deploy apply=true', 'verify /health on Fargate shows new git sha'] },
    tags: ['fargate', 'cicd', 'deploy', 'health', 'version', 'devops', 'ecs', 'openrouter'],
  });
  console.log('OBS ' + obs.id);
  const mem = await storeCrewPersonalMemory({ crew_id: 'geordi', memory_type: 'decision_note', title: 'Fargate deploy-validation change: add /health|/version to agent http-server exposing git sha, push through CICD, verify on live ECS', content: r.missionPlan, tags: ['fargate', 'cicd', 'deploy', 'health'], relates_to_crew: ['riker', 'worf', 'quark', 'picard', 'obrien'] });
  console.log('MEM ' + mem + ' COST $' + r.efficiency.totalCostUSD);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
