import 'dotenv/config';
import { wireLiveEntitlementResolver } from '../packages/shared/src/iam-identity-center.js';
import { checkHumanEntitlement } from '../packages/shared/src/entitlements.js';

/**
 * Verify the LIVE entitlement resolver end-to-end: wire it to IAM Identity Center, then check access
 * for a granted human vs an ungranted one. Read-only.
 *   STORY_AGENT_IAM_ENABLE=1 STORY_AGENT_IDENTITY_STORE_ID=d-xxxx npx tsx scripts/entitlement-verify.ts
 */
(async () => {
  if (!wireLiveEntitlementResolver()) { console.error('IAM disabled — set the flags.'); process.exit(1); }
  const cases: Array<[string, string, Record<string, string>]> = [
    ['Brady (granted both tiers)', 'b1eba510-20f1-7031-0564-36d8c7c37ee4', { tier: 'enterprise', client: 'jonah', project: 'JONAH-RE-1' }],
    ['Brady (granted both tiers)', 'b1eba510-20f1-7031-0564-36d8c7c37ee4', { tier: 'commercial', client: 'someco' }],
    ['nobody (no grants)', 'no-such-user-id', { tier: 'enterprise', client: 'jonah' }],
  ];
  for (const [who, id, path] of cases) {
    const d = await checkHumanEntitlement(id, path, 'write');
    console.log(`${who} → ${JSON.stringify(path)}: ${d.allowed ? 'ALLOW' : 'DENY'} — ${d.reason}`);
  }
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
