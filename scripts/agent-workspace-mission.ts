import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — make the Story Agent UI a FULL Claude-Code-grade coding assistant that runs entirely on our OpenRouter/Quark crew. Design the gap closure + the first shippable artifact.

GROUND TRUTH (verified in the repo just now):
- agent-core ALREADY IS a Claude-Code-equivalent agentic loop on a Quark-selected OpenRouter model. Tools: read_file, write_file, edit_file, apply_patch, list_dir, search_code, run_shell, git_status, git_diff, rag_recall, crew_deliberate. WorfGate green/yellow/red governs local ops.
- It is exposed as an SSE endpoint: POST /agent on the crew server (also story-agent CLI). The SSE stream emits typed events: model (which OpenRouter model Quark picked), text (assistant reasoning), tool_call (read/edit/run/search/git), gate (WorfGate approval needed), tool_result, cost (running spend), escalation, retry, lens, done, error.
- The Next.js UI (packages/ui) has: /chat (+ /api/chat, /api/chat/stream proxy to the crew server), /dashboard, /cost, /learnings, /sprint, /observation-lounge, /crew/memories. It has NO /agent page and NO /api/agent route. So the entire agentic CODING surface (file tree, code view, diffs, tool-call stream, approvals, run output) is MISSING from the web UI — chat is the only LLM surface.
- Pattern to reuse: the UI proxies SSE to the crew server via a Next route handler (api/chat/stream) using STORY_AGENT_AGENT_URL (cloud ALB) with localhost fallback. The deployed crew server already routes /agent on the ALB.

CONVERGE ON (terse, decisive, FRUGAL):
1. Data/Geordi — GAP TABLE: for each Claude Code capability (stream reasoning, tool-call read/edit/run, file tree, diff review+apply, shell run output, approvals, model/cost visibility, multi-turn, RAG/codebase understanding), state: agent-core support (yes — which tool/event) and UI support today (mostly none). Identify the MVP subset.
2. Geordi/Troi — THE FIRST ARTIFACT (MVP): the smallest shippable thing that proves a Claude-Code-grade loop in the browser on OpenRouter. Recommend: a /agent page + /api/agent/stream proxy route that POSTs to the crew server /agent and renders the SSE transcript (model badge, streamed text, tool_call/tool_result cards, cost). Give exact file paths (packages/ui/src/app/agent/page.tsx, packages/ui/src/app/api/agent/stream/route.ts) and what each renders. Defer the rich code editor/diff-apply UI to Wave 2.
3. Worf — SECURITY: the UI now triggers real file edits + shell via agent-core. The gate events MUST surface as explicit approve/deny in the UI (no silent yellow/red auto-run from the browser). Client isolation + audit. The governance floor for a browser-driven agent.
4. Quark — COST: surface the model + running cost per session (the cost event) so the operator SEES the OpenRouter savings live. Keep the proxy thin.
5. Yar — QUALITY/UX acceptance: what must work for the MVP to count as "Claude Code in the UI" (send prompt → see model picked → see tool calls stream → see result → see cost).
6. Riker — ordered first 3 steps. Picard ends with the SINGLE artifact to build first + its acceptance check. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Story Agent UI as a full Claude-Code-grade agent (on OpenRouter)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/agent-workspace-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'agent-workspace-ui',source:'mcp',transcript:{rounds:[{title:'agent workspace ui',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['browser-triggered file/shell edits (Worf gate)','quality parity with native Claude Code'],finalDecision:'approved',actionItems:['Ship /agent page + /api/agent/stream proxy (MVP agentic loop in UI)']},tags:['ui','agent-core','coding','openrouter','claude-code','sse']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'geordi',memory_type:'decision_note',title:'Story Agent UI = full Claude-Code-grade agent on OpenRouter (gap + MVP /agent page)',content:r.missionPlan,tags:['ui','agent-core','coding','openrouter'],relates_to_crew:['data','troi','worf','quark','yar','riker','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0); // clean exit — work done; don't hang on open handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
