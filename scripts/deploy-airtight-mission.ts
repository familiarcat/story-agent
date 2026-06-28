import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'fargate cicd deploy health check rollout ecs alb terraform apply rollback smoke test image build supabase migrate node version',
    clientId: null, limit: 6,
  });
  const recall = mems.length ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 280) ?? ''}`).join('\n') : '(none)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 900));

  const BRIEF = `Observation Lounge — O'BRIEN + GEORDI LEAD: make the END-TO-END DEPLOYMENT process AIR-TIGHT. Investigate the current pipeline, find every gap, propose a prioritized hardening plan. Decisive + FRUGAL.

PRIOR MEMORY (build on, do not re-litigate):
${recall}

GROUND TRUTH (current pipeline):
- .github/workflows/deploy.yml (deploy-fargate): on push to main (paths packages/docker/terraform) → detect → build_mcp ‖ build_ui (ARM64 → ECR :latest + :sha, GIT_SHA build-arg) → deploy = terraform PLAN. terraform APPLY only on manual workflow_dispatch apply=true. Reuses live image on infra-only.
- audit-check.yml (WorfGate security audit) + integration-tests.yml run on every push. supabase-auto-migrate.yml FAILS on every commit (pre-existing — unresolved).
- Fargate: ECS services story-agent-mcp + story-agent-ui (cluster story-agent, us-east-2), ALB target groups (mcp-http hc=/rag/health:3102, mcp-ws:8000, ui hc=/dashboard:3000), ElastiCache Redis (TLS+AUTH), Secrets Manager/SSM.
- JUST FIXED (ae65b12): mcp tasks failed ALB health checks FOREVER because RAG(3102)/WS(8000) bound localhost not 0.0.0.0; also node:20→22. Both services now healthy. This bug was INVISIBLE — push+plan went green while the live service was crash-looping.
- GAP: /agent/health reports gitSha but 3103 is NOT exposed on Fargate, so deploys aren't externally verifiable. The deploy workflow declares success after terraform apply WITHOUT confirming the new task actually becomes healthy.

CONVERGE ON (terse, decisive — the air-tight checklist):
1. O'BRIEN (devops, LEAD) — POST-DEPLOY VERIFICATION: the #1 gap. The pipeline must FAIL if the new task doesn't become healthy. Propose: after terraform apply, poll ECS rolloutState==COMPLETED + target-health 'healthy' (timeout→fail+rollback), and curl the ALB /rag/health expecting the NEW gitSha. Specify exactly what to add to deploy.yml.
2. GEORDI — EXTERNAL VERIFIABILITY: surface gitSha on /rag/health (3102, ALB-reachable) so a deploy can be confirmed by curling the live ALB. Specify the file/change (rag-http-server.ts /rag/health handler).
3. WORF — SECURITY/SECRETS: assert required SSM/Secrets present pre-deploy; the Redis-posture check already runs — what else (image scan, audit-check must gate deploy)? Should audit-check be a REQUIRED gate before apply?
4. QUARK — APPLY GATE: should apply stay manual (workflow_dispatch) or auto-run on main with the post-deploy health gate as the safety? Cheapest path that's still safe. And fix supabase-auto-migrate (or disable if obsolete).
5. RIKER → PICARD — the PRIORITIZED air-tight checklist (ranked) + the SINGLE first artifact + acceptance check (e.g. "deploy.yml fails unless the rolled task reports healthy AND /rag/health returns the new gitSha"). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== DEPLOY-AIRTIGHT FEEDBACK =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} | ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 420)); }
  console.log('\n[PICARD | PLAN]\n' + r.missionPlan.slice(0, 1500));

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Air-tight end-to-end deployment', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\``, '', c.text, '']), '## Picard — plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/deploy-airtight-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'deploy-airtight-strategy', source: 'mcp',
    transcript: { rounds: [{ title: 'air-tight end-to-end deployment', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['deploy declares success before confirming task health', '/agent/health gitSha not ALB-reachable', 'supabase-auto-migrate fails every commit', 'apply gate manual vs auto'], finalDecision: 'approved', actionItems: ['post-deploy health+gitSha gate in deploy.yml', 'gitSha on /rag/health', 'audit-check as required gate', 'fix/disable supabase-auto-migrate'] },
    tags: ['fargate', 'cicd', 'deploy', 'airtight', 'devops', 'ecs', 'health-check', 'rollback', 'openrouter'],
  });
  console.log('OBS ' + obs.id);
  const mem = await storeCrewPersonalMemory({ crew_id: 'obrien', memory_type: 'decision_note', title: 'Air-tight deploy: post-apply health+gitSha gate (fail if task not healthy), gitSha on /rag/health, audit-check as required gate, fix supabase-auto-migrate', content: r.missionPlan, tags: ['fargate', 'cicd', 'deploy', 'airtight', 'devops'], relates_to_crew: ['geordi', 'worf', 'quark', 'riker', 'picard'] });
  console.log('MEM ' + mem + ' COST $' + r.efficiency.totalCostUSD);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
