import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — EXPLAIN to the operator: (A) the methods + goals of how Redis is implemented in this system, and (B) the benefits to the OVERALL SYSTEM of the two deployment options for Redis TLS-in-transit. Teach, don't just rank. Be concrete and tie everything back to system health, security, and cost.

GROUND TRUTH — how Redis is implemented (verified in the repo):
- Resource: AWS ElastiCache Redis replication group, single node cache.t4g.micro (Quark: ~$11/mo), port 6379, in the PRIVATE subnet SG (only ECS tasks reach it). at_rest_encryption=true; transit_encryption currently OFF (gated behind the redis_transit_encryption Terraform toggle, default false).
- ROLES Redis plays (methods/goals):
  1) Ephemeral CACHE — fast, disposable; the durable system of record is Supabase cloud (RAG/memory). Redis is NOT the source of truth (cloud-first principle: strange-new-world = cloud durable, Redis = cache+queue+ephemeral).
  2) RAG sync QUEUE — buffers/queues work between the crew and cloud RAG.
  3) Approval pub/sub BROKER — the heart of multi-task-safe interactive approvals: POST /agent streams on one Fargate task; POST /agent/approve may land on a DIFFERENT task; the decision is brokered over Redis channel approval:<id> (awaitApproval subscribes on a duplicated connection, resolveApproval publishes). Auto-denies after 180s so a closed tab can't hang the loop.
- DESIGN GOAL — Redis is OPTIONAL by construction: getRedis() returns null when REDIS_URL is unset/unreachable; the app degrades to Supabase-only + an in-process approval Map. So a Redis blip NEVER takes the system down — it degrades a feature (cross-task approval brokering), it doesn't crash.
- TLS plan: enabling transit encryption forces a CLUSTER REPLACEMENT (brief downtime/blip) and adds an AUTH token (rediss:// URL). node-redis auto-negotiates TLS from the scheme; token rides in the URL; REDIS_URL is never logged.

THE TWO OPTIONS (explain the system-level benefits of each):
- OPTION A — run the TLS cutover NOW: accept a brief Redis blip immediately; the approval pub/sub channel (which carries operator approve/deny decisions) becomes encrypted + authenticated right away.
- OPTION B — leave TLS for a planned maintenance window: zero unplanned disruption now; encryption deferred; pub/sub stays plaintext inside the private VPC SG until the scheduled cutover.

CONVERGE ON (teach the operator, terse but substantive):
1. Geordi/O'Brien: explain the METHODS + GOALS of the Redis implementation above in plain engineering terms — why cache+queue+pub/sub, why optional/degrade-gracefully, why single-node + private SG. What is Redis doing FOR the overall system.
2. Worf: the SECURITY meaning of transit encryption HERE specifically — what is and isn't exposed today (private SG, at-rest on, transit off), and what threat the TLS+AUTH actually closes for the approval channel. Is plaintext-in-private-VPC an acceptable interim posture or not.
3. Quark: the COST/risk trade of Option A vs B for the overall system — blip-now vs defer; what each buys and what each risks. Cheapest adequate path.
4. Troi/Data: the OPERATOR/UX + reliability impact of each option — what a user actually experiences during a blip given the graceful-degradation design.
5. Picard: synthesize — the benefits of BOTH options to the overall system, and a clear recommendation with the condition under which each is right. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Redis: methods, goals, and the TLS-cutover options','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — synthesis','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/redis-explain-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'redis-explain',source:'mcp',transcript:{rounds:[{title:'redis explain',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['transit encryption deferred until cutover'],finalDecision:'approved',actionItems:['Operator decides A (cutover now) vs B (planned window)']},tags:['redis','tls','elasticache','pubsub','explainer','infra']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'geordi',memory_type:'decision_note',title:'Redis methods/goals + TLS cutover options explained (cache+queue+approval pub/sub; optional/degrade-gracefully)',content:r.missionPlan,tags:['redis','tls','infra','explainer'],relates_to_crew:['obrien','worf','quark','troi','data','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
