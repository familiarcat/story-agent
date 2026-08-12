/**
 * Records the 2026-08-10 max-iterations fix milestone into the crew's durable RAG memory.
 *
 * Modeled directly on scripts/store-worfgate-milestone-memory.ts (same pattern: one
 * storeObservationMemory call for the crew-wide record, one storeCrewPersonalMemory call per
 * officer so every crew member can recall this on their own subsequent runs, then flush the sync
 * queue). Run once after applying the fix files — see scripts/apply-story-agent-fixes.sh, which
 * calls this automatically.
 */
import { flushObservationMemoryQueue, storeCrewPersonalMemory, storeObservationMemory } from '../packages/shared/src/db.js';

const storyId = 'milestone-max-iterations-fix-20260811';

const summary = [
  'Milestone: fixed the recurring "reached max iterations without a final summary" failure.',
  'Root cause: TWO independent hardcoded maxIterations:12 call sites (chat.ts activation lane AND',
  'the plan_then_execute MCP tool exposed on the deployed server that Claude.ai calls directly) —',
  'not a design flaw in the loop itself. A prior deepseek commit had claimed a dynamic-iterations',
  'formula was wired into loop.ts; it was never actually applied (git status was clean) — a second',
  'confirmed instance of the claimed-work-not-written pattern.',
  '',
  'Four human-in-the-loop decisions implemented:',
  '1. Guaranteed completion: runSummaryAgent() in loop.ts — a standalone call OUTSIDE the main',
  '   iteration budget, invoked when the loop exhausts, using the ground-truth tool-call ledger',
  '   instead of narration. Exported separately so a future caller can invoke it detached/async.',
  '2. Advisory file verification: added mutationsOk to the feedback card and a zero-mutation-claim',
  '   RAG tag (bridges.ts) for runs that used mutating-shaped tools but landed zero successful ones —',
  '   advisory only, never blocks a run, but now recallable by rag_recall on a repeat task shape.',
  '3. Graceful degradation: degradeTeamForStress() in crew-team-assembly.ts trims a stressed crew to',
  '   3 (Picard always survives) and ESCALATES survivors to frontier tier — fewer, stronger officers,',
  '   not more, cheaper ones. Auto-triggers in plan-then-execute.ts when a recalled prior run for the',
  '   same task shows stalled=true.',
  '4. Crew-informed iteration budget: computeMaxIterations() in the new iteration-budget.ts derives',
  '   the turn budget from team size x reflection rounds actually run, bounded [12,50], frozen to a',
  '   safe fallback of 15 when the crew signal is unavailable. Both hardcoded 12s removed.',
  '',
  'Also fixed while verifying: the application S3 bucket gap (scripts/setup-app-bucket.sh derives',
  'story-agent-{account}-{region} via aws sts get-caller-identity, provisions it, writes',
  'STORY_AGENT_S3_BUCKET into ~/.alexai-secrets/api-keys.env, registered in worfgate-credentials.ts;',
  'packages/shared/src/s3-structure.ts defines the clients/projects/sprints + static/crew key layout)',
  'and a Guinan persona registry gap (CrewId already listed guinan but CREW_PERSONAS/',
  'CREW_MEMORY_ALPHA_URLS/LOUNGE_SYSTEM_PROMPTS did not — added her full persona, mapped to a new',
  '"evaluation" CrewDomain matching her Evaluation/Decision-Rights role, which is why pnpm typecheck',
  'was failing before this fix).',
  '',
  'Verified: pnpm install, pnpm --filter @story-agent/shared build, pnpm --filter @story-agent/',
  'mcp-server typecheck (clean), pnpm --filter @story-agent/mcp-server test:unit (396 passed, 0',
  'failed). New regression tests: iteration-budget.test.ts, additions to crew-team-assembly.test.ts.',
].join('\n');

const tags = [
  'milestone',
  'max-iterations',
  'agent-loop',
  'crew-mission-pipeline',
  'graceful-degradation',
  'summary-agent',
  'rag-self-learning',
  's3-bucket',
  'guinan',
  'worfgate',
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
          title: 'Max-iterations root-cause fix + four architectural decisions',
          entries: [
            {
              speakerId: 'picard',
              position: 'support',
              statement: summary,
              evidence: [
                'file:packages/mcp-server/src/agent-core/loop.ts:runSummaryAgent',
                'file:packages/mcp-server/src/lib/iteration-budget.ts:computeMaxIterations',
                'file:packages/mcp-server/src/lib/crew-team-assembly.ts:degradeTeamForStress',
                'file:packages/mcp-server/src/agent-core/bridges.ts:zero-mutation-claim',
                'file:scripts/setup-app-bucket.sh',
                'file:packages/shared/src/s3-structure.ts',
                'typecheck:clean',
                'tests:396-passed',
              ],
            },
          ],
        },
      ],
      consensusSummary: summary,
      unresolvedRisks: [
        'computeMaxIterations bounds (12-50) and the degradeTeamForStress keepMembers=3 default are',
        'heuristic starting points — not yet validated against real production stress patterns.',
        'Revisit both once enough real runs have accumulated to check the bounds empirically.',
      ],
      finalDecision: 'approved',
      actionItems: [
        'rag_recall for "max iterations" or "zero mutation" should surface this milestone on any',
        'future stall — check whether the crew already has a fix pattern before re-diagnosing.',
        'Run scripts/setup-app-bucket.sh once per AWS account/region to provision STORY_AGENT_S3_BUCKET.',
        'Monitor whether degradeTeamForStress actually fires (stress=true) on repeat-stalled task',
        'shapes, and whether the escalated-tier survivors resolve them.',
      ],
    },
    tags,
  });

  for (const crewId of allCrew) {
    await storeCrewPersonalMemory({
      crew_id: crewId,
      memory_type: 'decision_note',
      title: 'Milestone reference: max-iterations root-cause fix (2026-08-10)',
      content: summary,
      tags: ['milestone', 'operations', 'max-iterations', 'recall-reference'],
      relates_to_crew: allCrew.filter((c) => c !== crewId),
    });
  }

  const flush = await flushObservationMemoryQueue();
  console.log(`stored observation memory id=${obs.id} and crew notes for ${allCrew.length} members; flushed synced=${flush.synced} remaining=${flush.remaining}`);
  // Force exit — db.ts optionally opens a Redis client (when REDIS_URL is set) whose connection
  // stays open after this script's own work is done, so Node's event loop never drains naturally
  // and the process hangs indefinitely even though everything succeeded. All writes above are
  // already awaited/complete by this point, so exiting here is safe.
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
