/**
 * Crew Integrity MCP Tools — Ensure No One Is Left Behind
 *
 * These tools allow the crew to:
 * 1. Check crew member status individually
 * 2. Generate full integrity reports
 * 3. Automatically recover missing crew members
 * 4. Monitor crew presence over time
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  checkCrewMemberStatus,
  generateCrewIntegrityReport,
  initializeMissingCrewMember,
  recoverAllMissingCrewMembers,
  getCrewIntegritySummary,
  recoverCrewMemberMemories,
} from '../lib/crew-integrity.js';

export function registerCrewIntegrityTools(server: McpServer) {
  server.tool(
    'check_crew_member_status',
    'Check if a crew member is properly initialized across Supabase, personas, and skill manifests. Used to detect missing or uninitialized crew members.',
    {
      crewId: z
        .enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
    },
    async (args) => {
      const status = await checkCrewMemberStatus(args.crewId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                crewMemberStatus: status,
                isPresent: status.status === 'present',
                diagnostics: status.diagnostics,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'crew_integrity_report',
    'Generate a comprehensive integrity report for all 11 crew members. Shows who is present, who is missing, and who needs initialization. Use this regularly to ensure no crew member is left behind.',
    {},
    async () => {
      const report = await generateCrewIntegrityReport();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                report,
                allCrewPresent: report.allCrewPresent,
                missingCrew: report.crewStatuses.filter(s => s.status !== 'present'),
                presentCrew: report.crewStatuses.filter(s => s.status === 'present').map(s => s.fullName),
                recommendedActions: report.recoveryActions,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'initialize_missing_crew_member',
    'Initialize a missing or uninitialized crew member across all systems (Supabase personas, skill manifests). This pulls them back into the crew.',
    {
      crewId: z
        .enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
    },
    async (args) => {
      const result = await initializeMissingCrewMember(args.crewId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: result.success,
                crewId: result.crewId,
                message: result.message,
                personaInitialized: result.personaInitialized,
                skillManifestInitialized: result.skillManifestInitialized,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'recover_all_missing_crew_members',
    'Autonomously detect all missing crew members and recover them. This is an all-hands operation to ensure all 11 crew members are present and initialized. In this starship, we leave no one behind.',
    {},
    async () => {
      const result = await recoverAllMissingCrewMembers();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: result.totalAttempted === 0 || result.successfulRecoveries > 0,
                totalAttempted: result.totalAttempted,
                successfulRecoveries: result.successfulRecoveries,
                failedRecoveries: result.failedRecoveries,
                recoveredCrew: result.recoveredCrew.map(id => `${id}`),
                finalReport: result.report,
                allCrewNowPresent: result.report.allCrewPresent,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'get_crew_integrity_summary',
    'Get a human-readable summary of crew integrity status. Shows which crew members are present and which are missing.',
    {},
    async () => {
      const summary = await getCrewIntegritySummary();
      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    }
  );

  server.tool(
    'recover_crew_member_memories',
    'Recover a crew member\'s personal memories and accumulated learnings. Checks if they have previous skill versions in the database and restores learning history. Use this to understand what a crew member has learned in previous missions.',
    {
      crewId: z
        .enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
    },
    async (args) => {
      const recovery = await recoverCrewMemberMemories(args.crewId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                crewId: args.crewId,
                hasMemories: recovery.hasMemories,
                previousVersion: recovery.previousVersion,
                recoveredLearnings: recovery.recoveredImprovementNotes?.length ?? 0,
                learnings: recovery.recoveredImprovementNotes ?? [],
                lastImprovedAt: recovery.lastImprovedAt,
                diagnostics: recovery.diagnostics,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
