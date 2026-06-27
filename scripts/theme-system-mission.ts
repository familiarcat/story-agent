import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — DESIGN a unified, MODULAR theme system so the UI theme is USER-SELECTABLE beyond LCARS (light, dark, and other VS Code-style themes), and define a DEFAULT THEME TEMPLATE that LCARS and others fill in. Be decisive: define the token contract + how a theme is added + the first artifact. Don't boil the ocean.

GROUND TRUTH (verified in the repo just now):
- No Tailwind. Plain CSS: app/globals.css has a light card/badge/btn system; pages use inline styles.
- LCARS already exists: lib/lcars.ts (hardcoded hex palette) + components/Lcars.tsx primitives (<LcarsScreen>/<LcarsPanel>/<LcarsButton>/<LcarsStat>/<LcarsBar>) + LCARS NavBar + LCARS home + /cost reskinned. These currently hardcode lcars hex — they must move to theme variables.
- layout.tsx wraps <NavBar/> + <main>. 12 pages: /, /agent, /chat, /cost, /learnings, /dashboard, /sprint, /crew/memories, /observation-lounge, /docs, /story/[storyId], /story/new.
- Crew already ruled (RAG MEM 49) that pages reskin THROUGH shared primitives, dark-ground legibility ≥4.5:1, no off-palette hardcodes.

CONVERGE ON (terse, decisive, FRUGAL):
1. Data/Geordi — THE TOKEN CONTRACT (the "default theme template"): a flat set of SEMANTIC CSS variables every theme defines — e.g. --bg, --surface, --panel, --text, --text-dim, --accent1..4, --danger, --ok, --border, --radius, --radius-elbow, --font. Themes are just a values map for these (like a VS Code color theme). Define the variable names + what each means. LCARS = one theme (elbow radii, neon palette); "dark" + "light" = other instances. Specify HOW a new theme is added (one object/[data-theme] block, no component changes).
2. Geordi — DELIVERY MECHANISM: CSS variables scoped by [data-theme="lcars|dark|light"] in globals.css (default = a sensible base), a ThemeProvider (client) that sets data-theme on the root + persists choice (localStorage), and a small theme switcher in the NavBar. Primitives consume var(--*) so they are THEME-NEUTRAL (rename Lcars* → themed primitives, or keep names but variable-driven — decide).
3. Troi/Yar — UX + ACCESSIBILITY: the switcher placement; each shipped theme must pass contrast on its own ground; a check/lint that bans raw hex in page files (must use tokens). Keep data legible across themes.
4. Quark — CHEAPEST path: tokens + provider + 3 themes ONCE; pages reskin through primitives/classes; adding a theme = one values block, zero component edits. What NOT to do yet (no per-component theming, no animation).
5. Riker — first 3 steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "theme token contract + ThemeProvider + switcher shipped; lcars/dark/light selectable; primitives variable-driven; one page proves the switch"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Modular theme system (user-selectable; LCARS = one theme)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/theme-system-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'theme-system',source:'mcp',transcript:{rounds:[{title:'theme system',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['contrast per theme','ban raw hex in pages','adding a theme = one values block'],finalDecision:'approved',actionItems:['Ship token contract + ThemeProvider + switcher; make primitives variable-driven; lcars/dark/light selectable']},tags:['ui','theme','css-variables','modular','lcars','light','dark','user-selectable']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'Modular theme system — semantic CSS-variable token contract; themes are values maps; LCARS=one theme; ThemeProvider+switcher',content:r.missionPlan,tags:['ui','theme','css-variables','modular'],relates_to_crew:['geordi','troi','yar','quark','riker','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
