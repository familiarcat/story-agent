import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — REVIEW what we shipped this session and prioritize the NEXT STEPS. Be decisive: rank, don't list everything.

SHIPPED THIS SESSION (all committed + deployed to Fargate, live on the ALB):
1. Frugal crew pipeline: FRUGAL caps officer deliberation at tier-3 (deepseek) + per-call timeout + clean process.exit across all mission scripts → deliberations now ~$0.003 in ~25s (was ~$0.022 / 5min+).
2. Delegation router: a reusable complexity/cost scorer (packages/shared) + an active Claude Code UserPromptSubmit hook that auto-steers substantive prompts to the crew. Threshold 0.45, static.
3. Agent Workspace in the UI (/agent): drives the agent-core SSE loop (read/edit/run/search/git on a Quark-selected OpenRouter model). Wave 2: colored diff rendering + INTERACTIVE WorfGate approvals (opt-in), brokered via Redis pub/sub (multi-task safe) with an in-process fallback.
4. OpenAPI: specs/openapi.current.yaml (3.1, live crew-server API) + /docs Swagger UI + a spectral CI lint (anti-rot). The aspirational specs/openapi.v1.yaml still describes an UNIMPLEMENTED /v1 resource API.
5. Unified UI: /agent is the orchestrating hub; 12 surfaces grouped into Build/Plan/Observe under domain owners; a single-source IA + grouped nav + orchestrating home.

KNOWN OPEN ITEMS / CAVEATS (raw — you decide what matters):
- Approve-and-mutate path verified only locally + only the DENY branch on cloud; approve-on-cloud + true 2-task Redis pub/sub not yet exercised.
- Delegation router threshold is static; the planned Wave-2 self-tuning loop (log realized vs estimated savings from the audit trail, auto-tune) is not built.
- Tests: delegation-router has unit tests; agent-core Wave 2 (approvals) + the UI surfaces have NONE.
- openapi.v1.yaml aspirational /v1 API: implement, prune, or formally mark planned.
- UI deploy is slow (UI target ~7 min to healthy) — rollout optimization unaddressed.
- VS Code extension may not yet consume the new unified/agent surfaces.
- Crew domain hygiene: a member hallucinated a non-existent "medical domain" in a prior deliberation.
- Security: the Agent Workspace now triggers real file/shell edits from the browser; client-scope isolation for browser-driven agents needs a hard review (Worf).

CONVERGE ON (terse, decisive):
1. Picard/Data: the TOP 3-5 next steps RANKED by value × risk-reduction, each with its owner. Distinguish "harden what we shipped" vs "new capability."
2. Worf: the single most important SECURITY follow-up (browser-driven file/shell + client isolation) — is it a blocker?
3. Yar: the most valuable TEST to add first (what failure would hurt most).
4. Quark: cheapest-highest-leverage item; what NOT to do yet (avoid gold-plating).
5. Riker: sequence the top items. Picard ends with the SINGLE next action + its acceptance check. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Next-steps review (post-session)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/next-steps-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'next-steps-review',source:'mcp',transcript:{rounds:[{title:'next steps review',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['browser-driven edits + client isolation','no tests on Wave 2 + UI','2-task Redis approval unverified'],finalDecision:'approved',actionItems:['Execute Picard ranked next steps']},tags:['review','next-steps','roadmap','priority']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'picard',memory_type:'decision_note',title:'Post-session next-steps — ranked priorities (harden vs new capability)',content:r.missionPlan,tags:['review','next-steps','roadmap'],relates_to_crew:['data','worf','yar','quark','riker']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0); // clean exit — work done; don't hang on open handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
