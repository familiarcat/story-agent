import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { credentialStatus, getCredentialAuditLog, CREW_CREDENTIAL_REGISTRY, listCredentialProviders, summarizeOverridesForLounge, getOverrideAuditLog, OVERRIDE_LIMIT_PER_DAY } from '@story-agent/shared/worfgate-credentials';
import { requestWorfGateChange, applyWorfGateChange, stashChange, getPendingChange, listPendingChanges, getChangeAuditLog } from '../agent-core/worfgate-change-request.js';

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

  // ── Governed write: request → approve → apply (reuses gateLocalOp + approval channel) ──

  server.tool(
    'worfgate_request_change',
    [
      'PROPOSE a file change under WorfGate governance (step 1 of request→approve→apply). Classifies the',
      'tier: in-workspace code is green/yellow (applies without approval); a SENSITIVE path',
      '(~/.zshrc, ~/.alexai-secrets, .env, .ssh, or anything outside the workspace) is red and REQUIRES',
      'an explicit approval. Returns a change id — nothing is written yet. Content is held, never logged.',
    ].join(' '),
    {
      path: z.string().describe('Absolute or workspace-relative file path to change.'),
      content: z.string().describe('The full new file content to write on apply.'),
      description: z.string().describe('Human-readable summary of the change (audited).'),
      crewId: z.string().optional().describe('Requesting crew member (default worf).'),
    },
    async ({ path, content, description, crewId }) => {
      const req = requestWorfGateChange({ path, description, crewId: crewId ?? 'worf' });
      stashChange(req, content);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            officer: 'worf',
            change: { id: req.id, path: req.path, tier: req.tier, sensitive: req.sensitive, needsApproval: req.needsApproval, status: req.status },
            next: req.needsApproval
              ? `SENSITIVE (${req.tier}) — approve to apply: worfgate_apply_change({ id: "${req.id}", decision: "approve" })`
              : `bounded (${req.tier}) — apply: worfgate_apply_change({ id: "${req.id}" })`,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'worfgate_apply_change',
    [
      'APPLY (or refuse) a proposed WorfGate change by id (step 2 of request→approve→apply). Green/yellow',
      'apply immediately; red/sensitive apply ONLY with decision:"approve" — the explicit recorded',
      'approval (break-glass). Backs up an existing file first; file content is never logged.',
    ].join(' '),
    {
      id: z.string().describe('The change id from worfgate_request_change.'),
      decision: z.enum(['approve', 'deny']).optional().describe('Required for sensitive/red changes: approve to apply, deny to refuse.'),
    },
    async ({ id, decision }) => {
      const p = getPendingChange(id);
      if (!p) return { content: [{ type: 'text' as const, text: JSON.stringify({ officer: 'worf', error: `no pending change '${id}'` }) }] };
      const res = await applyWorfGateChange(p.req, p.content, { decision, approvalTimeoutMs: 1000 });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ officer: 'worf', id, applied: res.applied, reason: res.reason, backedUp: Boolean(res.backup), status: p.req.status }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'worfgate_pending_changes',
    'List open WorfGate change requests (the review queue) + the recent change audit trail. Paths + tiers + decisions only — never file content or secret values.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify({ officer: 'worf', pending: listPendingChanges(), audit: getChangeAuditLog().slice(-25) }, null, 2) }],
    })
  );
}
