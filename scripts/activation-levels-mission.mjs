#!/usr/bin/env node
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/dist/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory } from '../packages/shared/dist/src/db.js';

const BRIEF = `Observation Lounge — Activation Levels & Memory Reinforcement

Goals:
1) Compare and analyze the different "activation" levels and execution modes we're attempting (manual human orchestration, autonomous crew agentic lanes, and hybrid escalation gating).
2) Propose a concrete, testable design for short-term (1 day) and long-term (5 day) crew personal memories, including how frequent short-term events should be reinforced into long-term RAG memories.
3) Recommend an algorithm for reinforcement: signal detection in Redis/RAG (frequency threshold + co-occurrence), a decay function, and tagging strategy to prioritize Troi (SME: communications + stakeholder signals) and Data (SME: architecture + systems) contributions.
4) Run parallel SME threads (Troi & Data) and ask each to: (a) analyze activation tradeoffs, (b) propose validation checks, and (c) propose concrete memory-reinforcement rules.
5) Produce a Picard synthesis that assembles the team proposals into an ordered plan with acceptance checks and owner assignments.

Instructions for the crew:
- Work in parallel: Troi = stakeholder/signal analysis, Data = architecture/algorithm design, Riker = execution plan, Geordi = infra constraints, Worf = gating/security, Quark = cost discipline, Crusher = tests/diagnostics, Picard synthesizes.
- Use recent personal memories (1d short-term, 5d long-term) as recall context; explicitly cite memory ids if relevant.
- Propose precise RAG schema fields (tags, storyId, createdAt, decayScore) and a reinforcement rule (e.g., occurrences > N within 24h upgrades weight; co-occurrence across crew members increases associative weight).
- Produce artifacts: (A) consensus mission plan, (B) recommended implementation snippet/pseudocode for reinforcement, (C) acceptance tests for rollout.

Please be explicit: include example RAG entries, thresholds, and minimal pseudo-code for the reinforcement function. Tag the final transcript with 'activation-analysis' and 'memory-reinforcement'.`.trim();

function toDebate(result) {
  return {
    rounds: [
      {
        title: 'Crew contributions — activation levels analysis',
        entries: result.contributions.map((c) => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [`model:${c.model}`, `cost:$${c.costUSD}`] })),
      },
    ],
    consensusSummary: result.missionPlan,
    unresolvedRisks: result.unresolvedRisks ?? [],
    finalDecision: 'recommended',
    actionItems: [],
  };
}

async function main() {
  console.log('\n🛸 Convening the Observation Lounge: Activation Levels & Memory Reinforcement\n');

  const dryRun = process.argv.includes('--dry-run');

  const result = await runMissionPipeline(BRIEF);

  // Write transcript
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = [
    `# Observation Lounge — Activation Levels & Memory Reinforcement`,
    ``,
    `**Date:** ${new Date().toISOString().slice(0, 10)}  |  **Top model:** ${result.topModel}  |  **Total cost:** $${result.efficiency.totalCostUSD}`,
    ``,
    `## Goals`,
    ``,
    BRIEF,
    ``,
    `## Team contributions`,
    ``,
    ...result.contributions.flatMap((c) => [`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`, ``, c.text, ``]),
    `## Picard — mission plan`,
    ``,
    result.missionPlan,
    ``,
    '```json',
    JSON.stringify(result.efficiency, null, 2),
    '```',
  ].join('\n');

  mkdirSync('docs/observation-lounge', { recursive: true });
  const path = `docs/observation-lounge/activation-levels-${stamp}.md`;
  writeFileSync(path, md);
  console.log(`📄 Transcript → ${path}`);

  // Build observation payload
  const debate = toDebate(result);

  if (dryRun) {
    console.log('\n--- DRY RUN: no external writes will be performed ---');
    console.log('\nTranscript path:', path);
    console.log('\nObservation payload preview:');
    console.log(JSON.stringify(debate, null, 2).slice(0, 2000));
    console.log('\nPersonal memory previews:');
    const previews = result.contributions.filter((x) => ['troi', 'data', 'picard'].includes(x.crewId)).map((c) => ({ crewId: c.crewId, preview: c.text.slice(0, 400) }));
    console.log(JSON.stringify(previews, null, 2));
    console.log('\nDry-run complete. To perform live writes, re-run without --dry-run and ensure Worfgate creds are available.');
    return;
  }

  // Record shared observation memory
  const obs = await storeObservationMemory({ storyId: 'activation-analysis', source: 'mcp', transcript: debate, tags: ['activation-analysis', 'memory-reinforcement'] });
  console.log(`  ✅ shared observation memory: ${obs.id}`);

  // Optionally store personal recommendations per SME as crew personal memory
  for (const c of result.contributions.filter((x) => ['troi', 'data', 'picard'].includes(x.crewId))) {
    try {
      const memId = await storeCrewPersonalMemory({ crew_id: c.crewId, memory_type: 'decision_note', title: `Activation analysis — ${c.crewId}`, content: c.text.slice(0, 4000), tags: ['activation-analysis', 'short-term-signal'] });
      console.log(`  ✅ stored personal memory for ${c.crewId}: ${memId}`);
    } catch (e) {
      console.error('Failed to store personal memory for', c.crewId, e);
    }
  }

  console.log('\n✔ Activation analysis complete. Transcript and RAG memories stored.');
}

main().then(() => process.exit(0)).catch((err) => { console.error('Mission failed:', err); process.exit(1); });
