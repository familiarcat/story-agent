import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge: AGREE on a BOUNDED v1 feature set for the Story Agent VS Code extension so it can REPLACE Claude Code as the user's daily AI coding assistant ASAP — reducing cost (OpenRouter/Quark vs Anthropic) and optimizing results. Decide the MINIMUM must-have features for daily-driver parity, ranked, with a crisp definition-of-done. We ALREADY have: chat participant, /agent autonomous loop (read/edit/apply_patch/shell/search/git over agent-core), /plan, /review, /prepare (Aha story), /symphony, token-optimizing /ask, cost+WorfGate. Candidate gaps: @context providers (@file/@codebase/@story/@memory), inline chat (Ctrl+I), multi-file apply diff review UI, inline completions (defer?), Aha story tree. For EACH: must-have-for-v1 vs defer, and why. Output a ranked v1 checklist + what to PHYSICALLY TEST first. Owners: Geordi(extension), Data(arch), Troi(UX), Riker(seq), Quark(cost), Worf(security), Picard(command). Picard ends with the agreed v1 checklist + a physical test plan. Be decisive and terse — speed matters.`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — VS Code v1 Feature Set (replace Claude Code)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — agreed v1 + test plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/vscode-v1-featureset-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'vscode-v1-featureset',source:'mcp',transcript:{rounds:[{title:'v1 feature set',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:[],finalDecision:'approved',actionItems:['Implement v1 checklist; physically test']},tags:['vscode','v1','daily-driver','parity','claude-code-replacement']});
console.log('OBS '+obs.id+' embeddings='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'geordi',memory_type:'decision_note',title:'VS Code extension v1 feature set (replace Claude Code daily driver)',content:r.missionPlan,tags:['vscode','v1','parity'],relates_to_crew:['troi','data','riker','quark','picard']});
console.log('MEM '+m);
process.exit(0); // clean exit — work done; don't hang on open handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
