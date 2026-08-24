/**
 * Crew Personal Context Tool - MCP interface for canonical profile queries
 * Enables crew members to answer personal, relational, and biographical questions
 * from an authentically canonical perspective grounded in Memory Alpha sources.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getPersonalContext,
  PersonalContextQuery,
  getPersonalContextBatch,
  getCrewQuotes,
  getDecisionPatterns,
  getRelationshipMatrix,
} from '../lib/crew-personal-context.js';
import { getAllCrewProfiles, CrewMemberId } from '../lib/crew-canonical-profiles.js';

// Valid crew member IDs
const crewMemberIds = [
  'picard', 'riker', 'worf', 'data', 'geordi',
  'deanna', 'beverly', 'tasha', 'obrien', 'quark', 'uhura',
] as const;

const CrewMemberSchema = z.enum(crewMemberIds);

export function registerCrewPersonalContextTools(server: McpServer): void {
  try {
    // Single personal context query
    server.tool(
      'crew_personal_context',
      'Query a crew member personal context - answers biographical, relational, or emotional questions from canonical perspective.',
      {
        asCrewMember: CrewMemberSchema,
        question: z.string().min(1).describe('Question about personal background, relationships, trauma, or strengths'),
      },
      async (args) => {
        const query: PersonalContextQuery = {
          asCrewMember: args.asCrewMember as CrewMemberId,
          question: args.question,
        };

        const response = getPersonalContext(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    );

    process.stderr.write('✅ Registered: Crew Personal Context Tool\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    process.stderr.write(`❌ Failed to register crew personal context tool: ${error}\n`);
  }

  try {
    // Batch query for multiple questions
    server.tool(
      'crew_personal_context_batch',
      'Query multiple crew member personal contexts at once - process multiple biographical/relational questions.',
      {
        queries: z.array(
          z.object({
            asCrewMember: CrewMemberSchema,
            question: z.string().min(1),
          })
        ).min(1).describe('Array of personal context queries'),
      },
      async (args) => {
        const queries: PersonalContextQuery[] = args.queries.map(q => ({
          asCrewMember: q.asCrewMember as CrewMemberId,
          question: q.question,
        }));

        const responses = getPersonalContextBatch(queries);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responses, null, 2),
            },
          ],
        };
      }
    );

    process.stderr.write('✅ Registered: Crew Personal Context Batch Tool\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    process.stderr.write(`❌ Failed to register crew personal context batch tool: ${error}\n`);
  }

  try {
    // Get crew member profile summary
    server.tool(
      'crew_profile_summary',
      'Get complete canonical profile for a crew member including biography, expertise, trauma, relationships.',
      {
        crewMember: CrewMemberSchema,
      },
      async (args) => {
        const allProfiles = getAllCrewProfiles();
        const profile = allProfiles.find(p =>
          p.name.toLowerCase().includes(args.crewMember)
        );

        if (!profile) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `No profile found for crew member: ${args.crewMember}` }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      }
    );

    process.stderr.write('✅ Registered: Crew Profile Summary Tool\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    process.stderr.write(`❌ Failed to register crew profile summary tool: ${error}\n`);
  }

  try {
    // Get crew decision patterns
    server.tool(
      'crew_decision_patterns',
      'Get how a specific crew member typically approaches decisions based on canonical character patterns.',
      {
        crewMember: CrewMemberSchema,
      },
      async (args) => {
        const patterns = getDecisionPatterns(args.crewMember as CrewMemberId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  crewMember: args.crewMember,
                  decisionPatterns: patterns,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    process.stderr.write('✅ Registered: Crew Decision Patterns Tool\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    process.stderr.write(`❌ Failed to register crew decision patterns tool: ${error}\n`);
  }

  try {
    // Get crew authentic quotes
    server.tool(
      'crew_canonical_quotes',
      'Get authentic canon dialogue samples for a crew member for voice consistency.',
      {
        crewMember: CrewMemberSchema,
      },
      async (args) => {
        const quotes = getCrewQuotes(args.crewMember as CrewMemberId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  crewMember: args.crewMember,
                  quotes: quotes,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    process.stderr.write('✅ Registered: Crew Canonical Quotes Tool\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    process.stderr.write(`❌ Failed to register crew canonical quotes tool: ${error}\n`);
  }

  try {
    // Get relationship matrix
    server.tool(
      'crew_relationship_matrix',
      'Get complete relationship contexts between all crew members - how each sees others.',
      {},
      async () => {
        const matrix = getRelationshipMatrix();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(matrix, null, 2),
            },
          ],
        };
      }
    );

    process.stderr.write('✅ Registered: Crew Relationship Matrix Tool\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    process.stderr.write(`❌ Failed to register crew relationship matrix tool: ${error}\n`);
  }
}
