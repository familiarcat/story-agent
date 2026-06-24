/**
 * Bridges wire agent-core's optional capabilities (RAG recall, crew escalation, self-learning
 * feedback) to the real subsystems. Surfaces (CLI/API/VS Code) call buildBridges() so every
 * surface gets identical behavior — the whole point of the unification.
 */
import { getRelevantObservationMemories, storeObservationMemory } from '@story-agent/shared/db';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import type { ToolContext } from './tools.js';
import type { RunAgentOptions } from './loop.js';

export function buildBridges(
  clientId: string | null,
): Pick<ToolContext, 'ragRecall' | 'crewDeliberate'> & Pick<RunAgentOptions, 'recordFeedback'> {
  return {
    ragRecall: async (query: string, limit: number) => {
      const memories = await getRelevantObservationMemories({ queryText: query, clientId, limit });
      if (!memories.length) return '(no relevant crew memories)';
      return memories
        .map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 400) ?? ''}`)
        .join('\n\n');
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
      await storeObservationMemory({
        storyId: 'agent-run',
        clientId,
        source: 'mcp',
        transcript: {
          rounds: [{
            title: 'Agent run',
            entries: [{ speakerId: 'agent-core', position: 'support', statement: card.input, evidence: [`model:${card.model}`, `lens:${card.lens}`, `tools:${card.toolsUsed.join(',')}`] }],
          }],
          consensusSummary: `${card.outcome} — ${postureLine}, ${card.iterations} turns, ${card.toolsUsed.length} tools, ~$${card.costUSD.toFixed(5)}${card.escalated ? ', escalated' : ''}.`,
          unresolvedRisks: [],
          finalDecision: 'approved',
          actionItems: card.toolsUsed,
        },
        missionReference: 'agent-run',
        tags: ['agent-run', 'feedback-card', 'self-learning', card.model, clientId ?? 'global'],
      });
    },
  };
}
