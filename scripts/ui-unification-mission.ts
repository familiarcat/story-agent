/**
 * Observation Lounge — Unify the cross-platform UX (web dashboards + VS Code extension + Aha),
 * then record the plan to RAG. The VS Code extension should reach parity with Claude Code / Copilot
 * / Continue AND integrate Aha + story management. Driven by the REAL OpenRouter crew.
 *
 * Usage: zsh -ic 'npx tsx scripts/ui-unification-mission.ts'
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
import type { ObservationDebateResult } from '../packages/shared/src/index.js';

const BRIEF = `
Convene the Observation Lounge to PLAN a unified, cross-platform UI/UX for Story Agent so the crew's
navigation and functionality are consistent across all surfaces, and the VS Code extension becomes a
first-class autonomous coding assistant on par with Claude Code / GitHub Copilot / Continue — while
integrating our Aha PM + story-management system. This is a PLANNING session: produce an information
architecture, a feature-parity matrix, and an ordered build plan. Implementation follows later.

CURRENT SURFACES (what exists today):
- Web dashboards (Next.js, packages/ui/src/app): chat, crew, dashboard, observation-lounge, sprint, story, api.
- VS Code extension (packages/vscode-extension/src): chatEngine (token-optimizing vscode.lm chat),
  participant (chat participant), agentClient (talks to /agent SSE loop), aha (Aha REST), oauth,
  sidebar, panels, providers.
- Backend: MCP server + agent-core (CLI/API/MCP one loop over OpenRouter), WorfGate security,
  Quark cost routing, RAG (cloud Supabase), the 11-member crew, Aha integration.

REFERENCE FEATURE SETS the crew should match/adapt (from web research):
- Claude Code: agentic loop (read/edit/shell/search), slash commands, subagents/agent teams, MCP
  integration, plan mode, hooks, CLAUDE.md memory, inline diffs + plan review in the IDE, same engine
  across CLI/IDE/desktop/web.
- GitHub Copilot (VS Code): inline completions; Chat view + Quick Chat; inline chat (Ctrl+I);
  Edits/Agent mode (multi-file, autonomous, iterates); slash commands (/explain /fix /tests /plan);
  chat variables (#file #selection #changes #problems); participants (@github @terminal @vscode).
- Continue: four modes — Chat, Autocomplete, Edit, Agent; @ context providers (@codebase @code);
  custom slash commands; rules; per-role model config (chat/edit/apply/embed/rerank).
- VS Code Chat Extension API: chat participants (@-mention), slash commands, streaming rich responses
  (markdown/code/progress/buttons/file-trees), tool calling (language model tools), follow-ups,
  participant detection, references/anchors to files & locations.

GOALS the crew must converge on (assign owners; Troi=UX, Geordi=infra/extension, Data=architecture,
Riker=impl sequencing, Worf=security, Uhura=docs/comms, Quark=cost, Picard=command):
1. UNIFIED INFORMATION ARCHITECTURE & NAVIGATION shared by web + VS Code: the same primary objects
   (Crew, Missions/Observation Lounge, Stories/Epics/Sprints via Aha, Cost/Quark, Security/WorfGate,
   RAG/Memory) and consistent navigation/labels across both surfaces.
2. VS CODE FEATURE-PARITY MATRIX vs Claude Code/Copilot/Continue: inline completions, inline chat,
   multi-file edits/apply, agent mode, slash commands, @ context providers, plan mode/diff review —
   mapped to our agent-core loop + the VS Code Chat API. Identify gaps vs what we already have.
3. AHA + STORY MANAGEMENT INTEGRATION in both surfaces: browse/select a story → run a crew mission →
   open PR → sync status, with the firm→client→project→epic→story→task hierarchy visible.
4. A SHARED DESIGN SYSTEM / component + state model so web and extension don't diverge (tokens,
   crew theming, panels). How much can be shared code vs per-surface adapters.
5. COST + SECURITY woven in (Quark cost surfacing; WorfGate gating visible in the UX).
6. An ordered, incremental BUILD PLAN (phases) with the highest-leverage first steps.

Picard ends with a concrete, phased MISSION PLAN tagged by owner. Recorded to RAG as the unification plan.
`.trim();

function toDebate(r: Awaited<ReturnType<typeof runMissionPipeline>>): ObservationDebateResult {
  return {
    rounds: [{
      title: 'Crew contributions — cross-platform UX unification',
      entries: r.contributions.map(ct => ({
        speakerId: ct.crewId, position: 'support' as const, statement: ct.text,
        evidence: [`model:${ct.model}`, `cost:$${ct.costUSD}`],
      })),
    }],
    consensusSummary: r.missionPlan,
    unresolvedRisks: [
      'Shared design system vs per-surface adapters — how much code can truly be shared',
      'VS Code inline completions require an InlineCompletionItemProvider (separate from chat)',
    ],
    finalDecision: 'approved',
    actionItems: ['Implement the phased unification plan; start with the shared IA + navigation model'],
  };
}

async function main() {
  if (!process.env.CREW_LLM_APPROVED_KEY) { console.error('❌ CREW_LLM_APPROVED_KEY not set'); process.exit(1); }
  console.log('\n🛸 Observation Lounge — CROSS-PLATFORM UI/UX UNIFICATION (OpenRouter crew, frugal)…\n');

  const r = await runMissionPipeline(BRIEF);

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = [
    `# Observation Lounge — Cross-Platform UI/UX Unification`, ``,
    `**Date:** ${new Date().toISOString().slice(0, 10)}  |  **Top model:** ${r.topModel}  |  **Cost:** $${r.efficiency.totalCostUSD} (${r.efficiency.totalTokens} tokens)`, ``,
    `## Captain Picard — intake (goals)`, ``, r.goals, ``,
    `## Team (Riker assembled, Quark cost-optimized)`, ``,
    ...r.team.map(m => `- **${m.crewId}** (${m.domain}) → \`${m.model}\``), ``,
    `## Crew contributions`, ``,
    ...r.contributions.flatMap(ct => [`### ${ct.crewId} — \`${ct.model}\` ($${ct.costUSD})`, ``, ct.text, ``]),
    `## Captain Picard — mission plan (the unification roadmap)`, ``, r.missionPlan, ``,
    `## Cost (Quark)`, ``, '```json', JSON.stringify(r.efficiency, null, 2), '```', ``,
  ].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const path = `docs/observation-lounge/ui-unification-${stamp}.md`;
  writeFileSync(path, md);
  console.log(`📄 Transcript → ${path}`);

  console.log(`\n🧠 Recording to RAG (embeddings: ${embeddingSource()})…`);
  const obs = await storeObservationMemory({
    storyId: 'ui-unification', source: 'mcp', transcript: toDebate(r),
    tags: ['ui', 'ux', 'vscode-extension', 'web-dashboard', 'aha', 'unification', 'architecture'],
  });
  console.log(`  ✅ shared observation memory: ${obs.id}`);
  const memId = await storeCrewPersonalMemory({
    crew_id: 'troi', memory_type: 'decision_note',
    title: 'Cross-platform UI/UX unification plan (web + VS Code + Aha)',
    content: `Crew plan to unify navigation/functionality across web dashboards and the VS Code extension, with VS Code reaching Claude Code/Copilot/Continue parity + Aha integration (Observation Lounge).\n\n${r.missionPlan}`,
    tags: ['ui', 'ux', 'vscode', 'unification', 'aha'],
    relates_to_crew: ['geordi', 'data', 'riker', 'uhura', 'quark', 'worf', 'picard'],
  });
  console.log(`  ✅ Troi personal memory: ${memId ?? '(cached)'}`);
  console.log(`\n✔ Unification deliberated + recorded. Synthesizing the architecture doc next.\n`);
}

main().then(() => process.exit(0)).catch((err) => { console.error('Mission failed:', err); process.exit(1); });
