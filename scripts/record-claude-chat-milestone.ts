/**
 * record-claude-chat-milestone.ts — generic RAG memory recorder for any Claude-web-chat-produced
 * fix package. Replaces writing a bespoke store-*.ts script per session (which is what
 * store-max-iterations-fix-memory.ts and store-prompt-engineering-standards-memory.ts were —
 * useful once, but not something that scales to "every future session gets its own script").
 *
 * Same underlying pattern those two established (and store-worfgate-milestone-memory.ts before
 * them): one storeObservationMemory call + a storeCrewPersonalMemory decision_note per crew
 * member + a queue flush + an explicit process.exit(0) (db.ts's optional Redis client otherwise
 * keeps the process alive forever — see the 2026-08-11 hang this fixes).
 *
 * Usage (called automatically by apply-story-agent-fixes.sh's memory step — see MANIFEST.json):
 *   npx tsx scripts/record-claude-chat-milestone.ts \
 *     --story-id max-iterations-fix-20260811 \
 *     --title "Max-iterations root cause fix" \
 *     --summary-file SUMMARY.md \
 *     --tags milestone,agent-loop,rag-self-learning
 *
 * --summary-file content becomes both the observation-memory transcript body and every crew
 * member's personal decision_note content — same as the two prior scripts did by hand.
 */
import { readFileSync } from 'node:fs';
import { flushObservationMemoryQueue, storeCrewPersonalMemory, storeObservationMemory } from '../packages/shared/src/db.js';

function parseArgs(argv: string[]): { storyId: string; title: string; summaryFile: string; tags: string[] } {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const storyId = get('--story-id');
  const title = get('--title');
  const summaryFile = get('--summary-file');
  const tagsRaw = get('--tags');
  if (!storyId || !title || !summaryFile) {
    console.error('Usage: npx tsx scripts/record-claude-chat-milestone.ts --story-id <slug> --title "<title>" --summary-file <path> [--tags a,b,c]');
    process.exit(1);
  }
  const tags = (tagsRaw ?? 'milestone,claude-chat').split(',').map((t) => t.trim()).filter(Boolean);
  return { storyId: storyId!, title: title!, summaryFile: summaryFile!, tags };
}

const allCrew = ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark', 'guinan'] as const;

async function main() {
  const { storyId, title, summaryFile, tags } = parseArgs(process.argv.slice(2));
  let summary: string;
  try {
    summary = readFileSync(summaryFile, 'utf8');
  } catch (err) {
    console.error(`Could not read --summary-file "${summaryFile}": ${err instanceof Error ? err.message : err}`);
    process.exit(1);
    return;
  }

  const obs = await storeObservationMemory({
    storyId,
    source: 'mcp',
    transcript: {
      rounds: [
        {
          title,
          entries: [{ speakerId: 'picard', position: 'support', statement: summary, evidence: [`story-id:${storyId}`] }],
        },
      ],
      consensusSummary: summary,
      unresolvedRisks: [],
      finalDecision: 'approved',
      actionItems: [`rag_recall for topics related to "${title}" should surface this milestone.`],
    },
    tags: [...tags, 'claude-web-chat', 'rag-self-learning'],
  });

  for (const crewId of allCrew) {
    await storeCrewPersonalMemory({
      crew_id: crewId,
      memory_type: 'decision_note',
      title: `Milestone reference: ${title}`,
      content: summary,
      tags: [...tags, 'recall-reference'],
      relates_to_crew: allCrew.filter((c) => c !== crewId),
    });
  }

  const flush = await flushObservationMemoryQueue();
  console.log(`stored observation memory id=${obs.id} and crew notes for ${allCrew.length} members; flushed synced=${flush.synced} remaining=${flush.remaining}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
