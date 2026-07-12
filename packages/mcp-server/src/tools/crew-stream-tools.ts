/**
 * Crew Stream Tools — real-time operational visibility for warp-speed autonomous teams.
 *
 * Tools:
 * - crew_stream:get-live-status — current state of all crews
 * - crew_stream:subscribe-to-updates — poll for new crew events since last update
 * - crew_stream:get-task-details — detailed results for a specific crew task
 * - crew_stream:escalation-notify — alert on team escalations to Picard
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLiveCrewStatus, readCrewStream, tailCrewStream, type CrewStreamEvent } from '@story-agent/shared';
import { defineSkillTheory } from '@story-agent/shared/skill-theory';

/**
 * Register the crew stream tools with the MCP server.
 */
export function registerCrewStreamTools(server: McpServer): void {
  // Track tail position per session for subscribe-to-updates
  const tailOffsets: Record<string, number> = {};

  // 1. crew_stream:get-live-status
  // Returns current state of all crews executing in parallel
  defineSkillTheory({
    tool: 'crew_stream:get-live-status',
    who: { owner: 'picard' },
    what: { summary: 'Get real-time status dashboard of all active crews', capabilities: ['monitor crew iteration progress', 'track elapsed time', 'display current task and action'] },
    when: { useWhen: ['Display live crew progress in VSCode chat', 'Monitor warp-speed autonomous execution', 'Track elapsed time per crew'] },
    where: { scope: ['crew', 'llm'], surfaces: ['vscode', 'mcp'], sideEffects: 'none' },
    why: { rationale: 'Provide real-time transparency into parallel crew execution without delays', goalsServed: ['visibility', 'warp-speed'] },
    how: { invocation: 'crew_stream:get-live-status({})', annotations: { title: 'Get Live Crew Status', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Current state of all crews with elapsed times' },
  });

  server.tool(
    'crew_stream:get-live-status',
    'Get live status of all executing crews (current task, iteration, elapsed time, last action)',
    {},
    async () => {
      try {
        const status = await getLiveCrewStatus(process.env.CLAUDE_PROJECT_DIR || process.cwd());
        const crewList = Object.values(status);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                active_crews: crewList.length,
                crews: crewList.map((c: any) => ({
                  crew_id: c.crew_id,
                  current_task: c.current_task,
                  current_iteration: c.current_iteration,
                  status: c.status,
                  last_action: c.last_action,
                  elapsed_seconds: c.elapsed_seconds,
                  elapsed_formatted: formatElapsed(c.elapsed_seconds),
                  started_at: c.started_at,
                })),
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error reading crew status: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // 2. crew_stream:subscribe-to-updates
  // Tail the crew stream: return events since last poll
  defineSkillTheory({
    tool: 'crew_stream:subscribe-to-updates',
    who: { owner: 'picard' },
    what: { summary: 'Subscribe to real-time crew progress events (tail since last poll)', capabilities: ['poll for new crew events', 'stream progress updates', 'detect escalations'] },
    when: { useWhen: ['Poll every 2 seconds in VSCode chat', 'Stream crew progress to user live', 'Detect crew escalations immediately'] },
    where: { scope: ['crew', 'llm'], surfaces: ['vscode', 'mcp'], sideEffects: 'none' },
    why: { rationale: 'Enable live feedback without blocking the crew, no artificial delays', goalsServed: ['visibility', 'responsiveness'] },
    how: { invocation: 'crew_stream:subscribe-to-updates({ session_id? })', annotations: { title: 'Subscribe to Crew Updates', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'New crew events since last poll' },
  });

  server.tool(
    'crew_stream:subscribe-to-updates',
    'Poll for new crew progress events since last update (tail mode)',
    {
      session_id: z.string().optional().describe('Optional session ID to track poll position (e.g., VSCode chat session UUID)'),
    },
    async ({ session_id }: any) => {
      try {
        const sessionId = session_id || 'default';
        const lastOffset = tailOffsets[sessionId] || 0;

        const { events, newOffset } = await tailCrewStream(lastOffset, process.env.CLAUDE_PROJECT_DIR || process.cwd());
        tailOffsets[sessionId] = newOffset;

        // Categorize events by status
        const byStatus = events.reduce(
          (acc: Record<string, CrewStreamEvent[]>, e: CrewStreamEvent) => {
            acc[e.status] = (acc[e.status] || []).concat(e);
            return acc;
          },
          {} as Record<string, CrewStreamEvent[]>
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                new_events: events.length,
                events,
                by_status: Object.fromEntries(Object.entries(byStatus).map(([status, es]: [string, unknown]) => [status, (es as CrewStreamEvent[]).length])),
                next_offset: newOffset,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error subscribing to crew updates: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // 3. crew_stream:get-task-details
  // Detailed results for a specific crew task (full iteration history)
  defineSkillTheory({
    tool: 'crew_stream:get-task-details',
    who: { owner: 'picard' },
    what: { summary: 'Get full iteration history and decision points for a specific crew task', capabilities: ['query task events', 'group by iteration', 'review crew decisions'] },
    when: { useWhen: ['User clicks on a crew card to see details', 'Investigate why a team is slow', 'Review all decisions for a task'] },
    where: { scope: ['crew', 'llm'], surfaces: ['vscode', 'mcp'], sideEffects: 'none' },
    why: { rationale: 'Enable detailed inspection of crew execution without surfacing all data in the main stream', goalsServed: ['debuggability', 'transparency'] },
    how: { invocation: 'crew_stream:get-task-details({ crew_id, task_id })', annotations: { title: 'Get Task Details', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Full iteration history for a task' },
  });

  server.tool(
    'crew_stream:get-task-details',
    'Get full iteration history for a specific crew task',
    {
      crew_id: z.string().describe('Crew ID (e.g., riker, geordi, worf, obrien)'),
      task_id: z.string().describe('Task ID (e.g., team_a_e2e, team_b_audit)'),
    },
    async ({ crew_id, task_id }: any) => {
      try {
        const allEvents = await readCrewStream(undefined, process.env.CLAUDE_PROJECT_DIR || process.cwd());

        const taskEvents = allEvents.filter((e: CrewStreamEvent) => e.crew_id === crew_id && e.task_id === task_id);

        if (taskEvents.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No events found for crew=${crew_id} task=${task_id}`,
              },
            ],
          };
        }

        // Group by iteration for summary
        const byIteration = taskEvents.reduce(
          (acc: Record<number, CrewStreamEvent[]>, e: CrewStreamEvent) => {
            acc[e.iteration] = (acc[e.iteration] || []).concat(e);
            return acc;
          },
          {} as Record<number, CrewStreamEvent[]>
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                crew_id,
                task_id,
                total_iterations: Math.max(...taskEvents.map((e: CrewStreamEvent) => e.iteration), 0),
                total_events: taskEvents.length,
                events: taskEvents,
                by_iteration: Object.fromEntries(
                  Object.entries(byIteration).map(([iter, events]: [string, unknown]) => [
                    `iteration_${iter}`,
                    { count: (events as CrewStreamEvent[]).length, statuses: (events as CrewStreamEvent[]).map(e => e.status), actions: (events as CrewStreamEvent[]).map(e => e.action_description) },
                  ])
                ),
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching task details: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // 4. crew_stream:escalation-notify
  // Alert on team escalations to Picard
  defineSkillTheory({
    tool: 'crew_stream:escalation-notify',
    who: { owner: 'picard' },
    what: { summary: 'Check for and alert on any team escalations to Picard', capabilities: ['query escalation events', 'get escalation reasons', 'track proposed fixes'] },
    when: { useWhen: ['Monitor for RED escalations', 'Alert Admiral immediately on crew blockers', 'Track escalation trend'] },
    where: { scope: ['crew', 'llm'], surfaces: ['vscode', 'mcp'], sideEffects: 'none' },
    why: { rationale: 'Ensure Admiral sees critical escalations immediately, not buried in event stream', goalsServed: ['alerting', 'incident-response'] },
    how: { invocation: 'crew_stream:escalation-notify({ since_timestamp? })', annotations: { title: 'Check Escalations', readOnlyHint: true, idempotentHint: true, openWorldHint: false }, output: 'Active escalations with reasons and proposed fixes' },
  });

  server.tool(
    'crew_stream:escalation-notify',
    'Check for crew escalations and get details',
    {
      since_timestamp: z.string().optional().describe('Optional ISO timestamp; only return escalations after this time'),
    },
    async ({ since_timestamp }: any) => {
      try {
        const allEvents = await readCrewStream(undefined, process.env.CLAUDE_PROJECT_DIR || process.cwd());

        const escalations = allEvents.filter((e: CrewStreamEvent) => e.status === 'escalation');

        // Filter by time if provided
        let filtered = escalations;
        if (since_timestamp) {
          const sinceTime = new Date(since_timestamp).getTime();
          filtered = escalations.filter((e: CrewStreamEvent) => new Date(e.timestamp).getTime() >= sinceTime);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                active_escalations: filtered.length,
                escalations: filtered.map((e: CrewStreamEvent) => ({
                  crew_id: e.crew_id,
                  task_id: e.task_id,
                  iteration: e.iteration,
                  reason: e.escalation_reason || e.action_description,
                  proposed_fix: e.proposed_fix || '(pending)',
                  timestamp: e.timestamp,
                  time_ago: timeAgo(new Date(e.timestamp)),
                })),
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error checking escalations: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Format elapsed seconds as human-readable string.
 */
function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Format time difference as "X ago" string.
 */
function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
