import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'deployment health check slow rollout ecs services stable grace period circuit breaker fargate gate lag optimize crusher',
    clientId: null, limit: 6,
  });
  const recall = mems.length ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 280) ?? ''}`).join('\n') : '(none)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 900));

  const BRIEF = `Observation Lounge — ORGANIZE THE TEAM around deployment health: DR. CRUSHER OWNS and OVERSEES deployment health checks; the crew coordinates UNDER her so RAG memories combine to eliminate deployment lag. Decisive + FRUGAL.

PRIOR MEMORY (build on, do not re-litigate):
${recall}

THE PROBLEM (user): "The deployment is running quite slow and seems snagged at the health-gate aspect." Make Crusher the standing OWNER of deployment-health, with the crew referring to one another to solve health issues under her oversight — prioritizing LLM usage via OpenRouter + Quark.

GROUND TRUTH:
- We just shipped a post-deploy health gate in deploy.yml: \`aws ecs wait services-stable\` for story-agent-mcp + story-agent-ui. It WORKS (fails on unhealthy tasks) but is SLOW — the live apply took ~6-10min waiting for the rollout to stabilize.
- Why slow: ECS quota=2 vCPU → the service rolls stop-old-then-start-new (serial); target group health check grace + interval; container startup (Supabase hydration, crew registration). The gate's \`services-stable\` waiter polls up to ~10min.
- ALB target groups: mcp-http hc=/rag/health:3102, mcp-ws:8000, ui hc=/dashboard:3000. Redis posture check runs each deploy.

CONVERGE ON (terse, decisive):
1. CRUSHER (LEAD + OWNER) — THE DEPLOYMENT-HEALTH CHARTER: declare Dr. Crusher the standing owner/overseer of deployment health. Define the coordination model: who she consults (O'Brien devops, Geordi infra, Worf security) and how RAG memory accumulates so each deploy is faster than the last (record health-check timings, grace tuning, known-good configs). State the ownership in one crisp charter line.
2. CRUSHER + GEORDI — WHY IT LAGS + THE FIX: diagnose the slow rollout and propose CONCRETE speedups: (a) ECS deployment circuit breaker (rollback:true) so a bad roll FAILS FAST instead of waiting the full window; (b) tune target-group health check (HealthyThresholdCount, Interval, HealthCheckTimeoutSeconds) + service healthCheckGracePeriodSeconds for the real startup time; (c) deployment minimumHealthyPercent/maximumPercent given quota=2 (can we raise the vCPU quota or set maxPercent=200 to start-before-stop?); (d) speed container boot (defer non-critical hydration). Name the exact terraform/workflow knobs.
3. O'BRIEN — the gate itself: make it fail-fast (shorter bounded wait + rely on the ECS circuit breaker) instead of a flat 10min waiter; surface per-deploy health timing to RAG.
4. WORF — keep the Redis-posture + security gates; don't trade safety for speed.
5. QUARK — cheapest path + which crew member/model tier owns each sub-task (Crusher oversees; route diagnosis to the right tier). What to DEFER.
6. RIKER → PICARD — Crusher's ownership charter + the prioritized health-optimization list (ranked) + the SINGLE first artifact + acceptance check (e.g. "ECS deployment circuit breaker + tuned grace so a healthy deploy stabilizes in <3min and a bad one fails fast"). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== CRUSHER DEPLOY-HEALTH FEEDBACK =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} | ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 420)); }
  console.log('\n[PICARD | PLAN]\n' + r.missionPlan.slice(0, 1600));

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Crusher owns deployment health (optimize the gate)', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\``, '', c.text, '']), '## Picard — plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/crusher-deploy-health-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'crusher-deploy-health-ownership', source: 'mcp',
    transcript: { rounds: [{ title: 'Crusher owns deployment health + optimize the gate', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['slow rollout under quota=2 serial roll', 'flat 10min gate wait vs fail-fast circuit breaker', 'grace/interval not tuned to real startup', 'keep security gates while speeding up'], finalDecision: 'approved', actionItems: ['Crusher = deployment-health owner/overseer (standing charter)', 'ECS deployment circuit breaker rollback:true', 'tune target-group health check + grace', 'fail-fast gate + per-deploy health timing to RAG'] },
    tags: ['fargate', 'deploy', 'health-check', 'crusher', 'ownership', 'circuit-breaker', 'devops', 'optimization', 'openrouter', 'team-organization'],
  });
  console.log('OBS ' + obs.id);
  const memC = await storeCrewPersonalMemory({ crew_id: 'crusher', memory_type: 'role_charter', title: 'OWNER: Dr. Crusher oversees DEPLOYMENT HEALTH — health checks, rollout stability, fail-fast. Coordinates O’Brien (devops), Geordi (infra), Worf (security). RAG accumulates per-deploy health timings to keep cutting lag.', content: r.missionPlan, tags: ['ownership', 'deployment-health', 'health-check', 'overseer', 'fargate'], relates_to_crew: ['obrien', 'geordi', 'worf', 'quark', 'picard'] });
  console.log('MEM crusher=' + memC + ' COST $' + r.efficiency.totalCostUSD + ' top=' + r.topModel);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
