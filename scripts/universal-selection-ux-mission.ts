import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  // RECALL first (memory-recall protocol) — ground the brief in prior UI/mode rulings.
  const mems = await getRelevantObservationMemories({
    queryText: 'unified UI UX selection client project story task hierarchy tree picker web vscode extension design motif mode contract plan aha',
    clientId: null, limit: 6,
  });
  const recall = mems.length
    ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 320) ?? ''}`).join('\n')
    : '(no prior memories)';
  console.log('=== RECALLED ' + mems.length + ' memories (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 1200));

  const BRIEF = `Observation Lounge — DESIGN the universal SELECTION-FIRST UI/UX system for Story Agent: one shared contract, rendered optimally per platform (web Next.js + VS Code extension). Be decisive + FRUGAL.

PRIOR CREW MEMORY (recall — do not re-litigate):
${recall}

DIRECTIVE (user): "We want the UI to have as many AUTOMATED/SELECTABLE options as possible before a user must type a natural-language prompt. If the UI is properly organized, a user SELECTS their client/project/story/task instead of entering it manually. One universal UI/UX system across platforms, but optimized between web and VS Code renderings."

GROUND TRUTH we already have:
- Hierarchy = Firm (familiarcat) → Client → Project (=Aha product, ref prefix) → Epic → Story (=Feature) → Task (=Requirement); Sprint=Release. Same on security (clients table) + PM (Aha) sides.
- The agent server already proxies Aha READ over a single resolved key, cached: GET /aha/products and GET /aha/raw?path=<aha-api-path> (read-only, Aha-host-scoped). Extension just added fetchAhaHierarchy() (top level).
- We have a mode contract (agent-modes.ts: Ask/Plan/Agent → endpoint/toolPolicy/ahaEnabled) and gated lifecycle tools (crew_start_story, aha_branch_for_story, crew_link_story_pr, crew_complete_story) — dry-run unless confirm, audited.
- Existing surfaces: web Next.js dashboard (/agent hub, domain-grouped nav); VS Code chat participant (@story-agent: /ask /plan /agent /review /prepare /symphony) + sidebar webview.

CONVERGE ON (terse, decisive):
1. Data/Geordi — THE SHARED SELECTION CONTRACT: define ONE TS module in packages/shared (like agent-modes.ts) describing a hierarchy NODE { level: firm|client|project|epic|story|task, id, refPrefix?, name, parentId?, url? } + the ACTIONS available per level (e.g. story → Plan / Start story+branch / Link PR / Complete) mapped to existing endpoints/tools. Single source = the cached /aha proxy. What deeper-hierarchy endpoint do we need (extend /aha/raw drilldown vs a new /aha/tree)?
2. Troi/Riker — SELECTION-FIRST UX (the core ask): every NL action must have a SELECTABLE equivalent so typing is the FALLBACK. User picks a node → context actions appear as buttons. Define the interaction: progressive disclosure (pick client → projects load → stories load → actions).
3. Platform renderings (universal contract, optimized presentation): WEB = a tree/dashboard selector that drives the chat + shows actions inline. VSCODE = native TreeView (story-agent.hierarchy) + QuickPick drilldown + right-click context-menu actions, feeding the same chat participant. Same contract, different shell.
4. Worf — SECURITY: reads (the whole tree) are open + cached; any selection that triggers a WRITE (start story, branch, PR-link, complete) stays WorfGate-gated dry-run → confirm-in-surface; everything on OpenRouter.
5. Quark — CHEAPEST path: reuse the /aha proxy + cache aggressively; share the contract module across web+vscode; what to build FIRST vs DEFER. Avoid a bespoke heavy web framework.
6. Riker — first 3 build steps. Picard ends with the SINGLE first artifact + acceptance check (e.g. "a shared selection-contract module + a VS Code TreeView that lists firm→client→project→story selectable, each node exposing its gated actions"). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== CREW FEEDBACK LOG =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} · ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 460)); }
  console.log('\n[PICARD · MISSION PLAN]\n' + r.missionPlan.slice(0, 1400) + '\n=============================');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Universal selection-first UI/UX (web + VS Code)', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Recall', '', recall, '', '## Goals', '', r.goals, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`, '', c.text, '']), '## Picard — mission plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/universal-selection-ux-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'universal-selection-ux', source: 'mcp',
    transcript: { rounds: [{ title: 'universal selection-first UI/UX', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['selection-first: every NL action needs a selectable equivalent', 'one shared contract, optimized per platform (web tree vs vscode TreeView/QuickPick)', 'writes stay WorfGate-gated dry-run→confirm', 'reuse the cached /aha proxy'], finalDecision: 'approved', actionItems: ['shared selection-contract module (hierarchy node + per-level actions)', 'VS Code TreeView + QuickPick selection driving the chat', 'web tree/dashboard selector on the same contract'] },
    tags: ['ui', 'ux', 'selection-first', 'hierarchy', 'tree', 'treeview', 'quickpick', 'web', 'vscode', 'extension', 'aha', 'parity', 'openrouter'],
  });
  console.log('OBS ' + obs.id);
  const mem = await storeCrewPersonalMemory({ crew_id: 'geordi', memory_type: 'decision_note', title: 'Universal selection-first UI/UX: one shared selection contract (hierarchy node + per-level gated actions), rendered as web tree + VS Code TreeView/QuickPick', content: r.missionPlan, tags: ['ui', 'ux', 'selection-first', 'contract', 'treeview', 'web', 'vscode'], relates_to_crew: ['data', 'troi', 'riker', 'worf', 'quark', 'picard'] });
  console.log('MEM ' + mem + ' COST $' + r.efficiency.totalCostUSD + ' topModel=' + r.topModel);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
