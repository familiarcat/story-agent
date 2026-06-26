import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge: PRIORITIZE the single highest-value NEXT feature to build for Story Agent, and design it concretely. Constraints: must be buildable now, high user value, and advance the goal of replacing Claude Code with our OpenRouter crew. 
CURRENT STATE (already shipped): VS Code extension chat participant with /agent (autonomous loop), /plan, /review, /ask — all routed to the canonical Quark-optimized /chat or /agent over OpenRouter; @file/@codebase context (grep); multi-file diff review UI (per-file accept/reject); unified navigation tree; Aha project tree (products→releases→stories) in the nav with refresh + "Prepare with crew"; web /chat + dashboard; cloud Fargate live (/symphony,/chat,/agent via ALB) sharing cloud RAG; local↔cloud auto-fallback. 
CANDIDATE next features (pick ONE as #1, rank the rest): (a) multi-turn conversation memory in /chat (currently single-shot — standard assistant behavior), (b) inline chat Ctrl+I in the editor, (c) inline completions/ghost-text, (d) Aha tree fed by aha:* MCP tools + caching (vs current direct REST), (e) richer web chat UI (history, streaming, model/cost), (f) agent feedback/self-learning loop surfaced in UI. 
For the #1 pick: give the concrete implementation plan (files to touch, data flow) and why it's highest value. Keep it tight and decisive. Owners: Data(arch), Geordi(extension), Troi(UX), Riker(impl), Quark(cost/value), Picard(command). Picard ends with the chosen #1 + ordered build steps.`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Next Build Prioritization','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — chosen #1 + steps','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/next-build-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'next-build',source:'mcp',transcript:{rounds:[{title:'next build',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:[],finalDecision:'approved',actionItems:['Build the chosen #1 feature']},tags:['roadmap','vscode','chat','prioritization']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'picard',memory_type:'decision_note',title:'Next-build priority (post-v1)',content:r.missionPlan,tags:['roadmap','prioritization'],relates_to_crew:['data','geordi','troi','riker','quark']});
console.log('MEM '+m);
process.exit(0); // clean exit — work done; don't hang on open handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
