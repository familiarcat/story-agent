import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge: investigate the Aha! MCP/API and design how to ORGANIZE Aha features within our VS Code UI NAVIGATION SYSTEM (the activity-bar nav tree). 
WHAT EXISTS: 
- Nav tree (NavigationTreeProvider) has a static "Stories & Sprints (Aha)" section (dashboard/sprint/status links). 
- Aha concept map (crew-aha-roles.ts): Firm/Client/Project = nested Aha workspaces (products); Epic=epic; Story=feature; Task=requirement; Sprint=release. Per-crew aha:* tool ownership exists. 
- aha:* MCP tools: aha:list-products, aha:list-epics, aha:list-features, aha:list-releases, aha:get-record, aha:create-feature, aha:update-feature (Worf-gated writes). 
- Extension aha.ts: fetchAhaStory (/features/:id), listAhaProjects (/products), getProjectHierarchy (releases). REST via AHA_DOMAIN+AHA_API_KEY. 
GOALS to converge on: 
1. The exact TREE SHAPE for a DYNAMIC Aha nav tree: Product(workspace) → Epic → Feature(Story) → Requirement(Task), plus Releases(Sprints) — lazy-loaded per node via the aha:* tools. Which aha:* tool feeds each level. 
2. Data path: should the extension call aha:* via the MCP server (single source, Worf-gated, cached) or hit Aha REST directly? Recommend one (Geordi/Data) given our local cache + background-sync goal. 
3. Node ACTIONS per level (click feature → /prepare or /agent on that story; right-click → update status via Worf-gated aha:update-feature; open in Aha). 
4. Performance: lazy expand + local cache + background refresh so the IDE never stalls (Geordi). 
5. Security: Worf — writes confirm-gated + audited; respect client isolation (firm→client→project). 
6. Cost: Quark — minimal API calls, cache aggressively. 
Owners: Data(tree/data model), Geordi(extension/perf), Worf(write governance), Riker(impl seq), Troi(UX), Quark(cost), Picard(command). Picard ends with an ORDERED plan to make the Aha nav section dynamic + tool-fed. Terse, decisive.`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Aha! in the UI Navigation System','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/aha-navigation-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'aha-navigation',source:'mcp',transcript:{rounds:[{title:'aha navigation',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:[],finalDecision:'approved',actionItems:['Make the Aha nav section dynamic + aha:* tool-fed']},tags:['aha','navigation','vscode','ui','mcp','integration']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'Aha! organized into the UI navigation tree (dynamic, tool-fed)',content:r.missionPlan,tags:['aha','navigation','vscode'],relates_to_crew:['geordi','worf','riker','troi','quark','picard']});
console.log('MEM '+m);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
