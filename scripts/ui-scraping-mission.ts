import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/dist/src/lib/crew-mission-pipeline.js';
import { storeCrewPersonalMemory, storeObservationMemory, embeddingSource } from '../packages/shared/dist/src/db.js';
import type { ObservationDebateResult } from '../packages/shared/dist/src/index.js';

const BRIEF = `
Observation Lounge — SCRAPE and COMPARE best-of-breed UI research for our dashboard and VS Code extension, then design a shared, executable prompt-architecture system for the MCP inner-prompt stack.

The crew should behave like an engineering research team: use our own discovery and web-scraping utilities, find modern information-graphics patterns, platform theme systems, and design-system best practices, and compare the best results in the Observation Lounge.

This is a two-part mission:

1) Research + compare.
   - Use existing crew tool discovery / web scraping utilities if available.
   - Find modern dashboards, information graphic patterns, color/theme systems, font systems, and UX conventions for both browser dashboards and editor integrations.
   - Include platform-aware patterns for light, dark, system, and high-contrast themes.
   - Evaluate what is most suitable for our cross-platform Story Agent UI needs.

2) System prompt architecture.
   - Produce an executable design for an "inner prompt" optimization feature that applies our prompt architecture hierarchy consistently across MCP.
   - Define the prompt levels: UI surface + crew persona + mission/task + tool invocation + system prompt template.
   - Show how importance at each level changes the prompt integrity and how the system should compose/override them.
   - Describe how the dashboard and VS Code extension should expose or consume these inner prompt optimization controls.

Deliverables:
- A ranked, evidence-backed comparison of the best-of-breed dashboard / extension UI patterns.
- A proposed shared design system contract for our web dashboard and VS Code extension.
- A concrete, executable prompt-architecture plan for inner prompt optimization across MCP.
- A list of candidate scraping tools and sources the crew used or recommends for future experimentation.
- A small phased implementation plan for the first artifacts to ship.

Be decisive and concise. Use the crew's Observation Lounge process to reach consensus and surface unresolved risks. Use RAG-friendly structure in the final output.
`.trim();

function toDebate(r: Awaited<ReturnType<typeof runMissionPipeline>>): ObservationDebateResult {
  return {
    rounds: [
      {
        title: 'Crew findings — UI research + inner prompt architecture',
        entries: r.contributions.map((ct) => ({
          speakerId: ct.crewId,
          position: 'support' as const,
          statement: ct.text,
          evidence: [`model:${ct.model}`, `cost:${ct.costUSD}`],
        })),
      },
    ],
    consensusSummary: r.missionPlan,
    unresolvedRisks: r.contributions
      .filter((ct) => ct.text.toLowerCase().includes('risk') || ct.text.toLowerCase().includes('concern'))
      .map((ct) => `${ct.crewId}: ${ct.text}`),
    finalDecision: 'approved',
    actionItems: ['Build the shared dashboard + extension UI research artifacts', 'Implement the inner-prompt optimization feature in MCP prompt-engine', 'Surface theme + design tokens consistently across web and extension'],
  };
}

async function main() {
  console.log('\n🛰️ Observation Lounge — UI research + inner prompt architecture mission…\n');

  const result = await runMissionPipeline(BRIEF);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const filename = `docs/observation-lounge/ui-scraping-mission-${timestamp}.md`;
  mkdirSync('docs/observation-lounge', { recursive: true });

  const markdown = [
    '# Observation Lounge — UI Research & Inner Prompt Architecture',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Cost:** $${result.efficiency.totalCostUSD.toFixed(4)} (${result.efficiency.totalTokens} tokens)`,
    `**Top model:** ${result.topModel}`,
    '',
    '## Crew Goals',
    '',
    result.goals,
    '',
    '## Crew Contributions',
    '',
    ...result.contributions.flatMap((ct) => [
      `### ${ct.crewId} — \`${ct.model}\` ($${ct.costUSD.toFixed(4)})`,
      '',
      ct.text,
      '',
    ]),
    '## Mission Plan',
    '',
    result.missionPlan,
    '',
  ].join('\n');

  writeFileSync(filename, markdown);
  console.log(`📄 Transcript written to ${filename}`);

  const observation = await storeObservationMemory({
    storyId: 'ui-scraping-research',
    source: 'mcp',
    transcript: toDebate(result),
    tags: ['ui', 'vscode', 'dashboard', 'scraping', 'prompt-architecture', 'observation-lounge'],
  });
  console.log(`✅ Recorded observation memory: ${observation.id}`);

  const memory = await storeCrewPersonalMemory({
    crew_id: 'uhura',
    memory_type: 'decision_note',
    title: 'UI research and inner prompt architecture plan for dashboard + VS Code extension',
    content: result.missionPlan,
    tags: ['ui', 'prompt-architecture', 'vscode', 'dashboard', 'inner-prompt'],
    relates_to_crew: ['data', 'riker', 'geordi', 'troi', 'worf', 'quark', 'picard'],
  });
  console.log(`✅ Stored personal crew memory: ${memory ?? 'cached or existing'}`);

  console.log(`\n🧭 Mission complete. Refer to ${filename} for the crew's recommendations.`);
}

main().catch((err) => {
  console.error('Mission failed:', err);
  process.exit(1);
});
