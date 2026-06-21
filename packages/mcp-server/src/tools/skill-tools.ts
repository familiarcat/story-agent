import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSkillTheory, listSkillTheories, skillCoverage } from '@story-agent/shared/skill-theory';
import '../lib/skill-theories.js'; // side-effect: register all theories

/**
 * Skill-theory introspection — lets any agent ask the 5W1H of a tool (who/what/when/where/why/how)
 * and see system-wide coverage. Grounded in the MCP ToolAnnotations convention; how.annotations
 * are the protocol-level hints.
 */
export function registerSkillTools(server: McpServer): void {
  server.tool(
    'describe_skill',
    'Return the full 5W1H theory for a tool/skill: who owns & may invoke it, what it does, when to use/avoid it, where it operates, why it exists, and how it is invoked + its MCP annotation hints + how its output looks.',
    { tool: z.string().describe('The tool/skill name, e.g. "run_shell" or "onboard_client".') },
    async ({ tool }) => {
      const theory = getSkillTheory(tool);
      if (!theory) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ tool, found: false, hint: 'No theory registered — see list_skill_theories for what is described.' }, null, 2) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(theory, null, 2) }] };
    }
  );

  server.tool(
    'list_skill_theories',
    'List every tool/skill that carries a 5W1H theory, with a one-line who/what summary.',
    {},
    async () => {
      const theories = listSkillTheories().map(t => ({
        tool: t.tool,
        who: t.who.owner,
        what: t.what.summary,
        where: t.where.scope.join('+'),
        sideEffects: t.where.sideEffects,
      }));
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: theories.length, theories }, null, 2) }] };
    }
  );

  server.tool(
    'skill_coverage',
    'Report 5W1H theory coverage across a set of registered tool names — which are described and which still need a theory.',
    { tools: z.array(z.string()).describe('Registered tool names to measure coverage against.') },
    async ({ tools }) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(skillCoverage(tools), null, 2) }],
    })
  );
}
