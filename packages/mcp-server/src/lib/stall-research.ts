/**
 * Self-healing research loop — closes ask #3 end-to-end (crew-autonomy mission). The agent-core loop
 * records a `stall` card to RAG whenever it self-nudges out of a finish/iterate stall (model produced
 * text + 0 tool calls on an actionable task). This capability RECALLS those cards, convenes the CREW
 * (runMissionPipeline on OpenRouter — the substantive analysis stays off Anthropic), and asks them to
 * find the recurring pattern + propose a concrete loop fix, then DOCUMENTS the research back to RAG so
 * the crew accumulates its own remediation knowledge.
 */
import { getRecentObservationMemories, storeObservationMemory, storeCrewPersonalMemory } from '@story-agent/shared/db';
import { runMissionPipeline } from './crew-mission-pipeline.js';

export interface StallResearchResult {
  stallCount: number;
  proposal: string | null;
  costUSD: number;
  topModel: string | null;
}

/** Recall stall cards, have the crew research the pattern + propose a loop fix, and store it to RAG. */
export async function researchStalls(opts: { limit?: number; clientId?: string | null } = {}): Promise<StallResearchResult> {
  const limit = opts.limit ?? 50;
  const cards = await getRecentObservationMemories(limit, 'agent-stall', opts.clientId ?? null);
  if (!cards.length) {
    return { stallCount: 0, proposal: null, costUSD: 0, topModel: null };
  }

  const summary = cards
    .slice(0, 20)
    .map((c, i) => `#${i + 1} [${c.createdAt ?? ''}] ${(c.transcript?.consensusSummary ?? '').slice(0, 180)}`)
    .join('\n');

  const brief = [
    `Observation Lounge — the agent-core loop recorded ${cards.length} STALL card(s): finish/iterate stalls where the model produced TEXT with 0 tool calls on an actionable task (often right after auto-escalation injected a plan), and the loop self-nudged.`,
    ``,
    `RECENT STALLS:`,
    summary,
    ``,
    `CONVERGE (terse, decisive):`,
    `1. Data/Geordi/Yar — find the recurring PATTERN across these stalls (escalation-into-inaction? a model that under-calls tools? prompt length? a specific tool?).`,
    `2. Propose ONE concrete, low-risk loop fix: e.g. tune maxNudges, lower/raise the shouldEscalate length threshold, sharpen the nudge wording, detect "asked-permission" as a stall, or prefer apply_patch for multi-edit. Name the exact change in loop.ts.`,
    `3. Worf — confirm the fix never bypasses WorfGate.`,
    `4. Riker — the single highest-leverage change; Picard decides. "Make it so."`,
  ].join('\n');

  const r = await runMissionPipeline(brief);

  // Document the research to RAG (crew-wide + a per-member lesson) so remediation knowledge accrues.
  await storeObservationMemory({
    storyId: 'stall-research',
    source: 'mcp',
    transcript: {
      rounds: [{ title: 'stall research', entries: r.contributions.map((c) => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }],
      consensusSummary: r.missionPlan,
      unresolvedRisks: [`${cards.length} stalls analyzed; proposed loop fix pending apply`],
      finalDecision: 'approved',
      actionItems: ['apply the crew-proposed loop fix', 're-run crew_research_stalls after the fix to confirm stalls drop'],
    },
    tags: ['stall-research', 'self-healing', 'loop', 'crew-fix', 'autonomy'],
  });
  await storeCrewPersonalMemory({
    crew_id: 'data',
    memory_type: 'lesson_learned',
    title: `Stall research — ${cards.length} stall(s) → loop-fix proposal (${new Date().toISOString().slice(0, 10)})`,
    content: r.missionPlan,
    tags: ['stall-research', 'self-healing', 'loop'],
    relates_to_crew: ['geordi', 'yar', 'riker', 'picard', 'worf'],
  });

  return { stallCount: cards.length, proposal: r.missionPlan, costUSD: r.efficiency.totalCostUSD, topModel: r.topModel };
}
