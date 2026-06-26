import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — INTEGRATE THE ENTIRE INFRA into one coherent, verifiable, deployable whole BEFORE we refine the UI that consumes it. Be decisive: produce an ordered integration plan with owners + acceptance checks, not a wishlist.

GROUND TRUTH (verified in the repo just now):
- Terraform (terraform/*.tf): ALB (alb.tf); ECS cluster + 2 Fargate services (ecs.tf) — "mcp" (container ports 3101 serving /mcp + /agent + /symphony, 3102 rag, 8000 ws) and "ui" (3000); ElastiCache Redis (redis.tf); Cloud Map service discovery (servicediscovery.tf, internal DNS mcp.<name>.internal); cost.tf; outputs.tf.
- Secrets: AWS Secrets Manager runtime secret injects CREW_LLM_APPROVED_KEY, SUPABASE_CLOUD_URL, SUPABASE_CLOUD_KEY, REDIS_URL into both services (ecs.tf runtime_secrets). Brokered in-app by the WorfGate credential broker (Vault->AWS Secrets Manager->env).
- Crew runtime env (cloud): SUPABASE_MODE=live, CREW_LLM_PROVIDER=approved, CREW_LLM_APPROVED_URL=openrouter, CREW_LLM_MODEL_PROFILE=cost_optimized. The crew runs on OpenRouter (Quark cost-optimized selection).
- Two Dockerfiles: docker/Dockerfile.mcp, docker/Dockerfile.ui.
- agent-core loop (read/edit/run/search/git on a Quark OpenRouter model) is served as /agent SSE on the mcp service; WorfGate green/yellow/red governs local ops; interactive approvals are brokered via Redis pub/sub (channel approval:<id>) with an in-process Map fallback.
- RAG/durable memory = Supabase cloud (live); Redis = cache + queue + ephemeral + approval pub/sub.

JUST SHIPPED (this session, committed to main):
- WorfGate now denies-by-default (red) for unclassified tools (security review #1).
- agent-core approval-registry has unit tests (in-process fallback, 4/4 pass).

KNOWN INFRA GAPS (raw — you decide what matters + sequence):
- redis.tf: transit_encryption_enabled = false. O'Brien/crew flagged TLS-in-transit as required before Wave 2 (the approval pub/sub carries operator decisions). This is crew next-step #2.
- Approve-on-cloud + TRUE 2-task Redis pub/sub across separate Fargate tasks is NOT yet exercised end-to-end (only local + the deny branch on cloud).
- No integration test proves the deployed whole: browser -> ALB -> mcp /agent SSE -> tool call -> WorfGate gate -> approval pub/sub -> Supabase RAG write.
- tfstate hygiene: stale terraform.tfstate.*.old files in the repo tree (should never be committed).
- Service-to-service: ui -> mcp.<name>.internal:3102 (rag) over plaintext inside the VPC; is that acceptable or does it need mTLS/TLS?
- Health/rollout: UI target ~7 min to healthy (slow rollout, unaddressed).

CONVERGE ON (terse, decisive, FRUGAL):
1. Geordi/O'Brien: the ORDERED infra-integration steps to make the deployed stack one verified whole. For each: owner + the exact acceptance check (a command or observable signal). Start with Redis TLS-in-transit (transit_encryption_enabled + auth_token + redis URL scheme rediss://) since it gates the approval path.
2. Worf: the security floor for the integrated infra — secrets flow (Secrets Manager -> broker), transit encryption (Redis + internal service calls), client-scope isolation across the deployed agent. What is a BLOCKER vs a follow-up.
3. Data/Yar: the SINGLE highest-value integration test — the end-to-end path that, if it passes, proves the infra is integrated (browser/ALB -> mcp /agent -> gate -> approval -> RAG). Where it lives, how it runs in CI.
4. Quark: cheapest-highest-leverage ordering; what NOT to do yet (no gold-plating — e.g., defer mTLS if VPC isolation suffices). Keep the crew + infra cost down.
5. Riker: sequence the top items into the first 3 concrete actions. Picard ends with the SINGLE next action + its acceptance check, and confirms infra integration precedes UI refinement. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Infra integration (before UI refinement)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/infra-integration-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'infra-integration',source:'mcp',transcript:{rounds:[{title:'infra integration',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['Redis TLS-in-transit (transit_encryption_enabled=false)','2-task approval pub/sub unverified on cloud','no end-to-end integration test','tfstate hygiene'],finalDecision:'approved',actionItems:['Execute infra-integration plan before UI refinement']},tags:['infra','integration','terraform','fargate','redis','tls','deploy','roadmap']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'geordi',memory_type:'decision_note',title:'Infra integration plan — make the deployed stack one verified whole (before UI refinement)',content:r.missionPlan,tags:['infra','integration','terraform','redis','tls','deploy'],relates_to_crew:['obrien','worf','data','yar','quark','riker','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
