import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { storeObservationMemory } from '../packages/shared/src/db';

(async () => {
  const designDoc = readFileSync('/Users/bradygeorgen/Developer/story-agent/docs/observation-lounge/crew-status-reporting-design-20260712.md', 'utf-8');

  const obs = await storeObservationMemory({
    storyId: 'crew-status-reporting-design',
    source: 'architect-synthesis',
    transcript: {
      rounds: [{
        title: 'Real-time crew status reporting architecture',
        entries: [
          {
            speakerId: 'picard',
            position: 'support',
            statement: 'Architecture approved. Hybrid Riker aggregation (Option C) minimizes latency and cost. Single stream to chat, 200ms batch intervals. Feedback flow is clear: officer → Riker queue → batch drain → chat client → storage.',
            evidence: ['crew-status-reporting-design-20260712.md']
          },
          {
            speakerId: 'riker',
            position: 'support',
            statement: 'Integration path: extend runMissionPipeline to emit crew-status-update events, build crew-status-riker.ts for batching, modify chatEngine.ts to subscribe and render status cards. Reuses existing chat stream. Lean and non-invasive.',
            evidence: ['crew-status-reporting-design-20260712.md']
          },
          {
            speakerId: 'geordi',
            position: 'support',
            statement: 'Phase 1 roadmap: 3 days to build storeCrewExecutionOutcome(), extend prompt-engine.ts for capture, implement Riker queue with 200ms batch drain. PoC: 10 test runs, verify RAG storage with tags. Achievable and realistic.',
            evidence: ['crew-status-reporting-design-20260712.md']
          },
          {
            speakerId: 'quark',
            position: 'support',
            statement: 'Cost model: Frugal tier (~$0.02 per mission for reporting logic), batch aggregation reduces event count 80%, analytics queries cached 1h. Minimal overhead, tier-3 models adequate for status classification.',
            evidence: ['crew-status-reporting-design-20260712.md']
          },
          {
            speakerId: 'data',
            position: 'support',
            statement: 'Metrics schema: 7 essential fields (crew_id, attempt_id, task, status, duration, confidence, timestamp) + optional fields. PoC dashboard: success rate per officer, trending, blocker modes. Phase 3: task routing based on performance history.',
            evidence: ['crew-status-reporting-design-20260712.md']
          },
          {
            speakerId: 'scotty',
            position: 'support',
            statement: 'Build Phase 1 first (this week): highest ROI, unblocks real-time feedback observability. Phase 1 PoC is 48-hour sprint. Phase 2 chat integration, Phase 3 performance dashboard follow naturally.',
            evidence: ['crew-status-reporting-design-20260712.md']
          }
        ]
      }],
      consensusSummary: 'Full-crew consensus on real-time status reporting architecture. Hybrid Riker aggregation (Option C) chosen: officers report to central queue, Riker batches 200ms, emits to chat stream. Minimal schema (7 fields) for crew execution outcomes stored in RAG. 3-phase roadmap: Phase 1 outcome logging (3d), Phase 2 VSCode chat display (4d), Phase 3 performance dashboard + task routing (5d). Phase 1 to start immediately.',
      unresolvedRisks: [],
      finalDecision: 'approved',
      actionItems: [
        'Implement CrewExecutionOutcome schema + storeCrewExecutionOutcome() helper',
        'Extend prompt-engine.ts to capture outcome fields after task attempts',
        'Build crew-status-riker.ts: StatusUpdateQueue, 200ms batch drain',
        'Modify chatEngine.ts to subscribe to crew-status-batch events',
        'Test Phase 1 PoC on 10 missions, verify RAG storage',
        'Roll out Phase 2 chat integration',
        'Build Observation Lounge performance dashboard Phase 3'
      ]
    },
    tags: ['crew', 'status-reporting', 'real-time', 'chat', 'feedback', 'outcomes', 'performance-metrics', 'RAG', 'architecture', 'design', 'consensus', 'roadmap']
  });

  console.log('Stored to RAG:', obs.id, 'embedding source:', obs.embedding_source);
  process.exit(0);
})().catch(e => {
  console.error('ERR', e?.message || e);
  process.exit(1);
});
