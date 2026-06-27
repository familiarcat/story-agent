import 'dotenv/config';
import { getRecentObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';

/**
 * Document the finish/iterate stalls observed this session as RAG `agent-stall` cards, then run the
 * SAME flow as the crew_research_stalls capability (stall-research.ts) — recall stalls, crew deliberates
 * on OpenRouter, store the proposal to RAG. (Inlined with deep-relative imports because a root tsx
 * script can't resolve the package's @story-agent/shared/db subpath that the lib uses in production.)
 */
const OBSERVED = [
  { task: 'Reskin /agent diff-view colors (prompt > 600 chars)', note: 'Auto-escalation fired (prompt > 600 chars) → ran the full mission pipeline, then the model replied with TEXT and called 0 tools, so the loop finalized having done nothing.' },
  { task: 'Build no-raw-hex guardrail scripts + fix violations', note: 'Loop authored both scripts then STOPPED to ask permission instead of running fix→check→typecheck. 0 follow-through tool calls on the finish step.' },
  { task: 'Finish diff-view color mapping (explicit 6-mapping edit)', note: 'Auto-escalated, emitted a one-line text plan, then ended with 0 tool calls (escalation-into-inaction).' },
];

(async () => {
  for (const s of OBSERVED) {
    await storeObservationMemory({
      storyId: 'agent-stall',
      source: 'mcp',
      transcript: {
        rounds: [{ title: 'Agent run (STALL — seeded from observed session)', entries: [{ speakerId: 'agent-core', position: 'support', statement: s.task, evidence: ['model:deepseek/deepseek-chat', 'stalled:true'] }] }],
        consensusSummary: `STALL: ${s.note}`,
        unresolvedRisks: ['finish/iterate stall: model produced text with 0 tool calls on an actionable task'],
        finalDecision: 'approved',
        actionItems: ['self-nudge to execute'],
      },
      tags: ['agent-run', 'feedback-card', 'self-learning', 'deepseek/deepseek-chat', 'global', 'stall'],
    });
    console.log('seeded stall card:', s.task.slice(0, 50));
  }
  console.log(`emb=${embeddingSource()} — seeded ${OBSERVED.length} stall cards`);

  const cards = await getRecentObservationMemories(50, 'agent-stall', null);
  const summary = cards.slice(0, 20).map((c, i) => `#${i + 1} ${(c.transcript?.consensusSummary ?? '').slice(0, 180)}`).join('\n');
  const brief = [
    `Observation Lounge — the agent-core loop recorded ${cards.length} STALL card(s): finish/iterate stalls where the model produced TEXT with 0 tool calls on an actionable task (often after auto-escalation injected a plan).`,
    ``, `RECENT STALLS:`, summary, ``,
    `CONVERGE (terse): 1. Data/Geordi/Yar — the recurring PATTERN. 2. ONE concrete low-risk loop.ts fix (tune maxNudges / shouldEscalate length threshold / nudge wording / detect asked-permission). 3. Worf — never bypass WorfGate. 4. Riker highest-leverage; Picard decides. "Make it so."`,
  ].join('\n');

  console.log('--- crew_research_stalls: deliberating on OpenRouter ---');
  const r = await runMissionPipeline(brief);

  await storeObservationMemory({
    storyId: 'stall-research', source: 'mcp',
    transcript: { rounds: [{ title: 'stall research', entries: r.contributions.map((c) => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: [`${cards.length} stalls analyzed; fix pending apply`], finalDecision: 'approved', actionItems: ['apply crew-proposed loop fix', 're-run crew_research_stalls to confirm stalls drop'] },
    tags: ['stall-research', 'self-healing', 'loop', 'crew-fix', 'autonomy'],
  });
  await storeCrewPersonalMemory({ crew_id: 'data', memory_type: 'lesson_learned', title: `Stall research — ${cards.length} stall(s) → loop-fix proposal`, content: r.missionPlan, tags: ['stall-research', 'self-healing', 'loop'], relates_to_crew: ['geordi', 'yar', 'riker', 'picard', 'worf'] });

  console.log(`STALL RESEARCH: stalls=${cards.length} topModel=${r.topModel} cost=$${r.efficiency.totalCostUSD}`);
  console.log('PROPOSAL (first 700 chars):\n' + String(r.missionPlan ?? '').slice(0, 700));
  process.exit(0);
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
