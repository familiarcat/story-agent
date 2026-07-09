import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const VALID_TOOL_NAME = /^[A-Za-z0-9_.-]+$/;

export function normalizeMcpToolName(name: string): string {
  // MCP allows letters, numbers, underscore, dash, and dot.
  const sanitized = String(name)
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized;
}

/**
 * Wrap server.tool so all registered names are MCP-spec compliant.
 * This removes noisy startup warnings and fails fast on collisions.
 */
export function installMcpToolNamePolicy(server: McpServer): void {
  const s = server as unknown as {
    tool: (...args: any[]) => any;
    __toolNamePolicyInstalled?: boolean;
  };

  if (s.__toolNamePolicyInstalled) return;

  const originalTool = s.tool.bind(server);
  const usedNames = new Map<string, string>();

  s.tool = ((name: string, ...rest: any[]) => {
    const original = String(name);
    const normalized = VALID_TOOL_NAME.test(original) ? original : normalizeMcpToolName(original);

    if (!normalized) {
      throw new Error(`Invalid MCP tool name "${original}": cannot normalize to a non-empty name`);
    }

    const existing = usedNames.get(normalized);
    if (existing && existing !== original) {
      throw new Error(
        `MCP tool name collision after normalization: "${existing}" and "${original}" -> "${normalized}"`,
      );
    }
    usedNames.set(normalized, original);

    if (original !== normalized) {
      process.stderr.write(
        `[mcp-tool-name-policy] normalized tool name "${original}" -> "${normalized}"\n`,
      );
    }

    return originalTool(normalized, ...rest);
  }) as typeof s.tool;

  s.__toolNamePolicyInstalled = true;
}
