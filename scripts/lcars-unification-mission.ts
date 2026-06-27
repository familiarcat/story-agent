import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — RULE on unifying the LCARS design motif across ALL web viewership so the Story Agent and every web surface share one identity. Be decisive: sequence the rollout + define the shared tokens contract. Don't boil the ocean.

GROUND TRUTH (verified in the repo just now):
- LCARS tokens exist: packages/ui/src/lib/lcars.ts (canonical palette in multiples of 0x33: neon-carrot, golden-tanoi, lilac, anakiwa, eggplant; black ground; CREW_ROSTER; RAIL_COLORS).
- Home (app/page.tsx) is now a FULL LCARS dashboard (elbow header, left nav rail, hierarchy strip, domain panels, crew roster).
- Shared NavBar (components/NavBar.tsx) is now LCARS (black banner + neon-carrot elbow brand + domain-grouped links) — inherited by every page via layout.tsx.
- NOT yet converted: the data pages still use light cards/inline styles — /agent, /chat, /cost, /learnings, /dashboard, /sprint, /crew/memories, /observation-lounge, /story, /docs. They clash with the LCARS shell.
- Design law (LCARS guideline): rounded "elbow" frames, black ground, condensed all-caps labels, <6 main colors, strict margins.

CONVERGE ON (terse, decisive, FRUGAL):
1. Troi/Geordi — SHARED TOKENS CONTRACT: what every page MUST consume from lib/lcars.ts (ground=black, panel(), panelTitle(), rail buttons, tier/role colors) so pages can't drift. Define a small set of reusable LCARS primitives (e.g. <LcarsPanel>, <LcarsButton>, <LcarsScreen>) to extract so each page is a thin re-skin, not a bespoke rebuild.
2. Riker — ROLLOUT ORDER: which pages first (highest-traffic / most-visible: /agent the hub, then /cost + /learnings, then the rest), and how to convert a light "card" page to LCARS panels WITHOUT losing readability (dark ground, tanoi text, colored elbow headers, keep data legible).
3. Worf/Yar — QUALITY/ACCESSIBILITY floor: contrast on black, don't sacrifice legibility for theme; keep approve/deny + cost numbers readable. A test or check that prevents a page shipping with off-palette hardcoded colors.
4. Quark — CHEAPEST path: extract shared primitives ONCE; each page becomes a thin reskin; defer pixel-perfect LCARS animation. What NOT to do yet.
5. Riker — first 3 steps. Picard ends with the SINGLE next artifact + acceptance check (e.g. "shared LCARS primitives extracted + one data page (/cost) reskinned to the motif using only lcars tokens"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — LCARS motif unification across web viewership','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/lcars-unification-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'lcars-unification',source:'mcp',transcript:{rounds:[{title:'lcars unification',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['legibility on black ground','off-palette hardcoded colors','defer LCARS animation'],finalDecision:'approved',actionItems:['Extract shared LCARS primitives; reskin pages in rollout order']},tags:['ui','lcars','design','motif','unification','web']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'troi',memory_type:'decision_note',title:'LCARS motif unification — shared lcars primitives + page reskin rollout order',content:r.missionPlan,tags:['ui','lcars','design','motif'],relates_to_crew:['geordi','riker','worf','yar','quark','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
