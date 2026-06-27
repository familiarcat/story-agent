import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — DESIGN three crew-autonomy capabilities learned from this session. Be decisive: define each mechanism + the first artifact. Don't boil the ocean.

GROUND TRUTH (verified this session):
- Dogfooding is mandated (CLAUDE.md) + a delegation-router hook scores prompts DELEGATE and routes substantive work to the crew. The crew runs on OpenRouter (Quark cost-optimized); Claude Code (Anthropic) is meant to ORCHESTRATE only.
- agent-core loop (loop.ts): per-turn Quark model; tools (read/edit/run/search/git); WorfGate green/yellow/red; SSE events model/lens/text/tool_call/gate/tool_result/cost/escalation/retry/done/error; opt-in interactive approvals (requireApproval + approval-registry, Redis pub/sub, auto-deny 180s); recordFeedback writes a self-learning card to RAG per run.
- OBSERVED FAILURE: when dispatched to do edits, the loop sometimes STALLS on the finish/iterate step — it (a) auto-escalates because the prompt is >600 chars or hits an ESCALATION_SIGNAL, runs the full mission pipeline, then the model replies with TEXT and calls 0 tools so the loop finalizes having done nothing; or (b) emits "Let's start by reading the file..." text with 0 tool calls; or (c) stops to ASK permission instead of executing. Twice the orchestrator had to finish the last edit by hand.

CONVERGE ON (terse, decisive, FRUGAL):
1. Picard/Quark — CREW-FIRST DEFAULT (ask #1): how Claude Code should DEFAULT to the OpenRouter crew when available to minimize direct Anthropic tokens — what stays on Anthropic (thin orchestration: dispatch + verify + final-mile when the loop stalls) vs. what MUST go to the crew (all authoring/analysis). Concrete: strengthen the delegation-router default + a CLAUDE.md "crew-first" rule. Define the rule crisply.
2. Uhura/Troi — LIVE FEEDBACK + ASK-FIRST AUTONOMY (ask #2): a methodology where the crew gives LIVE feedback in logs (what is the crew doing, streamed) AND human-in-the-loop approvals that are ASK-FIRST, then LEARN which operations to auto-approve over time (approval history -> suggested autonomy rules). Reuse SSE events + WorfGate tiers + approval-registry + recordFeedback. Define: what gets logged live, the ask-first default, and how approvals graduate to autonomous (e.g., after N approvals of the same op-class, propose auto-approve; Worf must sign off).
3. Data/Geordi/Yar — SELF-HEALING STALL DETECTION (ask #3): detect when the loop stalls on finish/iterate (finalized with 0 tool calls on an actionable task / asked-permission / escalation-then-no-tools), RECORD it to RAG as a stall card, and AUTO-REMEDIATE in-loop (e.g., a corrective nudge "you described a plan but called no tools — execute now" + bounded retries; don't let long prompts force escalation-into-inaction). Then the crew periodically RESEARCHES recorded stalls and proposes a fix themselves. Define the detection signal + the in-loop remediation + the research loop.
4. Worf — SECURITY floor: ask-first stays the default; auto-approval graduation requires Worf sign-off + stays revocable; self-healing nudges never bypass WorfGate.
5. Riker — first 3 build steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "loop detects a 0-tool-call stall on an actionable task, records it, and self-nudges to execute"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Crew autonomy: crew-first default · live feedback/ask-first · self-healing stalls','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/crew-autonomy-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'crew-autonomy',source:'mcp',transcript:{rounds:[{title:'crew autonomy',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['ask-first stays default; auto-approve graduation needs Worf sign-off','self-heal nudges must not bypass WorfGate','escalation-into-inaction is the stall root cause'],finalDecision:'approved',actionItems:['crew-first default rule','live feedback + ask-first autonomy methodology','self-healing stall detection + research loop']},tags:['crew','autonomy','delegation','live-feedback','approvals','self-healing','stall','loop']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'Crew autonomy methodology — crew-first default, ask-first live-feedback approvals, self-healing stall detection + research loop',content:r.missionPlan,tags:['crew','autonomy','self-healing','approvals'],relates_to_crew:['picard','quark','uhura','troi','geordi','yar','worf','riker']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
