import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'universal ui ux strategy design system theme lcars selection-first hierarchy persona dashboard developer vscode react component reuse navigation accessibility',
    clientId: null, limit: 6,
  });
  const recall = mems.length ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 280) ?? ''}`).join('\n') : '(none)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 900));

  const BRIEF = `Observation Lounge — TROI + DATA LEAD: define the UNIVERSAL UI/UX STRATEGY for the ENTIRE project (web Next.js dashboard + VS Code extension), building on what we already shipped. Decisive + FRUGAL — a strategy + prioritized roadmap, not a rewrite.

PRIOR MEMORY (build on, do not re-litigate):
${recall}

GROUND TRUTH (already shipped):
- Selection-first contract (packages/shared/src/selection-contract.ts): HierarchyNode + actionsForLevel + actionsForPersona (management vs developer). Web imports it; VS Code mirrors it.
- Mode contract (agent-modes.ts): Ask/Plan/Agent. Plan = the Aha PM lane.
- Web: shared <HierarchyTree>/<NodeActions>/useHierarchy reused in ProjectManagerDashboard (management) + DeveloperStoryWorkspace (developer). Existing components: Lcars, ThemeProvider, NavBar, SprintBoard, ProjectBoard, ClientScopeSelector, CrewMonitor. Pages: /agent, /dashboard, /chat, /cost, /crew, /observation-lounge, /sprint, /story, /learnings, /docs.
- VS Code: chat participant (/ask /plan /agent /review /prepare /symphony), Aha tree + story-agent.nodeActions QuickPick, sidebar webview, inline chat.
- Design system: LCARS theme (Lcars.tsx, lib/lcars.ts) + ThemeProvider (theme-swappable, e.g. light/dark like VS Code themes).

CONVERGE ON (terse, decisive):
1. TROI (UX, LEAD) — THE UNIFYING UX PRINCIPLES: codify the project-wide UX as a small set of principles (selection-first over typing; progressive disclosure; persona-appropriate density: management=overview/approve, developer=focused/act; mode clarity Ask/Plan/Agent; consistent crew-feedback surfacing). Map which principle each surface currently violates and the highest-impact fixes.
2. DATA (architecture, LEAD) — THE SHARED DESIGN-SYSTEM LAYER: how far to push React component reuse — a shared design-token + primitive set (cards, trees, action bars, status, crew-feedback) driven by the contracts, consumed by web directly and mirrored by vscode. What becomes SHARED vs surface-specific. Theming: tokens so LCARS / light / dark / custom themes swap cleanly across BOTH surfaces.
3. GEORDI — feasibility + reuse: leverage existing components (don't rebuild); where a thin shared primitive replaces duplicated chrome. No heavy new deps.
4. WORF — any UX that triggers writes stays WorfGate-gated dry-run→confirm, consistently across surfaces.
5. QUARK — cheapest path: prioritize the few changes with the most consistency payoff; what to DEFER.
6. RIKER → PICARD — the prioritized UI/UX roadmap (ranked) + the SINGLE first artifact + acceptance check (e.g. "a shared design-token module + a reusable <WorkflowStatus>/<CrewFeedback> primitive used on both the dashboard and the extension"). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== UNIVERSAL-UIUX FEEDBACK =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} | ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 420)); }
  console.log('\n[PICARD | PLAN]\n' + r.missionPlan.slice(0, 1500));

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Universal UI/UX strategy (whole project)', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\``, '', c.text, '']), '## Picard — plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/universal-uiux-strategy-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'universal-uiux-strategy', source: 'mcp',
    transcript: { rounds: [{ title: 'universal UI/UX strategy whole project', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['shared design-token + primitive layer vs surface chrome boundary', 'theme tokens must swap across web + vscode', 'selection-first applied consistently everywhere', 'writes stay gated across surfaces'], finalDecision: 'approved', actionItems: ['shared design-token module', 'reusable <WorkflowStatus>/<CrewFeedback> primitives', 'apply selection-first + persona density project-wide', 'theme tokens (LCARS/light/dark) across both surfaces'] },
    tags: ['ui', 'ux', 'design-system', 'theme', 'selection-first', 'persona', 'react', 'component-reuse', 'web', 'vscode', 'strategy', 'openrouter'],
  });
  console.log('OBS ' + obs.id);
  const mem = await storeCrewPersonalMemory({ crew_id: 'troi', memory_type: 'decision_note', title: 'Universal UI/UX strategy: selection-first + persona-density principles, shared design-token + primitive layer (tokens/cards/tree/status/crew-feedback) driven by contracts, themes swap across web+vscode', content: r.missionPlan, tags: ['ux', 'design-system', 'theme', 'strategy'], relates_to_crew: ['data', 'geordi', 'worf', 'quark', 'riker', 'picard'] });
  console.log('MEM ' + mem + ' COST $' + r.efficiency.totalCostUSD);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
