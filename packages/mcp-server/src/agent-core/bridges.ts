/**
 * Bridges wire agent-core's optional capabilities (RAG recall, crew escalation) to the real
 * subsystems. Surfaces (CLI/API/VS Code) call buildBridges() so every surface gets identical
 * behavior — the whole point of the unification.
 */
import { getRelevantObservationMemories } from '@story-agent/shared/db';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import type { ToolContext } from './tools.js';

export function buildBridges(clientId: string | null): Pick<ToolContext, 'ragRecall' | 'crewDeliberate'> {
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
  };
}
