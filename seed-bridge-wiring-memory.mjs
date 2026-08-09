#!/usr/bin/env node
/**
 * Seeds the bridge-wiring incident into observation memory as a first-class crew memory.
 *
 * Plain ESM against built output — this repo has no tsx/ts-node, and tsconfig include is
 * ["src","test"] so scripts/ never compiles. Matches the existing .mjs convention.
 *
 * Prereq: pnpm --filter @story-agent/shared build   (resolves @story-agent/shared/db)
 *
 * Run from the repo root:
 *   node scripts/seed-bridge-wiring-memory.mjs
 *   CLIENT_ID=acme node scripts/seed-bridge-wiring-memory.mjs
 *
 * Why seed this by hand: the defect being recorded is precisely the one that prevented the
 * system from recording it. Every run that hit it lost its own evidence, which is why it
 * survived ten iterations without escalating. This backfills the card the system could not write.
 */
import { storeObservationMemory } from '@story-agent/shared/db';

const CLIENT_ID = process.env.CLIENT_ID ?? null;

const transcript = {
  rounds: [
    {
      title: 'Symptom triage — sidebar reports crew deliberation unavailable',
      entries: [
        {
          speakerId: 'geordi',
          position: 'challenge',
          statement:
            'The reported symptom pointed at configuration: missing workspace path, RAG service down, unloaded shell credentials. All four hypotheses were wrong. The extension was sending workspacePath() correctly on every request.',
          evidence: [
            'packages/vscode-extension/src/agentClient.ts:219 — workspace included in the request body',
            'The "(server default — set the client workspace…)" footer at chat.ts:1017 renders when no file-mutating tool succeeded; it reports a consequence, not a cause',
          ],
        },
        {
          speakerId: 'data',
          position: 'amendment',
          statement:
            'The literal sidebar text traces to a single source line. It renders only when ctx.crewDeliberate is undefined, which means the caller never injected the bridge.',
          evidence: ['packages/mcp-server/src/agent-core/tools.ts:270'],
        },
      ],
    },
    {
      title: 'Root cause — one call site into the loop was unwired',
      entries: [
        {
          speakerId: 'data',
          position: 'support',
          statement:
            'plan-then-execute.ts called runAgentLoop without spreading buildBridges(clientId). http-server.ts spreads it. Two call sites into the same loop, one wired, one not. The sidebar activation path goes through the unwired one.',
          evidence: [
            'plan-then-execute.ts:59 — omitted the spread',
            'http-server.ts:229 — spreads ...buildBridges(clientId)',
            'Every bridge field on RunAgentOptions is optional, so the defect compiled clean and passed all 77 test files',
          ],
        },
        {
          speakerId: 'worf',
          position: 'challenge',
          statement:
            'The tools returned their failure as a STRING, which the loop records as ok:true. turnFailed never tripped, escalated stayed false, nothing retried. A failure that reports itself as success is worse than a crash.',
          evidence: ['10 iterations, 63 tool calls, escalated=false, never resolved'],
        },
        {
          speakerId: 'troi',
          position: 'support',
          statement:
            'recordFeedback was also absent on this lane, so no stall card was ever persisted. The defect disabled the very mechanism that would have let a later run recall it. It erased its own evidence on every iteration.',
          evidence: ['bridges.ts — recordFeedback writes via storeObservationMemory'],
        },
      ],
    },
    {
      title: 'Resolution and prevention',
      entries: [
        {
          speakerId: 'geordi',
          position: 'support',
          statement:
            'Fix applied across four files plus one new contract test. Verified: three runAgentLoop call sites inspected, zero violations after the fix; reverting plan-then-execute.ts in a scratch copy reproduces exactly one violation.',
          evidence: [
            'plan-then-execute.ts — spread buildBridges(opts.clientId ?? null)',
            'tools.ts — rag_recall and crew_deliberate now throw E_BRIDGE_UNWIRED',
            'sidebar.ts — forwards clientId, matching nativeChatProvider.ts:63',
            'chat.ts — degraded?: string[] added to the response contract; two silent catches now capture reasons',
            'bridge-wiring.test.ts — CI contract test, brace-matches every call site',
          ],
        },
        {
          speakerId: 'picard',
          position: 'amendment',
          statement:
            'The generalizable lesson: where the type system cannot express "if you call this, you must wire that," a static contract test must. The durable fix is to make bridges a required positional argument, which converts the contract test into a compiler error.',
          evidence: ['Refactor touches three call sites'],
        },
      ],
    },
  ],
  consensusSummary:
    'BRIDGE WIRING INCIDENT — plan-then-execute.ts called runAgentLoop without spreading buildBridges(clientId), leaving ctx.crewDeliberate, ctx.ragRecall and recordFeedback undefined on the VS Code sidebar activation lane. The bridge-dependent tools returned placeholder strings that the loop recorded as successful, so the run never failed, never escalated, and never wrote a stall card — meaning the defect suppressed its own evidence and recurred indefinitely. Fixed by wiring the bridges, making unwired bridges throw E_BRIDGE_UNWIRED, forwarding clientId from the sidebar, surfacing degraded subsystems on the response, and adding a CI contract test that fails the build if any runAgentLoop call site omits its bridges. RULE: optional capability injection with no compile-time contract is a silent-failure generator. If a tool cannot do its job, it must throw, never return a sentence describing the problem.',
  unresolvedRisks: [
    'degraded[] is present on the API response but not yet surfaced in the sidebar UI — a degraded answer can still be presented as a healthy one',
    'The codebase reads CREW_LLM_APPROVED_KEY, but diagnostics have directed operators to check OPENROUTER_API_KEY, which no code path consults',
    'packages/shared/src/index.d.ts declares source as only mcp|ui while index.ts declares four variants — the checked-in .d.ts is stale and will reject valid sources',
    'No /health preflight on the chat path reports bridge wiring, so the agent still cannot answer its own diagnostic questions',
  ],
  finalDecision: 'approved',
  actionItems: [
    'Make bridges a required positional argument of runAgentLoop to convert the contract test into a compiler error',
    'Surface degraded[] as a visible sidebar banner',
    'Add a /health preflight reporting bridge wiring, credential presence by registry name, and RAG reachability',
    'Extend the contract test to assert every runCanonicalChatTurn caller forwards clientId',
    'Regenerate packages/shared/src/index.d.ts from index.ts',
  ],
};

async function main() {
  const record = await storeObservationMemory({
    storyId: 'INCIDENT-BRIDGE-WIRING',
    clientId: CLIENT_ID,
    source: 'autonomous_task_audit',
    missionReference: 'INCIDENT-BRIDGE-WIRING',
    transcript,
    tags: [
      'incident',
      'postmortem',
      'agent-core',
      'bridge-wiring',
      'silent-failure',
      'short-term',
      'architecture-rule',
    ],
  });

  console.log('stored observation memory');
  console.log('  id:        ', record.id);
  console.log('  storyId:   ', record.storyId);
  console.log('  clientId:  ', record.clientId ?? '(global)');
  console.log('  tags:      ', record.tags.join(', '));
  console.log('\nVerify in the dashboard at /crew/memories');
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
