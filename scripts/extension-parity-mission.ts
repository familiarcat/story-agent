import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — ORIENT the crew on a new primary goal: upgrade the Story Agent VS CODE EXTENSION to feature-parity with Claude Code, Continue, and GitHub Copilot, so the Story Agent becomes our PRIMARY natural-language chat/coding interface running END-TO-END on the OpenRouter crew (never Anthropic-direct). Be decisive: a gap table + ranked MVP + the first build.

GROUND TRUTH — what the Story Agent extension ALREADY has (packages/vscode-extension):
- Chat participant 'story-agent.agent' with slash commands /ask /agent /plan /review /symphony.
- chatEngine.ts: token-optimized chat (caching + Quark model tiering + RAG prune + budget) → /chat.
- agentClient.ts: streams the /agent SSE agentic loop (read/edit/run/search/git + WorfGate green/yellow/red + interactive approvals + cost + self-healing) — a Claude-Code-grade backend ALREADY EXISTS.
- inlineChat.ts (Ctrl+I on selection), reviewChanges.ts (multi-file colored diff + accept), sidebar webview, tree providers.
- Backend tools just added: discover_mcp_tools / recall_taught_tools (per-role MCP discovery + teaching), crew_research_stalls, crew_sync_to_aha / crew_start_story (git↔Aha lifecycle). RAG memory + persona system.

COMPARATOR FEATURE SETS (target parity):
- Claude Code (RAG MEM 26): permission modes (normal/plan/auto-accept), '/' command menu, @-mentions of files/folders/line-ranges + auto-include selection, inline diff accept/reject/edit, PLAN mode (editable plan), '/mcp' management, checkpoints/rewind, session history + tabs, extended thinking, context-window indicator.
- Continue: Chat / Plan / Agent MODE toggle (no-tools / read-only / full-tools), per-tool permission policy, MCP via config.
- GitHub Copilot: ask/chat, INLINE COMPLETIONS + next-edit-suggestions (ghost text), agent mode, multi-file edits, slash commands, @-participants/context, MCP, MODEL PICKER, agent skills.

CONVERGE ON (terse, decisive, FRUGAL):
1. Troi/Riker/Geordi — GAP TABLE: for each parity capability (chat, agentic loop, inline edit, multi-file diff review, slash menu, @-mention context, Ask/Plan/Agent mode toggle, MCP management UI, model picker, INLINE COMPLETIONS/next-edit, plan mode, session history, approvals, context/cost indicator) mark HAVE / PARTIAL / MISSING in our extension, citing the file. The big differentiators to call out: inline ghost-text completions (Copilot) and the unified Ask/Plan/Agent mode selector.
2. Geordi/Data — MVP for "primary NL interface": the smallest set that makes a developer choose Story Agent over Copilot/Claude Code daily — likely (a) a unified chat panel with an Ask/Plan/Agent mode toggle mapped to WorfGate tiers + the existing /chat & /agent, (b) @-mention file/selection context, (c) a model/cost badge. Exact files in packages/vscode-extension. Defer inline ghost-text completions to a later wave (it needs a completion provider + a fast cheap model) — note it explicitly.
3. Worf — SECURITY floor: everything runs on OpenRouter (no Anthropic-direct); writes/edits stay WorfGate-gated; approvals visible in the panel; secrets never in the webview.
4. Quark — cheapest path + what NOT to build yet (defer inline completions, cloud background agent). Reuse the agent-core loop + existing surfaces; the extension is a thin client.
5. Riker — first 3 build steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "a unified Story Agent chat panel with an Ask/Plan/Agent mode toggle that drives the OpenRouter /chat or /agent loop"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
console.log('\n===== CREW FEEDBACK LOG =====');
for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} · ${c.model}]`); console.log(c.text.replace(/\n{2,}/g,'\n').trim().slice(0,440)); }
console.log('\n[PICARD · PLAN]\n' + r.missionPlan.slice(0,900));
console.log('=============================');
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Story Agent extension: parity with Claude Code / Continue / Copilot','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/extension-parity-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'extension-parity',source:'mcp',transcript:{rounds:[{title:'extension parity roadmap',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['inline ghost-text completions deferred (needs completion provider + fast model)','everything must stay on OpenRouter (no Anthropic-direct)','writes WorfGate-gated in the panel'],finalDecision:'approved',actionItems:['build unified Ask/Plan/Agent chat panel on the OpenRouter loop','@-mention context + model/cost badge']},tags:['vscode','extension','parity','claude-code','continue','copilot','nl-interface','openrouter','roadmap']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'geordi',memory_type:'decision_note',title:'Story Agent extension parity roadmap (Claude Code/Continue/Copilot) — primary NL interface on OpenRouter',content:r.missionPlan,tags:['vscode','extension','parity','roadmap'],relates_to_crew:['troi','riker','data','worf','quark','picard']});
console.log('MEM '+m+' COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
