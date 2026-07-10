import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — DESIGN the unified navigation: ONE Next.js dashboard HOME that routes (via our routing) to a DYNAMIC UI↔Aha! API PARITY layer — so every Aha resource has a matching local API route + UI route generated from a single manifest, instead of hand-built one-offs. Be decisive: define the parity manifest + the first shippable artifact. Don't boil the ocean.

GROUND TRUTH (verified in the repo just now):
- UI (packages/ui/src/app): home page.tsx is thin (49 lines); dashboard/page.tsx (325 lines); layout.tsx + components/NavBar.tsx are the shell. Surfaces today: / , /agent (Claude-Code-grade loop), /chat, /cost, /learnings, /observation-lounge, /sprint, /story/[storyId], /story/new, /crew/memories, /dashboard, /docs.
- UI↔Aha today is HAND-BUILT: 8 routes under /api/aha/* (hierarchy, roadmap, sprints, projects, stories, story, sprint-stories, observation-lounge) — NOT generated, NOT full parity.
- Server-side Aha integration: aha-tools.ts (10 MCP tools) wraps the Aha REST API; writes are Worf-gated (dry-run review + confirm:true + audit), reads open.
- Aha concept map (docs/setup/aha-nomenclature.md): familiarcat FIRM → Client → Project(=Aha Initiative) → Epic → Story(=Aha Feature) → Task(=Aha Requirement); Sprint = Aha Release. Clients are DB rows (never hardcoded).
- Everything runs on the OpenRouter crew; the agent-core /agent loop + WorfGate + RAG are the spine; the VS Code extension + web portals consume the same endpoints.

CONVERGE ON (terse, decisive, FRUGAL):
1. Troi/Riker — THE SINGLE HOME + IA: design ONE dashboard home that is the entry to everything, with a coherent grouped nav (e.g. Build / Plan / Observe) mapping the existing surfaces. What lives on the home (hierarchy: firm→client→project→epic→story→task + live status) vs. behind routes. Keep it one home, one nav, one routing table.
2. Data/Geordi — THE DYNAMIC PARITY MANIFEST: define a single declarative manifest mapping each Aha RESOURCE (firm/client/project/epic/story/task/sprint) → its (a) local API route (/api/aha/<resource>) and (b) UI route, generated from the manifest rather than hand-written. Specify the manifest shape (resource name, Aha primitive, parent, read tool, write tool, fields) and HOW routes are generated from it (a route factory + a [resource] dynamic segment). Reuse aha-tools.ts — don't re-implement the Aha client.
3. Worf — SECURITY of the parity layer: reads open, WRITES stay gated (dry-run + confirm + audit) exactly as aha-tools does today. Client-scope isolation must hold across generated routes. Any blocker.
4. Quark — CHEAPEST path: generate from ONE manifest (no per-route duplication); cache hierarchy reads; what NOT to build yet (defer exotic Aha endpoints).
5. Riker — first 3 steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "the parity manifest drives at least one resource's API + UI route, replacing a hand-built one, with writes still gated"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Unified nav: single dashboard home ↔ dynamic UI/Aha API parity','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/unified-nav-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'unified-nav',source:'mcp',transcript:{rounds:[{title:'unified nav + aha parity',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['writes stay Worf-gated across generated routes','client-scope isolation in dynamic routes','defer exotic Aha endpoints'],finalDecision:'approved',actionItems:['Build parity manifest → generate one resource API+UI route (replace a hand-built one)']},tags:['ui','nav','dashboard','aha','api-parity','manifest','routing']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'Unified nav: single dashboard home + a declarative manifest generating UI↔Aha API parity routes (reuse aha-tools; writes gated)',content:r.missionPlan,tags:['ui','nav','aha','api-parity','manifest'],relates_to_crew:['troi','riker','geordi','worf','quark','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
