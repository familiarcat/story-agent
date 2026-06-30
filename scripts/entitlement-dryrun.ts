import 'dotenv/config';
import { desiredGroupsFromHierarchy, planReconciliation } from '../packages/shared/src/entitlement-sync.js';
import { listGroups, iamEntitlementsEnabled } from '../packages/shared/src/iam-identity-center.js';

/**
 * DRY-RUN the tiered-hierarchy entitlement sync against live IAM Identity Center. Read-only: lists
 * existing groups and prints the reconciliation plan (create/delete) — creates NOTHING. This is the
 * crew-required staging dry-run before activation.
 *
 *   STORY_AGENT_IAM_ENABLE=1 STORY_AGENT_IDENTITY_STORE_ID=d-xxxx npx tsx scripts/entitlement-dryrun.ts
 */
(async () => {
  if (!iamEntitlementsEnabled()) {
    console.error('Set STORY_AGENT_IAM_ENABLE=1 and STORY_AGENT_IDENTITY_STORE_ID=<id>.');
    process.exit(1);
  }
  // The tiered hierarchy to mirror (extend from the live client/project registry later).
  // Canonical hierarchy (crew ruling, memory 119): jonah + bayer are ENTERPRISE clients; jonah-corp
  // was never persisted (no merge). All four jonah projects live under `jonah`.
  const desired = desiredGroupsFromHierarchy({
    tiers: ['commercial', 'enterprise'],
    clients: ['jonah', 'bayer'],
    projects: ['JONAH-RE-1', 'JONAH-RE-2', 'proj-jonah-todo', 'proj-jonah-pm'],
  });
  const existing = [...(await listGroups()).keys()];
  const plan = planReconciliation(desired, existing);

  console.log('\n=== ENTITLEMENT SYNC — DRY RUN (no changes) ===');
  console.log('Existing IAM Identity Center groups:', existing);
  console.log('\nDesired (tier → client → project):', desired);
  console.log('\nTO CREATE:', plan.toCreate);
  console.log('TO DELETE (surfaced only, never auto-applied):', plan.toDelete);
  console.log('UNCHANGED:', plan.unchanged);
  console.log('\n(no groups were created or deleted — dry run)');
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
