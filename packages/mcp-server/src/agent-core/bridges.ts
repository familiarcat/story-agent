/**
 * Bridges wire agent-core's optional capabilities (RAG recall, crew escalation, self-learning
 * feedback) to the real subsystems. Surfaces (CLI/API/VS Code) call buildBridges() so every
 * surface gets identical behavior — the whole point of the unification.
 */
import { getRelevantObservationMemories, storeObservationMemory, searchDocumentation } from '@story-agent/shared/db';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import type { ToolContext } from './tools.js';
import type { RunAgentOptions } from './loop.js';

export function buildBridges(
  clientId: string | null,
): Pick<ToolContext, 'ragRecall' | 'crewDeliberate'> & Pick<RunAgentOptions, 'recordFeedback'> {
  return {
    ragRecall: async (query: string, limit: number) => {
      // The crew recalls TWO corpora: prior decisions (observation memory) AND the project's
      // documentation (the "contemplative basis"), so docs inform autonomous decision-making.
      const [memories, docs] = await Promise.all([
        getRelevantObservationMemories({ queryText: query, clientId, limit }),
        searchDocumentation(query, undefined, 4).catch(() => []),
      ]);
      const memBlock = memories.length
        ? memories.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 400) ?? ''}`).join('\n\n')
        : '';
      const docBlock = docs.length
        ? '\n\nRELEVANT DOCS:\n' + docs.map((d: any) => `• [${d.source_path ?? d.title}] ${(d.chunk_content ?? '').slice(0, 300)}`).join('\n')
        : '';
      const out = (memBlock + docBlock).trim();
      return out || '(no relevant crew memories or docs)';
    },
    crewDeliberate: async (brief: string) => {
      const r = await runMissionPipeline(brief);
      return [
        `GOALS:\n${r.goals}`,
        `TEAM: ${r.team.map(m => `${m.crewId}->${m.model}`).join(', ')}`,
        `MISSION PLAN:\n${r.missionPlan}`,
        `(crew cost ~$${r.efficiency.totalCostUSD}, ${r.efficiency.totalTokens} tokens)`,
      ].join('\n\n');
    },
    // Layer-4 self-learning: persist each run as an explainable feedback card to cloud RAG, so
    // rag_recall can surface "we did a similar task before, here's how it went" on future runs.
    recordFeedback: async (card) => {
      const postureLine = `WorfGate 🟢${card.posture.green}/🟡${card.posture.yellow}/🔴${card.posture.red}`;
      const orderLine = card.orderAudit
        ? `OrderGate token ${card.orderAudit.token} — precondition:${card.orderAudit.preconditionSatisfied ? 'met' : 'missing'}, blockedMutations:${card.orderAudit.blockedMutations}`
        : 'OrderGate token unavailable';
      // Self-healing: a stalled run is recorded as a "stall card" so the crew can RESEARCH recurring
      // stalls and propose a fix themselves (recall via the 'stall' tag).
      await storeObservationMemory({
        storyId: card.stalled ? 'agent-stall' : 'agent-run',
        clientId,
        source: 'mcp',
        transcript: {
          rounds: [{
            title: card.stalled ? 'Agent run (STALL detected + self-nudged)' : 'Agent run',
            entries: [{ speakerId: 'agent-core', position: 'support', statement: card.input, evidence: [`model:${card.model}`, `lens:${card.lens}`, `tools:${card.toolsUsed.join(',')}`, `stalled:${card.stalled}`, orderLine, ...(card.orderAudit?.steps?.slice(-5) ?? []).map((s) => `step:${s}`)] }],
          }],
          consensusSummary: `${card.outcome} — ${postureLine}, ${orderLine}, ${card.iterations} turns, ${card.toolsUsed.length} tools, ~$${card.costUSD.toFixed(5)}${card.escalated ? ', escalated' : ''}${card.stalled ? ', STALLED→nudged' : ''}.`,
          unresolvedRisks: card.stalled ? ['finish/iterate stall: model produced text with 0 tool calls on an actionable task'] : [],
          finalDecision: card.orderAudit && !card.orderAudit.preconditionSatisfied && card.orderAudit.blockedMutations > 0 ? 'revise' : 'approved',
          actionItems: [
            ...card.toolsUsed,
            ...(card.orderAudit ? [`order-gate-token:${card.orderAudit.token}`, `order-gate-blocked:${card.orderAudit.blockedMutations}`] : []),
          ],
        },
        missionReference: card.stalled ? 'agent-stall' : 'agent-run',
        tags: [
          'agent-run',
          'feedback-card',
          'self-learning',
          'order-gate',
          card.model,
          clientId ?? 'global',
          ...(card.stalled ? ['stall'] : []),
          ...(card.orderAudit && card.orderAudit.blockedMutations > 0 ? ['order-gate-blocked'] : ['order-gate-pass']),
        ],
      });
    },
  };
}
