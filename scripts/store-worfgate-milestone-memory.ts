import { flushObservationMemoryQueue, storeCrewPersonalMemory, storeObservationMemory } from '../packages/shared/src/db.js';

const storyId = 'milestone-worfgate-secret-automation-20260713';

const summary = [
  'Milestone: WorfGate multi-source secret automation completed end-to-end.',
  'Implemented unified local (~/.zshrc env presence) + AWS Secrets Manager + GitHub secrets audit/reconcile command set.',
  'Added full-profile mappings for AHA, OpenRouter, and Supabase keys with fallback key expressions and merged AWS secret sources.',
  'Patched WorfGate secret rotation operation inference so SUPABASE_URL/SUPABASE_KEY resolve under supabase:query policy.',
  'Validated full path: local audit pass, AWS runtime secret updated, GitHub secrets mirrored, full apply+audit successful.',
  'Reference commit: fa2ae5cc65b87d4977cccde8214f29f3a68141c2.',
].join('\n');

const tags = [
  'milestone',
  'worfgate',
  'secrets',
  'aws',
  'github',
  'zshrc',
  'openrouter',
  'supabase',
  'automation',
  'operations',
  'interactive-system',
];

const allCrew = ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark'] as const;

async function main() {
  const obs = await storeObservationMemory({
    storyId,
    source: 'mcp',
    transcript: {
      rounds: [
        {
          title: 'WorfGate secret-chain automation milestone',
          entries: [
            {
              speakerId: 'picard',
              position: 'support',
              statement: summary,
              evidence: ['commit:fa2ae5c', 'workflow:crew-memory-rollup', 'aws+github+local verification'],
            },
          ],
        },
      ],
      consensusSummary: summary,
      unresolvedRisks: [
        'Future credential additions must be included in full mapping profiles',
        'CI workflows should keep explicit fallback diagnostics for key material',
      ],
      finalDecision: 'approved',
      actionItems: [
        'Use worfgate:sources:full:audit in ops preflight',
        'Use worfgate:sources:full:apply after credential rotations',
        'Treat this milestone memory as canonical incident-response reference',
      ],
    },
    tags,
  });

  for (const crewId of allCrew) {
    await storeCrewPersonalMemory({
      crew_id: crewId,
      memory_type: 'decision_note',
      title: 'Milestone reference: WorfGate multi-source secret automation',
      content: summary,
      tags: ['milestone', 'operations', 'secret-chain', 'recall-reference'],
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
