import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — REFINE the extension-parity first artifact (RAG MEM 56): align Aha! PM interactivity with the "PLAN" mode of the unified Ask/Plan/Agent chat panel, so the project-management system is folded into the Story Agent NL interface. Be decisive: define what each mode does + how Plan = the Aha lane + the concrete first artifact.

GROUND TRUTH:
- Unified panel modes (target): ASK = chat, no tools (/chat). PLAN = read-only code exploration + Aha PM. AGENT = full agentic loop (/agent: read/edit/run/git, WorfGate-gated).
- We ALREADY have the Aha PM tools to power Plan mode: aha:list-products/epics/features/releases, aha:get-record (read the firm→client→project→epic→story→task hierarchy), crew_sync_to_aha (crew result → story), crew_start_story (story + matching git branch in sync), aha_branch_for_story, crew_link_story_pr, crew_complete_story — all WorfGate-gated (dry-run unless confirm; audited; RAG-remembered).
- The agent-core loop exposes local tools (read/edit/run/git); the Aha tools are MCP-server tools. So "Plan mode" must surface the Aha planning toolset alongside read-only code tools.

CONVERGE ON (terse, decisive, FRUGAL):
1. Data/Riker — PLAN MODE = THE AHA LANE: define exactly what Plan mode does — browse the Aha hierarchy (read), and PROPOSE PM changes (create/update story/task, start story+branch, link PR) as GATED dry-runs the user confirms in the panel. List the tool set Plan mode exposes (read code + the Aha tools above). Reads are free; every Aha/git write stays gated.
2. Troi/Geordi — THE MODE CONTRACT + UX: a small shared definition mapping each mode → {endpoint, toolPolicy: none/read-only/full, ahaEnabled}. How the panel renders Plan: an Aha hierarchy view (firm→client→project→story) + a "propose story/branch" action that shows the dry-run before confirm. Keep it a thin client over the existing endpoints.
3. Worf — SECURITY: Plan reads are open; Plan/Agent WRITES (Aha + git) stay WorfGate-gated + audited + confirmed-in-panel; everything on OpenRouter (no Anthropic-direct).
4. Quark — cheapest path: reuse the existing Aha + lifecycle tools; cache hierarchy reads; defer inline completions. What NOT to build yet.
5. Riker — first 3 build steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "a shared mode contract where Plan routes to read-only code + the gated Aha planning tools, driving the OpenRouter loop"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
console.log('\n===== CREW FEEDBACK LOG =====');
for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} · ${c.model}]`); console.log(c.text.replace(/\n{2,}/g,'\n').trim().slice(0,400)); }
console.log('\n[PICARD · PLAN]\n' + r.missionPlan.slice(0,900) + '\n=============================');
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Plan mode = Aha PM lane (unified panel refinement)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/plan-aha-mode-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'plan-aha-mode',source:'mcp',transcript:{rounds:[{title:'plan mode aha lane',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['Plan/Agent Aha+git writes stay gated + confirmed in panel','Plan mode must surface Aha tools + read-only code tools','OpenRouter end-to-end'],finalDecision:'approved',actionItems:['shared mode contract (ask/plan/agent → endpoint/toolPolicy/ahaEnabled)','Plan = read code + gated Aha planning tools']},tags:['vscode','extension','plan-mode','aha','pm','mode-contract','parity','openrouter']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'riker',memory_type:'decision_note',title:'Plan mode = Aha PM lane: read code + gated Aha planning (story/branch/PR), in the unified Ask/Plan/Agent panel',content:r.missionPlan,tags:['extension','plan-mode','aha','mode-contract'],relates_to_crew:['data','troi','geordi','worf','quark','picard']});
console.log('MEM '+m+' COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
