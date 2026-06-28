import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runInnovationLounge, formatInnovationLoungeAsMarkdown } from '../lib/innovation-lounge.js';
import { storeCrewPersonalMemory, storeObservationMemory } from '@story-agent/shared/db';

/**
 * Innovation Lounge MCP tool — the crew's creative jam + debate, on demand.
 *
 * Each of the 11 crew members invents an original project in their canonical persona, every member
 * debates the slate, and Picard resolves a portfolio. Pitches + synthesis are stored to cloud RAG
 * (RAG persistence injected from @story-agent/shared/db — the engine itself has no db import).
 * Frugal: every member runs on their Quark-selected cheapest-adequate OpenRouter model.
 */
export function registerInnovationLoungeTools(server: McpServer): void {
  server.tool(
    'run_innovation_lounge',
    [
      'Run the crew Innovation Lounge: each of the 11 crew members invents an ORIGINAL project in their',
      'canonical persona, the crew debates the full slate (endorse / challenge / synergy), and Picard',
      'resolves a portfolio (pursue now / next / park) with preserved dissent. Generative + deliberative,',
      'unlike the self-reflection Observation Lounge. Pitches + synthesis stored to cloud RAG. Frugal:',
      'each member runs on their Quark-selected cheapest-adequate OpenRouter model. Anthropic only for tier-4.',
    ].join(' '),
    {
      theme: z.string().optional().describe('Optional arena/theme for the jam (defaults to the future of the Story Agent platform + firm).'),
      store: z.boolean().optional().default(true).describe('If true (default), store each pitch + the session synthesis to cloud RAG.'),
    },
    async ({ theme, store }) => {
      try {
        const result = await runInnovationLounge({
          theme,
          store,
          deps: { storeCrewPersonalMemory, storeObservationMemory },
        });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              status: 'success',
              stored: !!store,
              observationMemoryId: result.observationMemoryId,
              theme: result.theme,
              pitches: result.pitches.map((p) => ({ crewId: p.crewId, projectName: p.projectName, elevatorPitch: p.elevatorPitch, model: p.model })),
              portfolio: result.portfolio,
              dissent: result.dissent,
              synthesis: result.synthesis,
              efficiency: result.efficiency,
              markdown: formatInnovationLoungeAsMarkdown(result),
            }, null, 2),
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
