import 'dotenv/config';
import { desiredGroupsFromHierarchy } from '../packages/shared/src/entitlement-sync.js';
import { syncEntitlementGroups, addUserToGroup, listGroups, listGroupNamesForUser, iamEntitlementsEnabled } from '../packages/shared/src/iam-identity-center.js';

/**
 * APPLY the tiered-hierarchy entitlements (manager-approved). Creates the hierarchy groups (never
 * deletes) and grants the approved human memberships. WRITES to live IAM Identity Center.
 *   STORY_AGENT_IAM_ENABLE=1 STORY_AGENT_IDENTITY_STORE_ID=d-xxxx npx tsx scripts/entitlement-apply.ts
 */
// Manager-approved grants (approved by Brady, top-level manager). Owner identities → both tiers = full.
const GRANTS = [
  { name: 'Brady', userId: 'b1eba510-20f1-7031-0564-36d8c7c37ee4', groups: ['tier:commercial', 'tier:enterprise'] },
  { name: 'pbradygeorgen', userId: '319bb560-7031-707c-7007-61f9a8228b21', groups: ['tier:commercial', 'tier:enterprise'] },
];

(async () => {
  if (!iamEntitlementsEnabled()) { console.error('Set STORY_AGENT_IAM_ENABLE=1 + STORY_AGENT_IDENTITY_STORE_ID.'); process.exit(1); }
  // Canonical hierarchy (crew ruling, memory 119): both jonah + bayer are ENTERPRISE clients (verified
  // in the clients table); jonah-corp was never persisted (no merge needed).
  const desired = desiredGroupsFromHierarchy({
    tiers: ['commercial', 'enterprise'],
    clients: ['jonah', 'bayer'],
    projects: ['JONAH-RE-1', 'JONAH-RE-2', 'proj-jonah-todo', 'proj-jonah-pm'],
  });

  console.log('=== SYNC GROUPS (create-only) ===');
  const plan = await syncEntitlementGroups(desired);
  console.log('Created:', plan.toCreate.length ? plan.toCreate : '(none — already existed)');
  console.log('Unchanged:', plan.unchanged);

  if (process.env.SKIP_GRANTS === '1') {
    console.log('\n=== GRANTS SKIPPED (SKIP_GRANTS=1) — groups only, no human elevated ===');
    console.log('All groups now:', [...(await listGroups()).keys()].sort());
    return;
  }

  console.log('\n=== GRANT MEMBERSHIPS (manager-approved: Brady) ===');
  for (const g of GRANTS) {
    for (const grp of g.groups) {
      try { await addUserToGroup(g.userId, grp); console.log(`  ✓ ${g.name} → ${grp}`); }
      catch (e: any) {
        const m = e?.name === 'ConflictException' || /already a member|Conflict/i.test(e?.message ?? '') ? 'already a member' : (e?.message ?? String(e));
        console.log(`  • ${g.name} → ${grp}: ${m}`);
      }
    }
  }

  console.log('\n=== VERIFY ===');
  console.log('All groups now:', [...(await listGroups()).keys()].sort());
  for (const g of GRANTS) console.log(`  ${g.name} memberships:`, await listGroupNamesForUser(g.userId));
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
