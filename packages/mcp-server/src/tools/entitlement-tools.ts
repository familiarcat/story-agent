import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { groupName, type GroupLevel } from '@story-agent/shared';
import { iamEntitlementsEnabled, addUserToGroup } from '@story-agent/shared/iam-identity-center';

/**
 * Human entitlement tools (crew reorg — docs/runbooks/aws-iam-entitlements.md). The crew automates
 * PROVISIONING; the manager APPROVAL decision stays human (Worf's floor):
 *   - request_entitlement: a human asks for access at a level (records the ask; no access granted).
 *   - grant_entitlement: a top-level manager approves → the crew provisions the IAM Identity Center
 *     group membership (top-down inheritance) and audits it. Requires `approvedBy` (no auto-grant).
 * When live IAM is disabled (STORY_AGENT_IAM_ENABLE unset), grant records the approved intent and
 * reports it as pending activation rather than failing.
 */
export function registerEntitlementTools(server: McpServer): void {
  const levelSchema = z.enum(['tier', 'client', 'project', 'sprint']);

  server.tool(
    'request_entitlement',
    'Request human access at a hierarchy level (tier/client/project/sprint). Records the ask for a manager to approve via grant_entitlement — grants NO access by itself.',
    {
      humanId: z.string().describe('The human (IAM Identity Center UserId or email) requesting access.'),
      level: levelSchema.describe('Hierarchy level the access is requested at.'),
      id: z.string().describe('The node id at that level, e.g. client "jonah" or project "JONAH-RE-1".'),
      reason: z.string().optional().describe('Why access is needed (for the approving manager).'),
    },
    async ({ humanId, level, id, reason }) => {
      const group = groupName(level as GroupLevel, id);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            status: 'pending_manager_approval',
            request: { humanId, level, id, group, reason: reason ?? null },
            note: `Recorded. A top-level manager must approve via grant_entitlement({ humanId: "${humanId}", level: "${level}", id: "${id}", approvedBy: "<manager>" }). Membership inherits all levels below ${group}.`,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'grant_entitlement',
    'Manager-approved grant: provision a human into the IAM Identity Center group for a hierarchy level (inherits below). Requires approvedBy (the manager — no auto-grant). Provisions live when IAM is enabled; otherwise records the approved intent as pending.',
    {
      humanId: z.string().describe('The human (IAM Identity Center UserId) to grant.'),
      level: levelSchema.describe('Hierarchy level to grant at.'),
      id: z.string().describe('The node id at that level.'),
      approvedBy: z.string().describe('The top-level manager approving this grant (required — the human gate).'),
      access: z.enum(['read', 'write']).optional().default('write').describe('read = view; write = act/approve in-loop.'),
    },
    async ({ humanId, level, id, approvedBy, access }) => {
      if (!approvedBy?.trim()) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'denied', reason: 'approvedBy (a manager) is required — entitlements are never auto-granted.' }) }], isError: true };
      }
      const group = access === 'read' ? `${groupName(level as GroupLevel, id)}:read` : groupName(level as GroupLevel, id);
      const audit = { humanId, level, id, group, access, approvedBy, approvedAt: new Date().toISOString() };
      try {
        if (!iamEntitlementsEnabled()) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'approved_pending_iam', audit, note: 'Live IAM disabled (STORY_AGENT_IAM_ENABLE/IDENTITY_STORE_ID). Approval recorded; membership will provision once IAM is enabled.' }, null, 2) }] };
        }
        await addUserToGroup(humanId, group);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'granted', audit, note: `Provisioned: ${humanId} added to ${group} (inherits all levels below).` }, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'failed', audit, error: msg }, null, 2) }], isError: true };
      }
    },
  );
}
