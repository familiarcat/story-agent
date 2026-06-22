/**
 * Bridges the 5W1H Skill Theory registry into the MCP protocol: wraps server.tool so every
 * registration automatically carries the theory's MCP ToolAnnotations (title / readOnlyHint /
 * destructiveHint / idempotentHint / openWorldHint). No per-tool edits — call this on a server
 * BEFORE registering its tools.
 *
 * The SDK's tool() handler is always the trailing function arg; annotations are inserted right
 * before it, which lands in the correct overload slot for every arity:
 *   tool(name, cb)                       → tool(name, ann, cb)
 *   tool(name, desc, cb)                 → tool(name, desc, ann, cb)
 *   tool(name, desc, schema, cb)         → tool(name, desc, schema, ann, cb)
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpAnnotationsFor } from '@story-agent/shared/skill-theory';
import './skill-theories.js'; // register hand-authored theories
import './skill-theories-generated.js'; // register crew-authored theories

export function applySkillAnnotations(server: McpServer): void {
  const orig = (server.tool as (...a: unknown[]) => unknown).bind(server);
  let injected = 0;
  (server as unknown as { tool: (...a: unknown[]) => unknown }).tool = (name: unknown, ...rest: unknown[]) => {
    const ann = typeof name === 'string' ? mcpAnnotationsFor(name) : undefined;
    // Only inject when a theory exists AND the call ends in a handler we can sit before.
    if (!ann || rest.length === 0 || typeof rest[rest.length - 1] !== 'function') {
      return orig(name, ...rest);
    }
    const head = rest.slice(0, -1);
    const cb = rest[rest.length - 1];
    injected++;
    return orig(name, ...head, ann, cb);
  };
  // Expose a count for startup diagnostics (read after registration completes).
  (server as unknown as { __skillAnnotationsInjected: () => number }).__skillAnnotationsInjected = () => injected;
}
