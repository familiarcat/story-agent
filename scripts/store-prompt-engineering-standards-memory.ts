/**
 * Records the 2026-08-11 prompt-engineering-standards milestone into the crew's durable RAG
 * memory. Same pattern as store-max-iterations-fix-memory.ts and store-worfgate-milestone-memory.ts
 * — one crew-wide observation record, one decision_note per officer, then flush the sync queue.
 *
 * Source doctrine: the WWT AI Engineer interview prep materials (uploaded to Claude web chat,
 * 2026-08-11) — specifically Prompt Eng Q2 (Role→Context→Task→Constraints→Output Format) and the
 * closing "Framing Tips" (anchor in scenario, name the tradeoff, name the eval, security ≠ prompt).
 */
import { flushObservationMemoryQueue, storeCrewPersonalMemory, storeObservationMemory } from '../packages/shared/src/db.js';

const storyId = 'milestone-prompt-engineering-standards-20260811';

const summary = [
  'Milestone: adopted the WWT AI Engineer interview deck\'s prompt-engineering framing tips as a',
  'live discipline in crew-mission-pipeline.ts, not just interview-prep material.',
  '',
  'New module packages/mcp-server/src/lib/prompt-standards.ts (pure, unit-tested, no model calls):',
  '1. buildStructuredPrompt() — composes Role→Context→Task→Constraints→OutputFormat (Prompt Eng',
  '   Q2), omitting empty sections rather than emitting empty headers. Wired into Picard\'s intake',
  '   prompt in runMissionPipeline, replacing an ad hoc concatenated string.',
  '2. scoreFramingTips() — a PURE ground-truth scorer (same discipline as reflection-rounds.ts\'s',
  '   classifyStance/anti-theater rule) checking whether a crew member\'s OWN contribution actually',
  '   anchored in the scenario, named a tradeoff, named an eval, and drew the security≠prompt',
  '   distinction — the same four badges the interview deck\'s scenario playbook scores itself',
  '   against. Advisory only (Decision 2 philosophy from the max-iterations fix): nothing blocks or',
  '   reruns a contribution, it is a coaching signal carried into MissionPipelineResult.framingScores',
  '   and available for the efficiency report / RAG recall.',
  '3. FRAMING_TIP_REMINDER — appended to every crew contribution and reflection-round prompt, so the',
  '   deck\'s tips are a live instruction each officer sees, not just prose a human interviewer reads.',
  '',
  'Also tightened Picard\'s mission-plan synthesis prompt per Prompt Eng Q4 (structured output: name',
  'the schema, forbid preamble) — the marker-based parser (===== CONSERVATIVE ===== etc.) now has an',
  'explicit "no preamble, begin with the first marker" instruction instead of relying on format alone.',
  '',
  'Deliberately scoped to crew-mission-pipeline.ts (the file\'s own header: "the PRIMARY LLM selection',
  'path") rather than the older prompt-templates.ts/prompt-engine.ts registry used elsewhere — that',
  'system is larger, has its own callers (crew-coordinator.ts, crew-lounge.ts, crew-agents.ts), and',
  'was out of scope for this pass. A future pass could extend buildStructuredPrompt/scoreFramingTips',
  'there too, once the same self-check runs against that file\'s actual call sites.',
  '',
  'Verified: pnpm --filter @story-agent/mcp-server typecheck (clean), pnpm --filter @story-agent/',
  'mcp-server test:unit (410 passed, 0 failed — 9 new tests for prompt-standards.ts, using real',
  'phrasing lifted from the uploaded scenario playbook\'s own scenario 01 and 03 answers as fixtures).',
].join('\n');

const tags = [
  'milestone',
  'prompt-engineering',
  'crew-mission-pipeline',
  'framing-tips',
  'structured-prompt',
  'rag-self-learning',
  'wwt-interview-deck',
  'operations',
  'interactive-system',
];

const allCrew = ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark', 'guinan'] as const;

async function main() {
  const obs = await storeObservationMemory({
    storyId,
    source: 'mcp',
    transcript: {
      rounds: [
        {
          title: 'Prompt-engineering standards adopted from the WWT interview deck',
          entries: [
            {
              speakerId: 'picard',
              position: 'support',
              statement: summary,
              evidence: [
                'file:packages/mcp-server/src/lib/prompt-standards.ts',
                'file:packages/mcp-server/src/lib/crew-mission-pipeline.ts:intakeSystem',
                'file:packages/mcp-server/src/lib/crew-mission-pipeline.ts:contributionSystem',
                'file:packages/mcp-server/src/lib/prompt-standards.test.ts',
                'source:AI_Engineer_Interview_Prep.pdf',
                'source:AI_Engineer_Scenario_Playbook.pdf',
                'typecheck:clean',
                'tests:410-passed',
              ],
            },
          ],
        },
      ],
      consensusSummary: summary,
      unresolvedRisks: [
        'scoreFramingTips is a keyword-level heuristic, not semantic understanding — it will miss a',
        'well-framed position phrased unusually, and could in principle be gamed by an officer padding',
        'text with trigger words. It is advisory only for exactly this reason; do not promote it to a',
        'blocking gate without a stronger (e.g. model-graded) check first.',
        'prompt-templates.ts/prompt-engine.ts (the older, larger registry used by crew-coordinator.ts,',
        'crew-lounge.ts, crew-agents.ts) was NOT touched by this pass — still using its own prompt shape.',
      ],
      finalDecision: 'approved',
      actionItems: [
        'rag_recall for "framing tips" or "structured prompt" should surface this milestone.',
        'Consider extending buildStructuredPrompt/scoreFramingTips to prompt-templates.ts callers in a',
        'future pass, once verified against that system\'s own tests.',
        'Watch framingScores across real runs — if badgeCount is consistently low for a given crew',
        'member, that is a signal to revisit their persona seed (crew-personas.ts), not the scorer.',
      ],
    },
    tags,
  });

  for (const crewId of allCrew) {
    await storeCrewPersonalMemory({
      crew_id: crewId,
      memory_type: 'decision_note',
      title: 'Milestone reference: prompt-engineering standards from the WWT interview deck (2026-08-11)',
      content: summary,
      tags: ['milestone', 'operations', 'prompt-engineering', 'recall-reference'],
      relates_to_crew: allCrew.filter((c) => c !== crewId),
    });
  }

  const flush = await flushObservationMemoryQueue();
  console.log(`stored observation memory id=${obs.id} and crew notes for ${allCrew.length} members; flushed synced=${flush.synced} remaining=${flush.remaining}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
