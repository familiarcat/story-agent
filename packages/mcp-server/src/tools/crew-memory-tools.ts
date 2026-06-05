import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getRecentObservationMemories } from '@story-agent/shared/db';
import { promptArchive, getPromptEngineStats, exportPromptArchive } from '../lib/prompt-archiver.js';

/**
 * Crew memory analysis tools for querying and summarizing observation lounge debate patterns.
 * Enables the crew to learn collectively from past missions and identify trends.
 */
export function registerCrewMemoryTools(server: McpServer) {
  server.tool(
    'memory_sync_diagnostics',
    'Show Redis-to-Supabase memory sync health: queue depth, worker status, last sync success/failure, and throughput counters.',
    {},
    async () => {
      const dbModule = await import('@story-agent/shared/db');
      const diagnosticsFn = (dbModule as any).getObservationMemorySyncDiagnostics as
        | (() => Promise<unknown>)
        | undefined;

      if (!diagnosticsFn) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  error: 'getObservationMemorySyncDiagnostics is not available from shared/db',
                  hint: 'Build @story-agent/shared to refresh package exports.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const diagnostics = await diagnosticsFn();

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(diagnostics, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'summarize_crew_memory_trends',
    'Query and analyze crew observation lounge debate memories to identify patterns, recurring risks, and consensus trends across missions. Helps the crew learn collectively from prior debates.',
    {
      lookbackDays: z.number().optional().default(30).describe('How many days of memory history to analyze'),
      limit: z.number().optional().default(10).describe('Maximum number of memories to retrieve and analyze'),
      focusRoles: z.string().optional().describe('Comma-separated crew roles to focus analysis on (e.g. security,engineering)'),
    },
    async ({ lookbackDays, limit, focusRoles }) => {
      const memories = await getRecentObservationMemories(limit);

      // Filter by date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
      const recentMemories = memories.filter(m => new Date(m.createdAt) >= cutoffDate);

      // Aggregate findings
      const allRisks = new Map<string, number>();
      const allDecisions: Record<string, number> = { approved: 0, revise: 0, blocked: 0 };
      const roleParticipation = new Map<string, number>();
      const consensusPatterns: string[] = [];
      const unresolvedTrends: string[] = [];

      for (const memory of recentMemories) {
        // Track decision distribution
        const decision = memory.transcript.finalDecision as keyof typeof allDecisions;
        if (decision in allDecisions) {
          allDecisions[decision] = (allDecisions[decision] ?? 0) + 1;
        }

        // Aggregate risks
        for (const risk of memory.transcript.unresolvedRisks) {
          allRisks.set(risk, (allRisks.get(risk) ?? 0) + 1);
        }

        // Track consensus patterns
        if (memory.transcript.consensusSummary) {
          consensusPatterns.push(memory.transcript.consensusSummary);
        }

        // Track unresolved risks
        if (memory.transcript.unresolvedRisks.length > 0) {
          unresolvedTrends.push(...memory.transcript.unresolvedRisks);
        }
      }

      const topRisks = Array.from(allRisks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([risk, count]) => ({
          risk,
          frequency: count,
          percentage: recentMemories.length > 0 ? ((count / recentMemories.length) * 100).toFixed(1) : '0',
        }));

      const summary = {
        period: `Last ${lookbackDays} days`,
        memoriesAnalyzed: recentMemories.length,
        decisionBreakdown: allDecisions,
        approvalRate:
          recentMemories.length > 0 ? ((allDecisions.approved / recentMemories.length) * 100).toFixed(1) : '0',
        topRisks,
        consensusThemes: Array.from(new Set(consensusPatterns)).slice(0, 3),
        unresolvedRiskFrequency: unresolvedTrends.length,
        recommendations: [
          ...(topRisks.length > 0
            ? [`Focus on recurring risks: ${topRisks
                .map(r => r.risk)
                .join(', ')}`]
            : []),
          ...(allDecisions.revise > allDecisions.approved
            ? ['Increase discovery cycles before approval to reduce revisions']
            : []),
          ...(unresolvedTrends.length > recentMemories.length * 0.5
            ? ['High unresolved risk rate; strengthen validation gates']
            : []),
        ],
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_crew_memory_for_scenario',
    'Retrieve relevant crew memories for a specific scenario or risk area. Useful for consulting prior experience before making decisions.',
    {
      scenario: z.string().describe('Description of the scenario or risk area to find relevant memories for (e.g., "API security issues", "database migrations")'),
      limit: z.number().optional().default(5).describe('Maximum number of relevant memories to return'),
    },
    async ({ scenario, limit }) => {
      const { getRelevantObservationMemories } = await import('@story-agent/shared/db');
      const relevantMemories = await getRelevantObservationMemories({
        queryText: scenario,
        limit,
      });

      const summary = {
        scenario,
        relevantMemoriesFound: relevantMemories.length,
        memories: relevantMemories.map(m => ({
          date: m.createdAt,
          finalDecision: m.transcript.finalDecision,
          consensusSummary: m.transcript.consensusSummary,
          unresolvedRisks: m.transcript.unresolvedRisks.slice(0, 3),
          actionItems: m.transcript.actionItems.slice(0, 2),
          similarity: m.similarity?.toFixed(3),
        })),
        synthesizedInsight:
          relevantMemories.length > 0
            ? `Based on ${relevantMemories.length} prior memories, crew has ${
                relevantMemories.filter(m => m.transcript.finalDecision === 'approved').length
              } approved and ${relevantMemories.filter(m => m.transcript.finalDecision === 'revise').length} revision-required scenarios in similar contexts. Key recurring risks: ${Array.from(
                new Set(
                  relevantMemories
                    .flatMap(m => m.transcript.unresolvedRisks)
                    .slice(0, 3)
                )
              ).join(', ')}`
            : 'No prior relevant memories found. This may be a novel scenario for the crew.',
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );

  // ── PROMPT ARCHIVAL TOOLS ────────────────────────────────────────────────

  server.tool(
    'crew_prompt_statistics',
    'Get comprehensive statistics on LLM prompt usage across all crew members - costs, tokens, execution times, and performance metrics',
    {},
    async () => {
      const stats = getPromptEngineStats();
      return {
        content: [
          {
            type: 'text',
            text: `PROMPT ENGINE STATISTICS:

Total Executions: ${stats.totalPrompts}
Total Tokens: ${stats.totalTokens.toLocaleString()}
Total Cost: $${stats.totalCost.toFixed(4)}
Average Duration: ${stats.avgDuration.toFixed(0)}ms
Errors: ${stats.errorCount}

BY CREW MEMBER:
${Object.entries(stats.byCrewId)
  .map(
    ([crewId, data]: [string, any]) =>
      `  ${crewId.padEnd(10)} | Executions: ${data.count} | Tokens: ${data.tokens} | Cost: $${data.cost.toFixed(4)}`
  )
  .join('\n')}

BY MODEL:
${Object.entries(stats.byModel)
  .map(
    ([model, data]: [string, any]) =>
      `  ${model.padEnd(20)} | Executions: ${data.count} | Tokens: ${data.tokens} | Cost: $${data.cost.toFixed(4)}`
  )
  .join('\n')}`,
          },
        ],
      };
    }
  );

  server.tool(
    'crew_prompt_history',
    'Retrieve recent prompt usage records for auditing and debugging - shows which LLM calls were made',
    {
      limit: z.number().optional().describe('Number of recent records to retrieve (default: 20)'),
    },
    async (args) => {
      const records = promptArchive.getRecent(args.limit || 20);
      const formatted = records
        .map(
          r =>
            `[${r.executedAt}] ${r.crewId.padEnd(10)} | ${r.templateId.padEnd(30)} | Story: ${r.storyRef} | Tokens: ${r.tokens.total} | Cost: $${r.costUSD.toFixed(4)} | ${r.durationMs}ms`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `RECENT PROMPT USAGE (${records.length} records):\n\n${formatted}`,
          },
        ],
      };
    }
  );

  server.tool(
    'crew_member_prompt_history',
    'Get all prompt usage records for a specific crew member - audit trail of their LLM calls',
    {
      crewId: z.string().describe('Crew member ID (picard, data, riker, geordi, obrien, worf, yar, troi, crusher, uhura, quark)'),
    },
    async (args) => {
      const records = promptArchive.getCrewRecords(args.crewId);
      const stats = {
        total: records.length,
        totalTokens: records.reduce((sum, r) => sum + r.tokens.total, 0),
        totalCost: records.reduce((sum, r) => sum + r.costUSD, 0),
        avgDuration: records.length > 0 ? records.reduce((sum, r) => sum + r.durationMs, 0) / records.length : 0,
        errors: records.filter(r => r.error).length,
      };

      const formatted = records
        .slice(-10)
        .map(r => `  [${r.executedAt}] ${r.storyRef} | Tokens: ${r.tokens.total} | $${r.costUSD.toFixed(4)} | ${r.durationMs}ms${r.error ? ` | ERROR: ${r.error}` : ''}`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `CREW MEMBER PROMPT AUDIT: ${args.crewId}

Statistics:
  Total Executions: ${stats.total}
  Total Tokens: ${stats.totalTokens.toLocaleString()}
  Total Cost: $${stats.totalCost.toFixed(4)}
  Average Duration: ${stats.avgDuration.toFixed(0)}ms
  Errors: ${stats.errors}

Recent Records (last 10):
${formatted}`,
          },
        ],
      };
    }
  );

  server.tool(
    'crew_story_prompt_audit',
    'Get all prompts and LLM calls used for a specific story - complete audit trail of system prompts',
    {
      storyRef: z.string().describe('Story reference number (e.g., STORY-123)'),
    },
    async (args) => {
      const records = promptArchive.getStoryRecords(args.storyRef);
      const stats = {
        total: records.length,
        totalCost: records.reduce((sum, r) => sum + r.costUSD, 0),
        byCrewId: {} as Record<string, number>,
      };

      for (const r of records) {
        stats.byCrewId[r.crewId] = (stats.byCrewId[r.crewId] || 0) + 1;
      }

      const formatted = records
        .map(r => `  ${r.crewId.padEnd(10)} | ${r.model.padEnd(20)} | Tokens: ${r.tokens.total} | $${r.costUSD.toFixed(4)} | ${r.durationMs}ms`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `STORY PROMPT AUDIT: ${args.storyRef}

Statistics:
  Total Crew Members: ${records.length}
  Total Cost: $${stats.totalCost.toFixed(4)}

Crew Members Involved:
${Object.entries(stats.byCrewId)
  .map(([crewId, count]) => `  ${crewId}: ${count} call${count !== 1 ? 's' : ''}`)
  .join('\n')}

Detailed Records:
${formatted}`,
          },
        ],
      };
    }
  );

  server.tool(
    'crew_efficiency_analysis',
    'Analyze efficiency metrics for crew members - cost per execution, token efficiency, performance',
    {},
    async () => {
      const stats = getPromptEngineStats();

      const efficiency = Object.entries(stats.byCrewId).map(([crewId, data]: [string, any]) => ({
        crewId,
        executions: data.count,
        totalTokens: data.tokens,
        totalCost: data.cost,
        avgTokensPerCall: data.count > 0 ? Math.round(data.tokens / data.count) : 0,
        avgCostPerCall: data.count > 0 ? (data.cost / data.count).toFixed(4) : 0,
      }));

      // Sort by total cost descending
      efficiency.sort((a, b) => b.totalCost - a.totalCost);

      const formatted = efficiency
        .map(
          e =>
            `${e.crewId.padEnd(10)} | Execs: ${String(e.executions).padStart(3)} | Tokens: ${String(e.totalTokens).padStart(6)} | Cost: $${String(e.totalCost.toFixed(4)).padStart(8)} | Avg: ${String(e.avgTokensPerCall).padStart(4)} tokens/$${e.avgCostPerCall}/call`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `CREW EFFICIENCY ANALYSIS:

${formatted}

Total Across All Crew: $${stats.totalCost.toFixed(4)} | ${stats.totalTokens.toLocaleString()} tokens | ${stats.totalPrompts} executions`,
          },
        ],
      };
    }
  );
}
