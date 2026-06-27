import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

/**
 * (1) Cross-check the Snyk UI/UX MCP picks CONSTRAINED to the 14-item list (anti-drift) with per-role
 * WorfGate verdicts, and (2) design the CREW STATUS FEED → Aha! auto-maintained stories pipeline.
 * Prints every officer's contribution = the crew's own feedback log (relayed to the operator), and
 * catalogs the clean list-faithful picks as crew-wide tool-cards in RAG.
 */
const SNYK_14 = [
  'Cursor Talk to Figma MCP', 'Framelink Figma MCP', 'Figma MCP (Chunking)', 'Figma-to-React Converter',
  'Framer Plugin MCP', 'Illustrator MCP', 'MCP-Miro', 'Photoshop Python API MCP', 'Playwright MCP',
  'MCP Selenium', 'Vibe-Eyes', 'Storybook MCP', 'MCP Server Flutter', 'MCP-Toolbox',
];

(async () => {
const BRIEF = `Observation Lounge — TWO tasks. Be terse + decisive.

TASK 1 — CONSTRAINED re-evaluation (anti-drift): pick ONLY from THIS list of 14 MCP servers (do NOT introduce any tool not on it): ${SNYK_14.join('; ')}. For each crew member that benefits (troi=UX/design, yar=testing, riker=code-gen, uhura=docs), name their 1-2 picks FROM THE LIST, and give Worf's WorfGate verdict per pick: approved / review / blocked. Reminder: token tools (Figma/Miro) = REVIEW (route tokens through the WorfGate broker); early-dev (Photoshop) = REVIEW; MCP-Toolbox (many third-party keys) = REVIEW/blocked (supply-chain); all stay human-gated for execution. Do NOT recommend Postgres/Trivy/LocalStack etc. — they are NOT on the list.

TASK 2 — CREW STATUS FEED → AHA: design how the crew's LIVE status/feedback (what each officer is working on + results from missions/agent runs) becomes a feedback log the operator sees AND that auto-maintains Aha! stories. Cover: (a) Uhura — what a crew status entry contains (officer, activity, result, mission ref, cost) and how it streams to the chat; (b) Data/Riker — mapping a crew result → an Aha story create/update under firm→client→project→story; (c) Worf — Aha writes stay gated (dry-run + confirm + audit), the crew proposes, a human confirms; (d) the first artifact: a function that turns one crew mission result into an Aha story draft (title, body, status) WITHOUT writing yet. Picard: the single first build step. "Make it so."`;
const r = await runMissionPipeline(BRIEF);

// CREW FEEDBACK LOG (relayed to the operator).
console.log('\n========== CREW STATUS / FEEDBACK LOG ==========');
for (const c of r.contributions) {
  console.log(`\n[${c.crewId.toUpperCase()} · ${c.model} · $${Number(c.costUSD).toFixed(5)}]`);
  console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 480));
}
console.log('\n[PICARD · PLAN]');
console.log(r.missionPlan.slice(0, 700));
console.log('================================================\n');

const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Snyk picks (constrained) + crew status-feed → Aha','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/crew-aha-feedback-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);

const obs=await storeObservationMemory({storyId:'crew-aha-feedback',source:'mcp',transcript:{rounds:[{title:'crew status feed + aha + constrained snyk',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['Aha writes gated (dry-run+confirm+audit)','constrain crew picks to provided list','token tools via WorfGate broker'],finalDecision:'approved',actionItems:['build crew-status feed → Aha story draft (no write)','register list-faithful picks via submit_tool_for_evaluation']},tags:['crew','status-feed','aha','live-feedback','mcp','snyk','worfgate','anti-drift']});
console.log('OBS '+obs.id+' emb='+embeddingSource());

// Catalog the clean, list-faithful, role-relevant picks as crew-wide tool-cards (human-gated).
const CARDS = [
  { name: 'Playwright MCP', owner: 'yar', cat: 'testing', clearance: 'approved', why: 'structured browser automation for QA' },
  { name: 'Storybook MCP', owner: 'uhura', cat: 'documentation', clearance: 'approved', why: 'LLM access to component docs' },
  { name: 'Cursor Talk to Figma MCP', owner: 'troi', cat: 'design', clearance: 'review', why: 'read/modify Figma via NL (Figma token via WorfGate broker)' },
];
for (const c of CARDS) {
  const text = `TOOL-CARD ${c.name} [${c.cat}] owner=${c.owner} clearance=${c.clearance} source=snyk-ui-ux\nUse when: ${c.why}\nInvoke: Human-gated — configure the MCP server, then the crew may call its tools (autoExecute=false).`;
  await storeObservationMemory({storyId:`tool-card:${c.name}`,source:'mcp',transcript:{rounds:[{title:`tool-card:${c.name}`,entries:[{speakerId:c.owner,position:'support',statement:text,evidence:[c.cat,'snyk',`clearance:${c.clearance}`]}]}],consensusSummary:text,unresolvedRisks:c.clearance!=='approved'?['execution human-gated; token via WorfGate broker']:[],finalDecision:'approved',actionItems:['register via submit_tool_for_evaluation']},tags:['tool-card',c.cat,`owner:${c.owner}`,'snyk','crew-wide',`clearance:${c.clearance}`]});
  console.log('tool-card stored:', c.name);
}
const m=await storeCrewPersonalMemory({crew_id:'uhura',memory_type:'decision_note',title:'Crew status feed → Aha auto-maintained stories (design) + constrained Snyk picks',content:r.missionPlan,tags:['crew','status-feed','aha','live-feedback'],relates_to_crew:['data','riker','worf','troi','yar','picard']});
console.log('MEM '+m+' COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
