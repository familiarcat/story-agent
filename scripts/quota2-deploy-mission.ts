import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — SOLVE the AWS Fargate deploy WITHIN a vCPU quota of 2 (do NOT wait for the pending quota increase). Constraints + facts:
- Total Fargate On-Demand vCPU quota = 2. UI service = 1 vCPU, MCP service = 1 vCPU → exactly 2 at steady state (fits).
- The problem is ROLLING DEPLOYS: every CI deploy passes mcp_image=:latest on infra-only changes, which creates a NEW ECS task definition revision → forces a rolling update → ECS tries to place a new MCP task while the old runs → needs 3 vCPU → "unable to place task: vCPU limit". Repeated failed applies left MCP mid-rollout + mcp_http target unhealthy (503).
- We already set deployment_minimum_healthy_percent=0 / maximum_percent=100 (stop-before-start) + availability_zone_rebalancing=DISABLED + deployment_circuit_breaker{rollback}, but applies kept failing before the service config landed.
- The agent endpoint is now mounted on the existing 3101 server (no new container port / no service replacement). RAG is already cloud-shared.
KEY INSIGHT to validate: infra-only deploys should reuse the EXACT currently-deployed image digest (read from the live ECS task definition) instead of :latest — so config/ALB-only changes apply WITHOUT a task-def change → no rollout → no vCPU contention. Stop-before-start handles the rare real image rollout within quota=2.
GOALS: 
1. Confirm the digest-reuse approach (read current task def image in deploy.yml when builds are skipped) + give the exact aws ecs describe-task-definition query. 
2. How to STABILIZE the currently-stuck MCP service back to healthy within quota=2 (e.g., pin to the last-good digest task def; let circuit breaker roll back; or briefly scale UI to 0 to free 1 vCPU for one clean MCP rollout, then restore). Pick the least-risk sequence. 
3. Any other quota=2-safe patterns (single combined task with two containers? — assess tradeoff). 
Owners: Obrien(devops/CI), Geordi(infra), Data(arch), Quark(cost), Worf(safety), Picard(command). Picard ends with an ORDERED fix sequence. Terse, decisive.`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Solve Fargate Deploy within vCPU quota=2','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — fix sequence','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/quota2-deploy-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'quota2-deploy',source:'mcp',transcript:{rounds:[{title:'quota2 deploy',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['vCPU quota increase still CASE_OPENED'],finalDecision:'approved',actionItems:['digest-reuse on infra-only; stabilize MCP within quota=2']},tags:['deployment','fargate','quota','cicd','optimization']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'obrien',memory_type:'lesson_learned',title:'Deploy within Fargate vCPU quota=2 (digest-reuse on infra-only + stop-before-start)',content:r.missionPlan,tags:['deployment','fargate','quota'],relates_to_crew:['geordi','data','quark','worf','picard']});
console.log('MEM '+m);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
