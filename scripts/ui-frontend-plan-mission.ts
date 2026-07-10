import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — PLAN THE FRONT-END REPRESENTATION now that the infra/backend is integrated and the SSE contract is stable. Be decisive: rank the gaps + sequence the work, don't list everything.

GROUND TRUTH (verified in the repo just now):
- The backend boundary is FROZEN + documented: docs/architecture/agent-sse-contract.md. POST /agent streams typed AgentEvents (model, lens, text, tool_call, gate, tool_result, escalation, retry, cost, error) + terminal done (AgentRunResult). Approvals: gate frame with needsApproval+approvalId -> POST /agent/approve {id,decision}, Redis-brokered (TLS cutover runbook ready), auto-deny after 180s. Also GET /cost, /learnings, /symphony.
- The UI ALREADY EXISTS and is fairly complete: packages/ui/src/app/agent/page.tsx (275 lines) streams via /api/agent/stream with requireApproval:true and renders: model badge, streamed text, tool_call cards, gate chips WITH working Approve/Deny buttons, tool_result cards (with a colored unified-diff view for git_diff/apply_patch), cost, done + session cost. Proxy routes exist: /api/agent/stream, /api/agent/approve (browser never holds the service token).
- Known UI gaps (raw — you decide what matters): escalation/retry/lens/error event rendering may be incomplete; session-cost aggregation only sums on 'done' (the 'cost' event adds 0 — a real-time running total is missing); NO file tree / workspace view; NO surfacing of /cost, /learnings, /symphony as live panels; inline styles (no shared design system / tokens); no token-by-token streaming feel; no error banner UX; no per-client (clientId) selector; VS Code extension may not yet consume the unified surface.

CONVERGE ON (terse, decisive, FRUGAL):
1. Troi/Geordi: map EVERY AgentEvent type from the contract to its UI component/state, and mark which are DONE vs MISSING/WEAK in page.tsx today. Output a compact event->component coverage table.
2. Geordi: the MVP refinement — the smallest set of changes that makes /agent feel like a complete Claude-Code-grade surface (prioritize the running cost ticker, complete escalation/retry/lens/error rendering, and an error banner). Exact files + what each renders.
3. Worf: the front-end security floor — the browser must NEVER hold AGENT_SERVICE_TOKEN (proxy attaches it), approvals must stay explicit (no silent auto-approve), and clientId scoping must be honored. Any blocker before we expand the UI.
4. Quark: cheapest-highest-leverage ordering; what NOT to build yet (defer the full file tree + /symphony panel if the core loop UX isn't polished). Keep it lean.
5. Data/Yar: the most valuable UI test (component or playwright) — what failure would hurt most (e.g., an approval that never resolves, or cost shown wrong).
6. Riker: sequence into the first 3 concrete actions. Picard ends with the SINGLE next action + its acceptance check. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Front-end representation plan (/agent UI)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/ui-frontend-plan-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'ui-frontend-plan',source:'mcp',transcript:{rounds:[{title:'ui frontend plan',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['incomplete event rendering (escalation/retry/lens/error)','no real-time cost ticker','no shared design system','token must never reach browser'],finalDecision:'approved',actionItems:['Execute /agent UI refinement plan against the frozen SSE contract']},tags:['ui','frontend','agent','sse','design','roadmap']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'troi',memory_type:'decision_note',title:'/agent front-end representation plan — event->component coverage + MVP refinement',content:r.missionPlan,tags:['ui','frontend','agent','sse'],relates_to_crew:['geordi','worf','quark','data','yar','riker','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
