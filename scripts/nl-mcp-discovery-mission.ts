import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — DESIGN how to (1) extend the Story Agent VS Code extension's natural-language input to mimic Claude Code + Continue, and (2) give EACH crew member the ability to dynamically DISCOVER relevant MCP libraries for a task (by their role), evaluate, and store approved ones to RAG. Be decisive: rank + sequence + name the first shippable artifact. Don't boil the ocean.

GROUND TRUTH — what we already have (verified in the repo):
- VS Code extension (packages/vscode-extension): a chat participant "story-agent.agent" with /ask /agent /plan /review /symphony commands; chatEngine.ts (caching+tiering+RAG-prune+budget) → POST /chat; agentClient.ts streams POST /agent SSE. Inline chat (Ctrl+I), reviewChanges.ts (multi-file diff UI), sidebar webview. So we ALREADY have: NL chat, an agentic SSE loop, and a diff UI.
- agent-core loop (packages/mcp-server/src/agent-core/loop.ts): Quark-selected model per turn, dynamic tool "lens", WorfGate green/yellow/red governor with opt-in interactive approvals (Wave 2), cost ledger, auto-escalation to the crew, rag_recall + crew_deliberate tools. SSE events: model/lens/text/tool_call/gate/tool_result/cost/escalation/done/error.
- crew-tool-registry.ts: a dynamic-tool-EVALUATION framework already exists — Worf security pre-screen → Quark cost eval → per-category specialist crew votes (TOOL_EVALUATORS) → Picard final approval; persisted to sa_tool_registry; ToolRecord has category (code-search|ci-cd|security|database|...), capabilities, qualityScore, securityClearance, status, crewVotes. NOT yet wired to fetch external registries.
- 11 crew members with domain keywords + base tiers (crew-team-assembly.ts): picard(command), data(architecture), worf(security), riker(implementation), geordi(infrastructure), obrien(devops), yar(quality), troi(stakeholder), crusher(health), uhura(communications), quark(finance).
- RAG: storeObservationMemory + storeCrewPersonalMemory (packages/shared/src/db.ts) with 64-dim embeddings (OpenRouter key reuse, hash fallback).

EXTERNAL TARGETS (scraped just now):
- Claude Code VS Code UX to mimic: a prompt box with PERMISSION MODES (normal=ask each action / plan=describe+approve before changes / auto-accept); a "/" COMMAND MENU (attach files, switch model, extended thinking, manage MCP servers, permissions); @-MENTIONS of files/folders/line-ranges (fuzzy) + auto-include editor selection; INLINE DIFF with accept/reject/edit; PLAN MODE that opens an editable markdown plan; session history/tabs; a "/mcp" MCP MANAGEMENT dialog (enable/disable/reconnect servers); context-window indicator.
- Continue Agent mode to mimic: Chat (no tools) / Plan (read-only tools) / Agent (all tools) MODE SEPARATION; per-tool permission policy (manual vs automatic); MCP servers configured via .continue/mcpServers/*.yaml (command/args/type/url/env). NOTE both map onto our existing WorfGate tiers + lens.
- THE discovery mechanism for goal #2: the OFFICIAL MCP REGISTRY (registry.modelcontextprotocol.io) — a REST API (GET /v0/servers with pagination, stable v0.1, OpenAPI spec) that agents query PROGRAMMATICALLY at runtime to find MCP servers. This is how a crew member "dynamically searches for MCP libraries relevant to its role/task."

CONVERGE ON (terse, decisive, FRUGAL):
1. Troi/Riker — NL INPUT GAP TABLE: for each Claude-Code/Continue UX feature above, mark DONE / PARTIAL / MISSING in our VS Code extension + UI, and pick the MVP subset that makes our NL input feel Claude-Code-grade. Map their "permission modes / Chat-Plan-Agent" onto our existing WorfGate tiers + lens (don't reinvent — reuse).
2. Data/Geordi — MCP DISCOVERY ARCHITECTURE: design the runtime flow where a crew member, given a task, searches the official MCP Registry (GET /v0/servers?search=...) filtered by THEIR role/category, then runs the EXISTING crew-tool-registry evaluation pipeline (Worf screen → Quark cost → specialist votes → Picard approve), and stores approved ToolRecords to RAG (sa_tool_registry + crew personal memory) so future tasks recall them. Reuse crew-tool-registry.ts — name the new piece (e.g., an mcp-registry-client + a per-role discovery tool).
3. Worf — SECURITY FLOOR for pulling EXTERNAL MCP servers: what must the Worf pre-screen check before any external MCP server is trusted/executed (supply chain, secrets, sandboxing)? Is auto-execution of a freshly-discovered MCP server a BLOCKER (human-gate it)?
4. Quark — COST/role mapping: which crew member owns which MCP ToolCategory (security→worf, infra/ci→geordi/obrien, code-search→data/riker, db→data, quality→yar, comms/docs→uhura, finance→quark), and the cheapest path (cache registry results in RAG; don't re-query every task).
5. Riker — sequence the first 3 steps. Picard ends with the SINGLE first artifact to build + its acceptance check. "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — NL input (Claude Code/Continue parity) + per-role dynamic MCP discovery','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/nl-mcp-discovery-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'nl-mcp-discovery',source:'mcp',transcript:{rounds:[{title:'nl + mcp discovery',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['external MCP supply-chain trust (Worf gate)','auto-exec of discovered MCP servers','registry query cost (cache in RAG)'],finalDecision:'approved',actionItems:['Build per-role MCP registry discovery + NL input parity MVP']},tags:['vscode','nl-input','mcp','discovery','registry','claude-code','continue','crew-tool-registry','rag']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
const m=await storeCrewPersonalMemory({crew_id:'data',memory_type:'decision_note',title:'NL input parity (Claude Code/Continue) + per-role dynamic MCP discovery via official registry → crew-tool-registry → RAG',content:r.missionPlan,tags:['vscode','nl-input','mcp','discovery','registry'],relates_to_crew:['troi','riker','geordi','worf','quark','picard']});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
