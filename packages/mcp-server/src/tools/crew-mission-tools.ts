import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import { storeObservationMemory } from '@story-agent/shared/db';

/**
 * Exposes the full 6-stage crew cognitive pipeline as an MCP tool:
 *   Picard intake (top-tier) → Riker assemble → Quark per-member models →
 *   crew execute (lounge) → Quark efficiency report → Picard mission plan (top-tier).
 *
 * Anthropic is used only where Quark's tiering selects it; everything else routes to
 * cheaper providers. The full result (goals, team, efficiency, mission plan) is stored
 * to cloud RAG so the crew can recall and autonomously execute the plan.
 */
export function registerCrewMissionTools(server: McpServer): void {
  server.tool(
    'run_crew_mission_pipeline',
    [
      'Run the full crew cognitive pipeline on a natural-language request.',
      'Picard distills goals (top-tier model), Riker assembles the team, Quark assigns each member the',
      'cheapest adequate OpenRouter model, the crew contributes Observation-Lounge style, Quark reports',
      'token/cost efficiency per member+provider, and Picard synthesizes a concrete mission plan (top-tier).',
      'The result is stored to cloud RAG for recall. Anthropic is a pool member, not the default.',
    ].join(' '),
    {
      input: z.string().describe('The natural-language request / mission brief for the crew to plan.'),
      clientId: z.string().optional().describe('Optional client org ID to scope RAG storage (e.g. "familiarcat").'),
      store: z.boolean().optional().default(true).describe('If true (default), store goals + plan + efficiency to cloud RAG.'),
    },
    async ({ input, clientId, store }) => {
      try {
        const result = await runMissionPipeline(input);
        const resolvedClientId = clientId ?? null;

        if (store) {
          // Shape the pipeline output into an ObservationDebateResult for RAG storage.
          const transcript = {
            rounds: [
              {
                title: `Picard intake (${result.topModel}) — distilled goals`,
                entries: [{
                  speakerId: 'picard',
                  position: 'support' as const,
                  statement: result.goals,
                  evidence: result.team.map(m => `${m.crewId} (${m.domain}) → ${m.model} [${m.provider}] · tier ${m.capabilityTier}`),
                }],
              },
              {
                title: 'Crew contributions (Observation Lounge)',
                entries: result.contributions.map(c => ({
                  speakerId: c.crewId,
                  position: 'support' as const,
                  statement: c.text,
                  evidence: [`model: ${c.model}`, `cost: $${c.costUSD.toFixed(5)}`],
                })),
              },
            ],
            consensusSummary: result.missionPlan,
            unresolvedRisks: [],
            finalDecision: 'approved' as const,
            actionItems: [
              `Quark efficiency: ~$${result.efficiency.totalCostUSD} across ${result.efficiency.totalTokens} tokens`,
              `Provider mix: ${JSON.stringify(result.efficiency.perProvider)}`,
            ],
          };

          await storeObservationMemory({
            storyId: 'mission-pipeline',
            clientId: resolvedClientId,
            source: 'mcp',
            transcript,
            missionReference: 'mission-pipeline',
            tags: ['mission-pipeline', 'observation-lounge', 'cost-optimized', resolvedClientId ?? 'global'],
          });
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ status: 'success', stored: !!store, ...result }, null, 2),
          }],
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ status: 'failed', error: errorMsg }, null, 2) }],
          isError: true,
        };
      }
    }
  );
}
