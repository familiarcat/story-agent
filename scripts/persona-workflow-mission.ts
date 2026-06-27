import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'selection-first contract hierarchy persona dashboard management developer vscode react component reuse workflow aha autonomous crew theme',
    clientId: null, limit: 6,
  });
  const recall = mems.length
    ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 300) ?? ''}`).join('\n')
    : '(no prior memories)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 1000));

  const BRIEF = `Observation Lounge — DATA and TROI LEAD: design the PERSONA-DIFFERENTIATED WORKFLOW STRATEGY for the single Story Agent codebase across two surfaces, then the WEB tree adapter. Decisive + FRUGAL.

PRIOR CREW MEMORY (recall — build on, do not re-litigate):
${recall}

DIRECTIVE (user): "A single codebase should respond efficiently to ALL platforms. Data + Troi: optimize the overall WORKFLOW concept given the difference between a VS Code extension and a web dashboard. The strategy must (a) let the autonomous crew operate AND give results to the Aha workflow, (b) represent the RELATIVE aspects of that workflow to the two user personas — Dashboard = MANAGEMENT view, VS Code extension = DEVELOPER view — and (c) always attempt to RE-USE React components."

GROUND TRUTH (already built):
- Canonical contract packages/shared/src/selection-contract.ts: HierarchyNode {level: firm|client|project|epic|story|task, id, ref?, name, parentId?, url?}, CHILD_LEVEL (progressive disclosure), actionsForLevel() (reads free; gated WRITES on story → crew_start_story/aha_branch_for_story/crew_link_story_pr/crew_complete_story, WorfGate dry-run→confirm).
- packages/ui (Next.js) DEPENDS ON @story-agent/shared → web imports the contract DIRECTLY. The VS Code extension MIRRORS it (esbuild, no shared bundle) — already wired: story-agent.nodeActions QuickPick on the Aha tree.
- Web already has persona-split components: ProjectManagerDashboard + ProjectManagerAdvisor (management) vs DeveloperStoryWorkspace + DeveloperAdvisor (developer); plus ClientScopeSelector, ThemeProvider, Lcars, ProjectBoard, SprintBoard, CrewMonitor. API: /api/aha/hierarchy?projectId=, /api/aha/projects.
- The autonomous crew runs via agent-core loop (NDJSON event stream) + runMissionPipeline; results already flow to Aha via the gated lifecycle tools and to RAG.

CONVERGE ON (terse, decisive):
1. TROI (UX, LEAD) — THE TWO-PERSONA WORKFLOW: define the SAME underlying workflow (select node → act → crew executes → result flows to Aha + RAG) rendered for each persona. MANAGEMENT (dashboard): portfolio/roadmap rollups, status of crew-run work across stories, approve/track — read-heavy + approval. DEVELOPER (vscode): a single story's tree + code actions (plan/agent/branch/PR) inline. What each persona SEES of the same workflow state, and where they DIVERGE vs SHARE.
2. DATA (architecture, LEAD) — COMPONENT RE-USE STRATEGY: a shared headless layer (contract + a useHierarchy hook + a presentational <HierarchyTree> + <NodeActions> driven by actionsForLevel) reused by BOTH persona dashboards on web, and structurally mirrored by the vscode tree. Define the component boundary: what is SHARED (contract, hooks, tree/actions primitives) vs PERSONA-SPECIFIC (rollup vs single-story chrome). How the crew's autonomous results (run cards, Aha sync status) render as a reusable <WorkflowStatus> in both.
3. GEORDI — feasibility on the existing components: reuse ProjectBoard/SprintBoard/ClientScopeSelector; add <HierarchyTree> on the contract + /api/aha/hierarchy. Avoid new heavy deps.
4. WORF — reads open; persona WRITES (management approvals + dev lifecycle) stay WorfGate-gated dry-run→confirm; everything OpenRouter.
5. QUARK — cheapest path: one shared component layer, two thin persona shells; cache hierarchy reads. What to build FIRST vs defer.
6. RIKER → PICARD — first 3 build steps + the SINGLE first artifact + acceptance check (e.g. "a shared <HierarchyTree> bound to selection-contract + /api/aha/hierarchy, rendered in BOTH the management dashboard and the developer workspace with persona-appropriate actions, re-using existing components"). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== CREW FEEDBACK LOG =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} · ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 480)); }
  console.log('\n[PICARD · MISSION PLAN]\n' + r.missionPlan.slice(0, 1600) + '\n=============================');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Persona-differentiated workflow + React reuse (Data + Troi)', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Recall', '', recall, '', '## Goals', '', r.goals, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`, '', c.text, '']), '## Picard — mission plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/persona-workflow-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'persona-workflow-strategy', source: 'mcp',
    transcript: { rounds: [{ title: 'two-persona workflow + React reuse', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['shared headless layer (contract+hooks+tree/actions) vs persona-specific chrome boundary', 'management=rollup/approve vs developer=single-story/code', 'web imports contract directly; vscode mirrors', 'writes stay WorfGate-gated'], finalDecision: 'approved', actionItems: ['shared <HierarchyTree> + useHierarchy on selection-contract + /api/aha/hierarchy', 'reuse in ProjectManagerDashboard + DeveloperStoryWorkspace with persona actions', 'reusable <WorkflowStatus> for crew run/Aha-sync results'] },
    tags: ['ui', 'ux', 'persona', 'dashboard', 'developer', 'vscode', 'web', 'react', 'component-reuse', 'workflow', 'hierarchy', 'selection-first', 'aha', 'openrouter'],
  });
  console.log('OBS ' + obs.id);
  const memT = await storeCrewPersonalMemory({ crew_id: 'troi', memory_type: 'decision_note', title: 'Two-persona workflow: same select→act→crew→Aha flow rendered management(rollup/approve) vs developer(single-story/code)', content: r.missionPlan, tags: ['ux', 'persona', 'workflow', 'dashboard', 'developer'], relates_to_crew: ['data', 'geordi', 'worf', 'quark', 'riker', 'picard'] });
  const memD = await storeCrewPersonalMemory({ crew_id: 'data', memory_type: 'decision_note', title: 'React reuse: shared headless layer (selection-contract + useHierarchy + <HierarchyTree>/<NodeActions>) reused by both persona shells; vscode mirrors', content: r.missionPlan, tags: ['architecture', 'react', 'component-reuse', 'hierarchy', 'contract'], relates_to_crew: ['troi', 'geordi', 'quark', 'picard'] });
  console.log('MEM troi=' + memT + ' data=' + memD + ' COST $' + r.efficiency.totalCostUSD + ' topModel=' + r.topModel);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
