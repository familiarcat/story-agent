import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listClientHierarchy,
  resolveClientPolicy,
  getClientChildren,
} from '@story-agent/shared/client-security-policy';
import { onboardClient, hydrateClientPolicies } from '@story-agent/shared/client-registry';
import { storeObservationMemory } from '@story-agent/shared/db';

/**
 * Client lifecycle tools — onboard and inspect clients in the MCP crew hierarchy.
 *
 * Onboarding builds a floor-compliant, WorfGate-governed security policy and registers it so the
 * whole system (auth, WorfGate, RAG isolation) immediately recognizes the client. Clients nest
 * under a parent (e.g. a client under the 'familiarcat' main user), beneath the root admin.
 */
export function registerClientTools(server: McpServer): void {
  server.tool(
    'onboard_client',
    [
      'Onboard a new client into the MCP crew system. Builds a WorfGate-governed security policy',
      '(enforced hard; full audit + session isolation; regulated tier additionally forces SSM secrets',
      'and a controlled-data hard block) and registers it so auth/WorfGate/RAG-isolation recognize it.',
      'The client nests under parentClientId (e.g. "familiarcat"); omit for a top-level org.',
    ].join(' '),
    {
      clientId: z.string().describe('Lowercase client identifier, e.g. "jonah".'),
      clientName: z.string().describe('Human-readable client name.'),
      tier: z.enum(['regulated', 'enterprise', 'standard']).describe('Security tier (regulated = Bayer gold standard).'),
      githubOrg: z.string().describe('GitHub org allowlisted for this client\'s outbound commits.'),
      parentClientId: z.string().optional().describe('Parent client in the hierarchy, e.g. "familiarcat". Omit for top-level.'),
      controlledMarkers: z.array(z.string()).optional().describe('Extra controlled-data markers beyond the baseline.'),
      controlledDataHardBlock: z.boolean().optional().describe('Force hard block on controlled-data outbound (always true for regulated).'),
    },
    async (args) => {
      try {
        const policy = await onboardClient({
          clientId: args.clientId,
          clientName: args.clientName,
          tier: args.tier,
          githubOrg: args.githubOrg,
          parentClientId: args.parentClientId ?? null,
          controlledMarkers: args.controlledMarkers,
          controlledDataHardBlock: args.controlledDataHardBlock,
        });

        // Store the onboarding decision to crew RAG memory (the crew "remembers" client lifecycle).
        try {
          await storeObservationMemory({
            storyId: `client-onboard-${policy.clientId}`,
            clientId: policy.parentClientId ?? policy.clientId,
            source: 'mcp',
            transcript: {
              rounds: [{ title: 'Client onboarding', entries: [{ speakerId: 'worf', position: 'support' as const, statement: `Onboarded client '${policy.clientName}' (${policy.clientId}) under ${policy.parentClientId ?? 'root'} at ${policy.tier} tier; WorfGate ${policy.worfGate.enforceMode}.`, evidence: policy.worfGate.allowedGithubOrgs }] }],
              consensusSummary: `Client ${policy.clientId} onboarded and persisted to Supabase.`,
              unresolvedRisks: [],
              finalDecision: 'approved' as const,
              actionItems: [`tier=${policy.tier}`, `parent=${policy.parentClientId ?? 'root'}`],
            },
            missionReference: `client-onboard-${policy.clientId}`,
            tags: ['client-onboarding', 'worfgate', policy.clientId, policy.parentClientId ?? 'root'],
          });
        } catch { /* RAG memory is best-effort; persistence already succeeded */ }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              status: 'onboarded',
              clientId: policy.clientId,
              clientName: policy.clientName,
              tier: policy.tier,
              parentClientId: policy.parentClientId,
              worfGate: { enforceMode: policy.worfGate.enforceMode, enforce: policy.auth.worfGateEnforce, allowedGithubOrgs: policy.worfGate.allowedGithubOrgs },
              requiredEnvVars: policy.requiredEnvVars.map(v => v.name),
            }, null, 2),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ status: 'failed', error: e instanceof Error ? e.message : String(e) }, null, 2) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'list_client_hierarchy',
    'List the client hierarchy (top-level orgs and their nested clients) with each client\'s tier and WorfGate enforcement. Hydrates from Supabase first.',
    {},
    async () => {
      try { await hydrateClientPolicies(); } catch { /* fall back to whatever is cached/bootstrap */ }
      return { content: [{ type: 'text' as const, text: JSON.stringify(listClientHierarchy(), null, 2) }] };
    }
  );

  server.tool(
    'get_client_policy',
    'Resolve the effective security policy (tier, auth, WorfGate, required env vars, parent) for a client, and list its direct children.',
    { clientId: z.string().describe('Client identifier to inspect.') },
    async ({ clientId }) => {
      try { await hydrateClientPolicies(); } catch { /* fall back to cached/bootstrap */ }
      const policy = resolveClientPolicy(clientId);
      const children = getClientChildren(clientId).map(c => c.clientId);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ policy, children }, null, 2) }] };
    }
  );
}
