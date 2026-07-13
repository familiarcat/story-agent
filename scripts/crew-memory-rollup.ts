import 'dotenv/config';
import {
  getRecentObservationMemories,
  getCrewPersonalMemories,
  storeObservationMemory,
  storeCrewPersonalMemory,
  type ObservationMemoryRecord,
  type CrewPersonalMemory,
} from '../packages/shared/src/db.js';

type Args = {
  apply: boolean;
  context: string;
  clientId: string | null;
  obsLimit: number;
  personalLimit: number;
};

const STEP_TIMEOUT_MS = Math.max(4000, Number(process.env.CREW_MEMORY_ROLLUP_TIMEOUT_MS || 15000));

const CREW_IDS = [
  'picard',
  'data',
  'riker',
  'geordi',
  'obrien',
  'worf',
  'yar',
  'troi',
  'crusher',
  'uhura',
  'quark',
] as const;

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    context: 'autonomous-ops',
    clientId: process.env.STORY_AGENT_CLIENT_ID || null,
    obsLimit: 120,
    personalLimit: 40,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--context' && argv[i + 1]) out.context = argv[++i];
    else if (a === '--client-id' && argv[i + 1]) out.clientId = argv[++i];
    else if (a === '--obs-limit' && argv[i + 1]) out.obsLimit = Math.max(10, Number(argv[++i]));
    else if (a === '--personal-limit' && argv[i + 1]) out.personalLimit = Math.max(10, Number(argv[++i]));
  }

  return out;
}

function summarizeObs(memories: ObservationMemoryRecord[]): string {
  const byTag = new Map<string, number>();
  for (const m of memories) {
    for (const t of m.tags || []) byTag.set(t, (byTag.get(t) || 0) + 1);
  }
  const topTags = Array.from(byTag.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t, c]) => `${t}(${c})`)
    .join(', ');

  const topSummaries = memories
    .slice(0, 12)
    .map((m, i) => `${i + 1}. [${m.storyId}] ${(m.transcript?.consensusSummary || '').slice(0, 180)}`)
    .join('\n');

  return [
    `Observation memory rollup (${new Date().toISOString()})`,
    `Top tags: ${topTags || 'n/a'}`,
    '',
    'Recent consensus summaries:',
    topSummaries || 'none',
  ].join('\n');
}

function summarizePersonal(crewId: string, memories: CrewPersonalMemory[]): string {
  const byType = new Map<string, number>();
  for (const m of memories) byType.set(m.memory_type, (byType.get(m.memory_type) || 0) + 1);
  const typeSummary = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}(${v})`)
    .join(', ');

  const highlights = memories
    .slice(0, 8)
    .map((m, i) => `${i + 1}. ${m.title}: ${m.content.slice(0, 140)}`)
    .join('\n');

  return [
    `Crew memory rollup for ${crewId} (${new Date().toISOString()})`,
    `Type distribution: ${typeSummary || 'n/a'}`,
    '',
    'Pragmatic highlights:',
    highlights || 'none',
  ].join('\n');
}

async function withTimeout<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`⚠️  timeout: ${label} exceeded ${STEP_TIMEOUT_MS}ms; using fallback`);
          resolve(fallback);
        }, STEP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('== Crew Memory Rollup ==');
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Context: ${args.context}`);

  const obs = await withTimeout(
    'getRecentObservationMemories',
    getRecentObservationMemories(args.obsLimit, undefined, args.clientId),
    [] as ObservationMemoryRecord[],
  );
  const obsSummary = summarizeObs(obs);

  const personalPairs = await Promise.all(
    CREW_IDS.map(async (crewId) => {
      const memories = await withTimeout(
        `getCrewPersonalMemories(${crewId})`,
        getCrewPersonalMemories(crewId, args.personalLimit, false),
        [] as CrewPersonalMemory[],
      );
      return [crewId, memories] as const;
    }),
  );
  const personalByCrew: Record<string, CrewPersonalMemory[]> = Object.fromEntries(personalPairs);

  if (!args.apply) {
    console.log(`Observation memories sampled: ${obs.length}`);
    for (const crewId of CREW_IDS) {
      console.log(`  ${crewId}: ${personalByCrew[crewId].length} personal memories sampled`);
    }
    console.log('Dry-run complete. Re-run with --apply to write rollups to RAG.');
    return;
  }

  const obsStored = await withTimeout(
    'storeObservationMemory(rollup)',
    storeObservationMemory({
    storyId: 'crew-memory-rollup',
    clientId: args.clientId,
    source: 'mcp',
    transcript: {
      rounds: [{
        title: `Crew memory rollup (${args.context})`,
        entries: [{ speakerId: 'crew-rollup', position: 'support', statement: obsSummary, evidence: ['crew-memory-rollup'] }],
      }],
      consensusSummary: 'Stored autonomous memory rollup for retrieval-order recall basis.',
      unresolvedRisks: [],
      finalDecision: 'approved',
      actionItems: ['prioritize short-term and rollup-tagged memories in recall flow'],
    },
    missionReference: args.context,
    tags: ['crew-memory-rollup', 'retrieval-policy', 'autonomous-ops', args.context],
    }),
    undefined,
  );

  const personalResults = await Promise.all(
    CREW_IDS.map(async (crewId) => {
      const summary = summarizePersonal(crewId, personalByCrew[crewId]);
      const id = await withTimeout(
        `storeCrewPersonalMemory(${crewId})`,
        storeCrewPersonalMemory({
          crew_id: crewId,
          memory_type: 'decision_note',
          title: `Memory rollup (${args.context})`,
          content: summary,
          tags: ['crew-memory-rollup', 'retrieval-policy', args.context],
        }),
        undefined,
      );
      return id ? 1 : 0;
    }),
  );
  const personalStored = personalResults.reduce((a, b) => a + b, 0);

  console.log(`Stored observation rollup id: ${obsStored?.id || 'n/a'}`);
  console.log(`Stored personal rollups: ${personalStored}/${CREW_IDS.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
