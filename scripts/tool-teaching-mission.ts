import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
(async () => {
const BRIEF = `Observation Lounge — DEBATE and CONCLUDE the process by which each crew member continuously FINDS tools (per their role), TEACHES the rest of the crew how to use them, and the crew maintains BOTH personal and crew-wide tool knowledge in our RAG system — so the whole crew acts as one unified system across all our surfaces. Be decisive: define the process + the data it writes to RAG + the first build step. Don't boil the ocean.

GROUND TRUTH — what we just shipped (verified in the repo):
- discoverMcpForRole(crewId, task) (packages/mcp-server/src/lib/mcp-discovery.ts): a crew member derives its role categories (reverse of TOOL_EVALUATORS), searches the OFFICIAL MCP registry (mcp-registry-client.ts), runs candidates through the EXISTING evaluation pipeline (Worf security → Quark cost → specialist votes → Picard), persists approved ToolRecords to sa_tool_registry + a crew PERSONAL memory. Discovered servers are human-gated (autoExecute=false) — never auto-run.
- getApprovedToolsForCrew(crewId) already recalls approved tools for a role (incl. "support officer elevation" sharing a lead's categories on a story).
- RAG: storeObservationMemory (crew-wide shared memory; tags + 64-dim embeddings) and storeCrewPersonalMemory (crew_id, memory_type insight/lesson_learned/decision_note, relates_to_crew[]).

OUR UNIFIED SURFACES (the system the tools must serve together):
- AI agents on the OpenRouter platform (Quark cost-optimized 11-crew); the agent-core /agent loop (read/edit/run/search/git + WorfGate tiers + dynamic lens).
- MCP server capacity (static tools today + the new dynamic registry discovery).
- GitHub integration (repo ops, PRs, CI/CD deploy).
- Aha! integration (firm/client/project → epic/story/task; REST tools).
- VS Code extension (chat participant, /agent SSE, diff UI).
- Web portals (Next.js UI: /agent, /chat, /cost, /learnings, /dashboard, /observation-lounge, etc.).

CONVERGE ON (terse, decisive, FRUGAL):
1. Picard/Data — THE TEACHING PROTOCOL: when a crew member's discovery approves a tool, exactly WHAT gets written to RAG so the rest of the crew "learns" it: (a) the discoverer's personal memory, (b) a CREW-WIDE shared memory (a "tool card": name, category, capabilities, how-to-invoke, when-to-use, human-gate status, owning role), tagged + related_to_crew = all members. Define the tool-card shape + tags so recall works.
2. Riker/Uhura — PROPAGATION + RECALL: how another crew member, on a new task, RECALLS a peer-taught tool (rag_recall over tool-card tags + getApprovedToolsForCrew). How do we avoid duplicate teaching (semantic dedup by tool name)? Keep it cheap (cache; don't re-teach).
3. Worf — TRUST in shared teaching: a tool taught by one member is still human-gated for EXECUTION; teaching shares KNOWLEDGE, not auto-trust. What must a tool-card record so the executing member re-checks the gate.
4. Quark — COST: don't re-query the registry or re-deliberate already-known tools; teaching writes once, recall is free. Cheapest path to crew-wide knowledge.
5. Geordi/Troi — THE UNIFIED TASK + NAV: how one task flows across surfaces (Aha story → agent loop → GitHub PR → VS Code/web portal visibility) using shared tools. Briefly: the web portals should converge on a SINGLE Next.js dashboard home that routes (via our routing) to a dynamic API parity layer mirroring the Aha! API — note this as the next phase, don't design it fully here.
6. Riker — first 3 build steps. Picard ends with the SINGLE first artifact + acceptance check ("a tool found by one crew member is recalled and correctly used by another, via RAG"). "Make it so."`;
const r = await runMissionPipeline(BRIEF);
const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
const md = ['# Observation Lounge — Crew tool-teaching protocol (shared RAG understanding)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
mkdirSync('docs/observation-lounge',{recursive:true});
const p=`docs/observation-lounge/tool-teaching-${stamp}.md`; writeFileSync(p,md); console.log('TRANSCRIPT '+p);
const obs=await storeObservationMemory({storyId:'tool-teaching-protocol',source:'mcp',transcript:{rounds:[{title:'tool teaching protocol',entries:r.contributions.map(c=>({speakerId:c.crewId,position:'support',statement:c.text,evidence:[c.model]}))}],consensusSummary:r.missionPlan,unresolvedRisks:['execution stays human-gated even for taught tools','avoid duplicate teaching (dedup by name)','single Next.js dashboard ↔ Aha API parity (next phase)'],finalDecision:'approved',actionItems:['Implement tool-card teaching: discovery writes crew-wide shared memory; peers recall + reuse']},tags:['tool-teaching','rag','shared-understanding','mcp','discovery','crew-wide','unified-system']});
console.log('OBS '+obs.id+' emb='+embeddingSource());
// Seed the shared understanding: a crew-wide note related to ALL members.
const ALL=['picard','data','worf','riker','geordi','obrien','yar','troi','crusher','uhura','quark'];
const m=await storeCrewPersonalMemory({crew_id:'picard',memory_type:'decision_note',title:'Crew tool-teaching protocol — discovery writes a crew-wide tool-card; peers recall + reuse (execution stays human-gated)',content:r.missionPlan,tags:['tool-teaching','protocol','shared-understanding'],relates_to_crew:ALL});
console.log('MEM '+m);
console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
process.exit(0);
})().catch(e=>{console.error('ERR',e?.message||e);process.exit(1);});
