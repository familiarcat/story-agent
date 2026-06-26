import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge: the operator wants Claude Code (Anthropic) prompts to cost LESS by leaning on OUR OpenRouter/Quark crew. Diagnose WHY it doesn't happen automatically today and design the architecture that actually cuts the cost.

GROUND TRUTH (do not contradict — this is how it really works):
- This Claude Code session's INFERENCE runs on Anthropic's servers (or the configured Anthropic endpoint). A CLAUDE.md / repo instruction CANNOT change which model THIS session runs on. There is NO automatic mechanism that "routes Claude Code tokens into OpenRouter." So today: the first tokens spent on any prompt are Anthropic (Claude Code) tokens, by construction.
- Our crew (Picard..Quark) runs SEPARATELY on OpenRouter via quarkSelectModel (cheapest adequate model: DeepSeek/Llama/OpenAI tiers; Anthropic only tier-4). The crew is reachable as: runMissionPipeline / run_crew_mission_pipeline (deliberation), the /agent SSE loop + story-agent CLI (agentic coding), and the deployed crew server (ALB: /chat, /agent, /cost, /aha/*).
- So there are TWO distinct cost levers, NOT one:
  (A) DELEGATION (works today, no new code): keep Claude Code THIN — it orchestrates (decide, dispatch, verify) and hands the token-heavy work (analysis, deliberation, multi-step coding) to the crew via the MCP tools / /agent loop. Anthropic spend drops because the expensive session does less heavy lifting. This is already the repo's dogfooding mandate, but it is invoked MANUALLY per task.
  (B) PROXY REDIRECTION (not built): stand up an Anthropic-Messages-API-compatible proxy in front of OpenRouter+Quark, then set Claude Code's ANTHROPIC_BASE_URL to it. Then Claude Code's OWN inference physically flows through OpenRouter and Quark's complexity/cost selector. This literally makes "Claude Code prompts route into OpenRouter." Risk: feature parity (tool-use, streaming, prompt caching, system-prompt shape) — Claude Code may break if the proxy is not faithful.

CONVERGE ON:
1. Picard/Data: state plainly which lever the operator is actually asking for, and which is achievable + safe. Correct the misconception (no auto-routing exists) without hand-waving.
2. Geordi: for lever (A), how do we make delegation more AUTOMATIC instead of manual? (e.g. a Claude Code hook / wrapper that, on each substantive prompt, fires the crew first and feeds the result back; a thin "always ask the crew" reflex.) Concrete + repo-grounded.
3. Riker/Geordi: for lever (B), the real build: an Anthropic-/v1/messages-compatible shim that translates to OpenRouter chat-completions, runs quarkSelectModel for complexity/cost routing, preserves tool-use + streaming. Where it lives, how Claude Code points at it (ANTHROPIC_BASE_URL), the parity risks, and a go/no-go.
4. Quark: the actual cost math. For a typical Claude Code task, estimate Anthropic-direct $ vs (A) delegation $ vs (B) proxy $. Which lever yields the biggest verified savings, and the break-even.
5. Worf: security — a proxy sees every prompt + Anthropic-style traffic; credential brokering, audit, client isolation. Governance floor.
6. Troi: operator experience — they expect "cheaper automatically." What is the least-surprising path that delivers that feeling.
Picard ends with an ORDERED, decisive recommendation: pick (A), (B), or both-in-sequence, with the first 3 concrete steps. FRUGAL + terse.`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Cutting Claude Code cost via the OpenRouter/Quark crew','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/cc-cost-routing-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'cc-cost-routing',source:'mcp',transcript:{rounds:[{title:'claude code cost routing',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['proxy feature parity (tool-use/streaming/caching)'],finalDecision:'approved',actionItems:['Decide delegation-automation vs Anthropic-compatible Quark proxy']},tags:['cost','claude-code','openrouter','quark','routing','proxy']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'quark',memory_type:'decision_note',title:'How to actually cut Claude Code cost via the OpenRouter/Quark crew (delegation vs proxy)',content:r.missionPlan,tags:['cost','claude-code','openrouter','proxy'],relates_to_crew:['picard','geordi','riker','worf','troi','data']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0); // work done — exit promptly instead of hanging on open DB/socket handles
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
