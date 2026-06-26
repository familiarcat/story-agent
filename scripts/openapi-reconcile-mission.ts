import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — decide and design the OpenAPI/Swagger spec strategy for the project. Reconcile aspiration with reality.

GROUND TRUTH (verified just now):
- A spec ALREADY EXISTS: specs/openapi.v1.yaml (415 lines, from the INITIAL commit). It documents an ASPIRATIONAL /v1/* resource API: /v1/projects, /v1/projects/{id}/sprints, /v1/stories/import, /v1/stories/{id}, /v1/stories/{id}/missions, /branches/create, /pull-requests/open, /conflicts, /observations/stream. This is design-time; much may NOT be implemented.
- The ACTUAL running HTTP surface is the agent-core CREW SERVER (the single source the UI + VS Code extension + clients consume), and it is NOT in the spec at all:
  • POST /agent — SSE agentic coding loop (body {input, workspace?, clientId?, tier?}); streams events model·lens·text·tool_call·gate·tool_result·cost·escalation·retry·done·error; auth optional Bearer AGENT_SERVICE_TOKEN.
  • POST /chat — single-shot crew chat (Quark-selected model); returns {answer, model, provider, tier, tokensIn, tokensOut, costUSD, sources}.
  • GET /cost — cost ledger (Quark spend + savings vs Anthropic baseline).
  • GET /learnings — crew self-learning loop.
  • GET /aha/products — cached Aha products (single source).
  • GET /aha/raw?path=<aha-api-path> — read-only cached Aha proxy (validated path).
  • GET /symphony, GET /agent/health — status/health.
- Clients today: the Next.js UI (/api/* route handlers proxy to these), the VS Code extension (aha.ts hits /aha/*), future external clients. Deployed behind the ALB.

CONVERGE ON (terse, decisive, FRUGAL):
1. Data/Picard — SCOPE DECISION: what should the spec cover? Recommend ONE: (a) replace the aspirational v1 with the REAL crew-server API; (b) keep BOTH — a "current" spec for the live crew server + the aspirational v1 marked as roadmap/planned; (c) one spec, real paths first, aspirational paths tagged x-status: planned. Pick one and say why.
2. Geordi — STRUCTURE + FILES: exact file(s) and OpenAPI version (3.1). How to document the SSE /agent endpoint (OpenAPI models request/response poorly for SSE — use text/event-stream with a documented event-union schema + x-sse extension?). Where the spec lives (specs/), how it's served/viewed (a /docs Swagger UI route? or static).
3. Worf — SECURITY: securitySchemes (Bearer AGENT_SERVICE_TOKEN), which endpoints require it, client-isolation/x-client-id header, and the /aha/raw path-validation contract. Don't document secrets.
4. Quark — keep it FRUGAL: the spec is hand-maintained vs generated. Recommend the cheapest sustainable sync strategy so it doesn't rot again (it already rotted once).
5. Yar — ACCEPTANCE: what makes this spec "done & trustworthy" (every live endpoint documented with request/response + example; lints clean under an OpenAPI validator).
6. Riker — ordered first 3 steps. Picard ends with the SINGLE artifact to produce first + its acceptance check. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — OpenAPI/Swagger spec strategy (reconcile aspiration vs reality)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/openapi-reconcile-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'openapi-reconcile',source:'mcp',transcript:{rounds:[{title:'openapi reconcile',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['SSE in OpenAPI is awkward','spec rotted once — sync strategy must hold'],finalDecision:'approved',actionItems:['Produce the reconciled OpenAPI spec for the live crew-server API']},tags:['openapi','swagger','api','spec','crew-server','docs']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'OpenAPI spec strategy — document the live crew-server API; reconcile the stale aspirational v1',content:r.missionPlan,tags:['openapi','swagger','api','spec'],relates_to_crew:['picard','geordi','worf','quark','yar','riker']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0); // clean exit — work done; don't hang on open handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
