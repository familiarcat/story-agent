import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/dist/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/dist/src/db.js';

const BRIEF = `Observation Lounge — Derive how many of the prior crew-autonomy workflow steps can be automated by an optimized Story Agent crew, and define the exact default Chat natural-language behavior so it uses the team-coordinated parallel OpenRouter workflow.

The crew should assume this is a production-grade MCP system. It may either recommend implementing the behavior in code, or by defining a properly formatted system-oriented prompt engineering template that MCP agents can embed in their own prompts. Prefer the more reliable solution, but note the tradeoffs.

The deliverable must include:
1) A short automation matrix for the prior steps: classify each as "automatable by the crew", "semi-automated with human gating", or "manual/human-only".
2) A concrete default behavior spec for Chat natural-language requests: when the user talks to the assistant, the system should automatically default to the parallel OpenRouter crew workflow we use today, not direct Anthropic for substantive work.
3) A reusable prompt template or code design that encodes this default behavior for MCP agents, including how the template is injected into agent prompts or code call sites.
4) Permission to manage files: if the crew determines that changing code, prompt templates, or config files is the correct solution, explain exactly which files should be updated and what should change.
5) A minimal first artifact recommendation: either a code insertion point or a system prompt template file with a sample content block.

Be decisive and specific. Maximize the prompt: treat this as an executive-level prompt engineering and architecture task, then produce an artifact the developer can apply directly.`;

function toDebate(r: Awaited<ReturnType<typeof runMissionPipeline>>): { rounds: Array<{title:string,entries:Array<{speakerId:string,position:string,statement:string,evidence:string[]}>}>; consensusSummary:string; unresolvedRisks:string[]; finalDecision:string; actionItems:string[] } {
  return {
    rounds: [
      {
        title: 'Crew findings — automated crew workflow + OpenRouter default',
        entries: r.contributions.map((ct) => ({
          speakerId: ct.crewId,
          position: 'support',
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
    actionItems: ['Implement crew-first chat default behavior', 'Add a prompt template or code hook for the OpenRouter crew workflow', 'Review file changes with WorfGate where required'],
  };
}

async function main() {
  console.log('\n🛠️ Observation Lounge — Crew chat default automation mission…\n');

  const result = await runMissionPipeline(BRIEF);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const filename = `docs/observation-lounge/crew-chat-default-${timestamp}.md`;
  mkdirSync('docs/observation-lounge', { recursive: true });

  const markdown = [
    '# Observation Lounge — Crew Chat Default Automation',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Cost:** $${result.efficiency.totalCostUSD.toFixed(4)} (${result.efficiency.totalTokens} tokens)`,
    `**Top model:** ${result.topModel}`,
    '',
    '## Goals',
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
    storyId: 'crew-chat-default',
    source: 'mcp',
    transcript: toDebate(result),
    tags: ['crew', 'chat', 'automation', 'openrouter', 'prompt-engineering', 'default-behavior'],
  });
  console.log(`✅ Recorded observation memory: ${observation.id}`);

  const memory = await storeCrewPersonalMemory({
    crew_id: 'quark',
    memory_type: 'decision_note',
    title: 'Crew chat default automation plan — OpenRouter team workflow for natural language input',
    content: result.missionPlan,
    tags: ['crew', 'chat', 'automation', 'prompt-engineering'],
    relates_to_crew: ['picard', 'riker', 'geordi', 'troi', 'uhura', 'worf', 'data'],
  });
  console.log(`✅ Stored personal crew memory: ${memory ?? 'cached or existing'}`);

  console.log(`\n🧭 Mission complete. Refer to ${filename} for the crew's recommendations.`);
}

main().catch((err) => {
  console.error('Mission failed:', err);
  process.exit(1);
});
