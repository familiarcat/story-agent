import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — UNIFY the Story Agent UI. Today it is 12 disconnected pages reachable only by a flat link bar. Decide how to integrate them into ONE coherent product where a single domain ORCHESTRATES the others, respecting each crew domain's limits and capacities.

GROUND TRUTH (verified):
- Surfaces today: / (home), /agent (Agent Workspace = the Claude-Code-grade agentic loop on OpenRouter — can read/edit/run/search/git/rag_recall/crew_deliberate), /chat (single-shot crew chat), /cost (Cost Observatory), /learnings (self-learning), /crew/memories (RAG), /observation-lounge (full-crew deliberation), /dashboard, /sprint + /story (Aha PM), /docs (OpenAPI Swagger UI).
- Nav is a flat <a> list in packages/ui/src/app/layout.tsx — no grouping, no orchestration, no sense of which surface is primary.
- Crew domains (each could own the integration of its surface): picard=command, data=architecture, worf=security, riker=implementation, geordi=infrastructure, obrien=devops, yar=quality, troi=stakeholder/UX, crusher=health, uhura=communications, quark=finance.
- Constraint: the crew runs on OpenRouter (cost-optimized). Anthropic is a pool member. Keep it FRUGAL — reuse the 12 existing pages; integration = a shell + grouping + an orchestrating home, NOT 12 rewrites.

CONVERGE ON (terse, decisive):
1. Data + Picard — THE ORCHESTRATING DOMAIN: pick which surface is the HUB that integrates the others, and WHY (capacity argument). Strong candidate: /agent (the agentic loop can already invoke every domain via tools) becomes the orchestrator, with the others as domains it can launch/deep-link into. State the unified INFORMATION ARCHITECTURE: group the 12 surfaces under domain owners (e.g. Build: Agent/Chat/Docs; Plan: Dashboard/Sprint/Story; Observe: Cost/Learnings/Memories/Lounge). Assign each group a crew owner.
2. Troi — THE SHELL/UX: one app shell with grouped, labelled navigation (sections, not a flat list) + an orchestrating HOME that routes the user to the right domain by intent. Respect domain capacity: don't surface a domain where it can't act.
3. Geordi — TECHNICAL INTEGRATION (frugal): a shared layout shell + grouped nav component; how the Agent Workspace deep-links to other domains (e.g. a tool result links to /cost or /docs). Reuse existing pages. Exact files (packages/ui/src/app/layout.tsx + a nav component + the home page).
4. Worf — domain boundaries: which surfaces are client-isolated / gated; the orchestrator must not cross client scope.
5. Quark — cost: confirm this is a shell+nav+home change, not a rebuild; smallest footprint.
6. Yar — acceptance: "unified" = one shell, grouped nav by domain, a home that orchestrates by intent, every existing page still reachable, no regressions.
7. Riker — ordered first 3 steps. Picard ends with the SINGLE first artifact to build + its acceptance check. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Unified UI (which domain orchestrates the integration)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/unified-ui-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'unified-ui',source:'mcp',transcript:{rounds:[{title:'unified ui',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['domain capacity mismatch','client-scope crossing in the orchestrator'],finalDecision:'approved',actionItems:['Ship the unified shell: orchestrating home + domain-grouped nav']},tags:['ui','unified','orchestration','domains','shell','navigation']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'Unified UI — orchestrating domain + domain-grouped IA for the 12 surfaces',content:r.missionPlan,tags:['ui','unified','orchestration','domains'],relates_to_crew:['picard','troi','geordi','worf','quark','yar','riker']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0); // clean exit — work done; don't hang on open handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
