#!/usr/bin/env node
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/dist/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory } from '../packages/shared/dist/src/db.js';

const BRIEF = `
Observation Lounge — Aha revisions for the current VS Code plugin and dashboard UI.

Riker should split the crew into complementary teams using their canonical profiles and relevant RAG memories. The teams must analyze both the services layer and the UI layer of the VS Code extension.

Deliverables:
1) Team breakdown by capability, with one team focused on the services architecture and one team focused on the VS Code UI/plugin experience.
2) Analysis of the current capacity, risks, and gaps in both the services layer and the extension UI.
3) Recommendations for which Aha revisions or backlog stories should be created, including prioritization and ownership.
4) Final output in the terminal must use the Observation Lounge script format with summary sections, team findings, and Riker's synthesis.

Instructions:
- Riker assigns complementary teams based on crew profiles and RAG memories.
- Troi should lead stakeholder/signal validation with the UI team.
- Data should lead architecture/capacity analysis with the services team.
- Worf, Yar, and Geordi should validate security, QA, and performance assumptions.
- Quark should evaluate the cost/effort balance.
- Picard should synthesize the final plan and recommend Aha revisions.
- The terminal output should be structured like other Observation Lounge transcripts.
`.trim();

function toDebate(result) {
  return {
    rounds: [
      {
        title: 'Observation Lounge — Aha revisions team findings',
        entries: result.contributions.map((c) => ({
          speakerId: c.crewId,
          position: 'support',
          statement: c.text,
          evidence: [`model:${c.model}`, `cost:$${c.costUSD}`],
        })),
      },
    ],
    consensusSummary: result.missionPlan,
    unresolvedRisks: result.unresolvedRisks ?? [],
    finalDecision: 'recommended',
    actionItems: [],
  };
}

async function main() {
  console.log('\n🛰️ Convening the Observation Lounge: Aha revisions for VS Code plugin and dashboard UI\n');
  const result = await runMissionPipeline(BRIEF);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const filename = `docs/observation-lounge/aha-revisions-observation-lounge-${timestamp}.md`;
  mkdirSync('docs/observation-lounge', { recursive: true });

  const markdown = [
    '# Observation Lounge — Aha Revisions for VS Code Plugin & Dashboard',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Cost:** $${result.efficiency.totalCostUSD.toFixed(4)} (${result.efficiency.totalTokens} tokens)`,
    `**Top model:** ${result.topModel}`,
    '',
    '## Brief',
    '',
    BRIEF,
    '',
    '## Crew Contributions',
    '',
    ...result.contributions.flatMap((c) => [
      `### ${c.crewId} — \`${c.model}\` ($${c.costUSD.toFixed(4)})`,
      '',
      c.text,
      '',
    ]),
    '## Mission Plan',
    '',
    result.missionPlan,
    '',
  ].join('\n');

  writeFileSync(filename, markdown);
  console.log(`📄 Transcript written to ${filename}`);

  const debate = toDebate(result);
  const obs = await storeObservationMemory({ storyId: 'aha-revisions-observation-lounge', source: 'mcp', transcript: debate, tags: ['aha-revisions', 'vscode-plugin', 'ui-services'] });
  console.log(`✅ Stored observation memory: ${obs.id}`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('Mission failed:', error);
  process.exit(1);
});
