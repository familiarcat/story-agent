import { setEntitlementResolver, type Grant } from './entitlements.js';
import { membershipsToGrants, planReconciliation, type ReconcilePlan } from './entitlement-sync.js';

/**
 * AWS IAM Identity Center adapter + entitlement service — the LIVE backend behind the entitlement seam
 * (see docs/runbooks/aws-iam-entitlements.md). INERT until BOTH STORY_AGENT_IAM_ENABLE=1 and
 * STORY_AGENT_IDENTITY_STORE_ID are set, so it compiles + ships now and "flips on" once AWS access is
 * restored. The SDK is imported via a VARIABLE module name so tsc/build does not require the package
 * installed (mirrors worfgate-credential-providers.ts); add @aws-sdk/client-identitystore for runtime.
 */

const ENABLED = process.env.STORY_AGENT_IAM_ENABLE === '1';
const IDENTITY_STORE_ID = process.env.STORY_AGENT_IDENTITY_STORE_ID ?? '';
const REGION = process.env.AWS_REGION;
const SDK = '@aws-sdk/client-identitystore';

export function iamEntitlementsEnabled(): boolean {
  return ENABLED && IDENTITY_STORE_ID.length > 0;
}

interface Idc { mod: any; client: any }
let cached: Idc | null = null;
async function idc(): Promise<Idc> {
  if (!iamEntitlementsEnabled()) {
    throw new Error('IAM entitlements disabled — set STORY_AGENT_IAM_ENABLE=1 and STORY_AGENT_IDENTITY_STORE_ID (see docs/runbooks/aws-iam-entitlements.md).');
  }
  if (cached) return cached;
  const mod: any = await import(SDK);
  cached = { mod, client: new mod.IdentitystoreClient({ region: REGION }) };
  return cached;
}

/** All group DisplayName → GroupId in the identity store. */
export async function listGroups(): Promise<Map<string, string>> {
  const { mod, client } = await idc();
  const out = new Map<string, string>();
  let NextToken: string | undefined;
  do {
    const res = await client.send(new mod.ListGroupsCommand({ IdentityStoreId: IDENTITY_STORE_ID, NextToken }));
    for (const g of res.Groups ?? []) if (g.DisplayName && g.GroupId) out.set(g.DisplayName, g.GroupId);
    NextToken = res.NextToken;
  } while (NextToken);
  return out;
}

export async function createGroup(name: string): Promise<string> {
  const { mod, client } = await idc();
  const res = await client.send(new mod.CreateGroupCommand({
    IdentityStoreId: IDENTITY_STORE_ID, DisplayName: name,
    Description: `Story Agent entitlement node '${name}' — members inherit this node + all levels below.`,
  }));
  return res.GroupId as string;
}

/** Group DisplayNames a human (identity-store UserId) belongs to. */
export async function listGroupNamesForUser(userId: string): Promise<string[]> {
  const { mod, client } = await idc();
  const groupIds: string[] = [];
  let NextToken: string | undefined;
  do {
    const res = await client.send(new mod.ListGroupMembershipsForMemberCommand({
      IdentityStoreId: IDENTITY_STORE_ID, MemberId: { UserId: userId }, NextToken,
    }));
    for (const m of res.GroupMemberships ?? []) if (m.GroupId) groupIds.push(m.GroupId);
    NextToken = res.NextToken;
  } while (NextToken);
  const names: string[] = [];
  for (const id of groupIds) {
    const g = await client.send(new mod.DescribeGroupCommand({ IdentityStoreId: IDENTITY_STORE_ID, GroupId: id }));
    if (g.DisplayName) names.push(g.DisplayName as string);
  }
  return names;
}

/** Add a human to an entitlement group (creating the group if needed). Used AFTER manager approval. */
export async function addUserToGroup(userId: string, groupName: string): Promise<void> {
  const { mod, client } = await idc();
  const gid = (await listGroups()).get(groupName) ?? (await createGroup(groupName));
  await client.send(new mod.CreateGroupMembershipCommand({
    IdentityStoreId: IDENTITY_STORE_ID, GroupId: gid, MemberId: { UserId: userId },
  }));
}

/**
 * Reconcile the hierarchy's desired groups against IAM (create missing). Deletions are NOT auto-applied
 * — returned in the plan for review (safety: a hierarchy hiccup must not strip access). Hands-free for
 * creation; pruning stays deliberate.
 */
export async function syncEntitlementGroups(desired: string[]): Promise<ReconcilePlan> {
  const existing = [...(await listGroups()).keys()];
  const plan = planReconciliation(desired, existing);
  for (const name of plan.toCreate) await createGroup(name);
  return plan;
}

/** Wire the LIVE resolver: human's IAM memberships → Grants. No-op (returns false) while disabled. */
export function wireLiveEntitlementResolver(): boolean {
  if (!iamEntitlementsEnabled()) return false;
  setEntitlementResolver(async (humanId: string): Promise<Grant[]> => membershipsToGrants(await listGroupNamesForUser(humanId)));
  return true;
}
