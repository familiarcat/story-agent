import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — EVALUATE these 14 MCP servers (scraped from Snyk's "MCP servers for UI/UX engineers") and decide which each crew member should ADD to their MCP toolset, GATED by the WorfGate security standard. Be decisive: per-role shortlist + a WorfGate verdict per tool.

THE 14 MCP SERVERS (name — what it does — category — security flag):
1. Cursor Talk to Figma — read/modify Figma via NL — design — (none noted)
2. Framelink Figma MCP — bridges Figma files to coding tools — design — requires Figma API token
3. Figma MCP (Chunking) — large Figma files via chunking/pagination — design — requires Figma API token
4. Figma-to-React Converter — Figma → React components (a11y + Tailwind) — design/code-gen — requires Figma API token
5. Framer Plugin MCP — build/manage Framer plugins, web3 — design/web3 — (none noted)
6. Illustrator MCP — drive Adobe Illustrator via JS — design — macOS-only, needs Illustrator
7. MCP-Miro — Claude ↔ Miro whiteboards — design/collaboration — requires Miro OAuth token
8. Photoshop Python API MCP — programmatic Photoshop — design — EARLY DEVELOPMENT
9. Playwright MCP — structured browser automation — testing/browser — (none noted)
10. MCP Selenium — Selenium WebDriver automation — testing/browser — (none noted)
11. Vibe-Eyes — visual context for LLMs (canvas capture) — testing/browser — (none noted)
12. Storybook MCP — LLM access to component info/docs — documentation/component-lib — (none noted)
13. MCP Server Flutter — interact with Flutter apps — code-gen/mobile — (none noted)
14. MCP-Toolbox — multi-tool: files, Figma, audio, web search, image-gen — utility/multi-domain — MANY third-party API keys (Figma, Tavily, DuckDuckGo, Flux)

OUR CREW ROLES (who would want what): troi (stakeholder/UX), yar (quality/testing), riker (implementation), data (architecture), geordi (infrastructure/automation), uhura (docs/comms), worf (security), quark (cost).

CONVERGE ON (terse, decisive, FRUGAL):
1. Troi/Yar/Riker/Data — PER-ROLE SHORTLIST: for each crew member, which 1-3 of these 14 they'd add and why (map by role: design tools→Troi; browser/testing→Yar; code-gen/Flutter/Figma-to-React→Riker; multi-tool/web-search→Data; automation→Geordi; Storybook docs→Uhura).
2. Worf — WORFGATE VERDICT per tool: approved / review / blocked, by the security standard. Weigh: API-token tools (Figma/Miro) = token handling via WorfGate broker, REVIEW; EARLY-DEVELOPMENT (Photoshop) = REVIEW/blocked; local-app drivers (Illustrator/Photoshop) = sandbox risk; MCP-Toolbox pulling MANY third-party keys = highest supply-chain risk → REVIEW or BLOCKED. ALL discovered servers stay human-gated for execution. State which PASS the WorfGate floor.
3. Quark — COST: free/self-hosted vs token/usage cost; cheapest adequate picks.
4. Picard — the FINAL per-crew approved shortlist (only tools meeting the WorfGate standard, execution human-gated). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — UI/UX MCP servers (Snyk) per-crew + WorfGate verdicts','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/snyk-mcp-tools-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'snyk-mcp-tools',source:'mcp',transcript:{rounds:[{title:'snyk ui/ux mcp tools eval',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['API-token tools need WorfGate broker','MCP-Toolbox many third-party keys = supply-chain risk','all discovered servers human-gated for execution'],finalDecision:'approved',actionItems:['register WorfGate-approved tools via submit_tool_for_evaluation; teach crew-wide tool-cards']},tags:['mcp','ui-ux','snyk','tool-discovery','worfgate','per-role','design','testing']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'troi',memory_type:'insight',title:'UI/UX MCP servers (Snyk) — per-crew shortlist + WorfGate verdicts (Figma/Playwright/Storybook etc.)',content:r.missionPlan,tags:['mcp','ui-ux','snyk','tool-discovery','worfgate'],relates_to_crew:['yar','riker','data','geordi','uhura','worf','quark','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
