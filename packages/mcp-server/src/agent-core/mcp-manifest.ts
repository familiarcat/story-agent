/**
 * The /.well-known/mcp.json discovery manifest so any VS Code extension self-configures to reach the crew.
 */
export interface McpManifest {
  apiVersion: string;
  minApiVersion: string;
  service: string;
  entryPoint: string;
  crew: number;
  auth: string;
  endpoints: { mcp: string; agent: string; rag: string };
  description: string;
  toolNameCompatibility: {
    normalizedPattern: string;
    legacyDelimiter: string;
    normalizationHint: string;
    examples: Array<{ legacy: string; normalized: string }>;
  };
}

export function buildMcpManifest(baseUrl: string): McpManifest {
  const normalizedBaseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  return {
    apiVersion: '1',
    minApiVersion: '1',
    service: 'story-agent-crew',
    entryPoint: 'plan_then_execute',
    crew: 11,
    auth: 'bearer',
    endpoints: {
      mcp: normalizedBaseUrl + '/mcp',
      agent: normalizedBaseUrl + '/agent',
      rag: normalizedBaseUrl + '/rag',
    },
    description:
      'Story Agent OpenRouter crew (11 officers) — discover once, reach the crew + Commodore from any MCP client.',
    toolNameCompatibility: {
      normalizedPattern: '^[A-Za-z0-9_.-]+$',
      legacyDelimiter: ':',
      normalizationHint: 'Replace any non [A-Za-z0-9_.-] character with "-" before calling tools.',
      examples: [
        { legacy: 'crew:get-personal-profile', normalized: 'crew-get-personal-profile' },
        { legacy: 'picard:assess-readiness', normalized: 'picard-assess-readiness' },
      ],
    },
  };
}
