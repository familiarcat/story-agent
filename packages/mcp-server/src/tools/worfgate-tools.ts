import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { credentialStatus, getCredentialAuditLog, CREW_CREDENTIAL_REGISTRY, listCredentialProviders, summarizeOverridesForLounge, getOverrideAuditLog, OVERRIDE_LIMIT_PER_DAY } from '@story-agent/shared/worfgate-credentials';

/**
 * WorfGate credential tools — Worf's owned skill surfaced to the crew.
 *
 * These expose credential AVAILABILITY and the access audit trail ONLY — never secret values.
 * Crew tools that actually need a secret call resolveWorfGateCredential() internally; this surface
 * lets the crew/user see what WorfGate can broker (from ~/.zshrc / ~/.alexai-secrets) and what's missing.
 */
export function registerWorfGateTools(server: McpServer): void {
  server.tool(
    'worfgate_credential_status',
    [
      'Report which environment-provided credentials WorfGate can broker for the crew (from ~/.zshrc /',
      '~/.alexai-secrets) and which are missing. Presence-only — never returns secret values. Worf owns this skill.',
    ].join(' '),
    {
      names: z.array(z.string()).optional().describe('Specific credential names to check; omit for all registered.'),
    },
    async ({ names }) => {
      const status = credentialStatus(names);
      const available = status.filter(s => s.available).length;
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            officer: 'worf',
            summary: `${available}/${status.length} brokered credentials present`,
            providers: listCredentialProviders(),
            credentials: status,
            missingRequired: status.filter(s => s.required && !s.available).map(s => s.name),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'worfgate_credential_audit',
    'Return the WorfGate credential-access audit trail (who requested which credential for which operation, authorized/available). No secret values.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify({ registry: Object.keys(CREW_CREDENTIAL_REGISTRY), audit: getCredentialAuditLog() }, null, 2) }],
    })
  );

  server.tool(
    'worfgate_override_monitor',
    [
      "Surface O'Brien's WorfGate break-glass OVERRIDES for the crew to review in the Observation Lounge:",
      'a digest (granted/denied, by crew, by credential:operation) + anomaly flags (rate pressure,',
      'repeated overrides, denials) + the recent monitored entries. No secret values — monitoring only.',
    ].join(' '),
    {
      sinceHours: z.number().optional().describe('Look-back window in hours (default 24).'),
    },
    async ({ sinceHours }) => {
      const digest = summarizeOverridesForLounge(sinceHours ?? 24);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            officer: 'worf',
            headline: digest.anomalies.length
              ? `⚠️ ${digest.granted} granted / ${digest.denied} denied in ${digest.windowHours}h — ${digest.anomalies.length} anomaly flag(s)`
              : `✅ ${digest.granted} granted / ${digest.denied} denied in ${digest.windowHours}h — nominal`,
            rateLimitPerDay: OVERRIDE_LIMIT_PER_DAY,
            digest,
            recentAll: getOverrideAuditLog().slice(-25),
          }, null, 2),
        }],
      };
    }
  );
}
