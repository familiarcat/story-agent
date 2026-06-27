import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — DESIGN a git branching system that mirrors the Aha! story structure so the crew can AUTOMATE branches alongside Aha stories. Be decisive: define the naming convention + lifecycle triggers + the first artifact.

GROUND TRUTH (verified in the repo):
- Aha hierarchy (docs/aha-nomenclature.md): familiarcat FIRM → Client → Project (=Aha product; reference prefix e.g. PROD=Story Agent, JONAH, BAYER) → Epic → Story (=Aha Feature; reference e.g. PROD-17) → Task (=Aha Requirement). Sprint=Release.
- Existing capabilities: crew_sync_to_aha (crew result → gated Aha story create), linkAhaStoryToPR (link a story ↔ a PR URL), updateAhaStoryStatus (advance workflow status), aha read/write tools (Worf-gated: dry-run/confirm/audit), and agent-core git tools (git_status/git_diff/run_shell). The crew works on main and wants pushes to trigger CI (audit-check + deploy plan).

CONVERGE ON (terse, decisive, FRUGAL):
1. Data/Riker — BRANCH NAMING CONVENTION derived from Aha refs. Define exact patterns mapping the hierarchy → branch names, e.g. story → 'story/<REF>-<kebab-slug>' (story/PROD-17-redis-tls), task → 'task/<STORY_REF>.<n>-<slug>', and how project prefix (PROD/JONAH) namespaces them. State the slug rules (lowercase, hyphen, max length, strip punctuation) and the base branch (main).
2. Riker/O'Brien — LIFECYCLE TRIGGERS: the automated flow tying git ↔ Aha — (a) story enters "in progress" → create branch from main; (b) first commit/PR opened → linkAhaStoryToPR + move story to a "PR open" status; (c) PR merged → updateAhaStoryStatus to done + delete branch. Which are auto vs human-gated.
3. Worf — SAFETY: branch ops never force-push / never touch main destructively (WorfGate green/yellow/red); creating/deleting branches is bounded; writes to Aha stay gated. What is a blocker.
4. Quark — CHEAPEST: derive branch names purely (no LLM), cache the story↔branch mapping; don't re-query Aha each time. What NOT to build yet (defer multi-task worktrees).
5. Riker — first 3 steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "a pure ahaRefToBranchName() + an MCP tool that, given an Aha story ref, derives + creates the branch from main, WorfGate-safe"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
console.log('\n===== CREW FEEDBACK LOG =====');
for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} · ${c.model}]`); console.log(c.text.replace(/\n{2,}/g,'\n').trim().slice(0,420)); }
console.log('\n[PICARD · PLAN]\n' + r.missionPlan.slice(0,800));
console.log('=============================\n');
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Git branching ↔ Aha story structure','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/git-aha-branching-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'git-aha-branching',source:'mcp',transcript:{rounds:[{title:'git branching aha',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['branch ops never force-push/touch main','Aha writes gated','defer worktrees'],finalDecision:'approved',actionItems:['ahaRefToBranchName() + MCP tool to create story branch from main (gated)']},tags:['git','branching','aha','automation','story-structure','worfgate']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'riker',memory_type:'decision_note',title:'Git branching ↔ Aha: story/<REF>-<slug> convention + lifecycle triggers (branch↔story↔PR), WorfGate-safe',content:r.missionPlan,tags:['git','branching','aha','automation'],relates_to_crew:['data','obrien','worf','quark','picard']});
console.log('MEM '+m+' COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
