/**
 * Register documentation tools with MCP server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getDocGuidance,
  getRoleSpecificGuidance,
  searchDocumentation,
  listAvailablePhases,
} from './doc-tools.js';

export function registerDocTools(server: McpServer) {
  server.tool(
    'get_doc_guidance',
    'Retrieve documentation chunks by phase and tags. Use for finding specific guides, architecture details, integration steps, etc.',
    {
      phase: z.enum(['phase0', 'phase1', 'phase2', 'phase3', 'phase4']).describe('Phased docs section'),
      tags: z.array(z.string()).optional().describe('Filter by tags (e.g., ["ui", "implementation"])'),
      query: z.string().optional().describe('Semantic search query'),
      limit: z.number().int().min(1).max(20).optional().default(5).describe('Max results'),
    },
    async (input: { phase: string; tags?: string[]; query?: string; limit?: number }) => {
      const result = await getDocGuidance(input as Parameters<typeof getDocGuidance>[0]);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_role_guidance',
    'Get documentation guidance tailored to a specific role (Project Manager, Developer, or Technical Lead). Automatically filters relevant docs.',
    {
      role: z.enum(['project_manager', 'developer', 'lead']).describe('Target role'),
      phase: z.enum(['phase0', 'phase1', 'phase2', 'phase3', 'phase4']).optional().describe('Limit to phase'),
    },
    async (input: { role: 'project_manager' | 'developer' | 'lead'; phase?: string }) => {
      const result = await getRoleSpecificGuidance({
        role: input.role,
        phase: input.phase as 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | undefined,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  server.tool(
    'search_docs',
    'Semantically search the documentation corpus by keyword. Returns top results ranked by relevance.',
    {
      keyword: z.string().describe('Search term'),
      phase: z.enum(['phase0', 'phase1', 'phase2', 'phase3', 'phase4']).optional().describe('Limit to phase'),
    },
    async (input: { keyword: string; phase?: string }) => {
      const result = await searchDocumentation({
        keyword: input.keyword,
        phase: input.phase as 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | undefined,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  server.tool(
    'list_doc_phases',
    'List available documentation phases for progressive learning (phase0: orientation, phase1: context, phase2: architecture, phase3: planning, phase4: execution).',
    {},
    async () => {
      const result = await listAvailablePhases();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );
}
