/**
 * Onboard a client into the MCP crew system — DYNAMICALLY (persists to Supabase `clients`,
 * caches for sync resolution, applies the WorfGate floor). Clients are data, not code.
 *
 * Requires the clients-table migration (supabase/migrations/20260621120000_clients_hierarchy_policy.sql)
 * to be applied first (via `supabase db push`) so the parent_client_id / policy columns exist.
 *
 * Usage:
 *   npx tsx scripts/onboard-client.ts                    # seeds Jonah under familiarcat (default)
 *   npx tsx scripts/onboard-client.ts <id> <name> <tier> <githubOrg> [parentClientId]
 */
import 'dotenv/config';
import { onboardClient } from '../packages/shared/src/client-registry.js';
import { listClientHierarchy } from '../packages/shared/src/client-security-policy.js';

async function main() {
  const [id, name, tier, githubOrg, parent] = process.argv.slice(2);

  const spec = id
    ? { clientId: id, clientName: name || id, tier: (tier as any) || 'enterprise', githubOrg: githubOrg || id, parentClientId: parent ?? null }
    : {
        clientId: 'jonah',
        clientName: 'Jonah',
        tier: 'enterprise' as const,
        githubOrg: 'jonah',
        parentClientId: 'familiarcat',
        controlledMarkers: ['project plan', 'financial data', 'customer data'],
        tierRationale: 'Enterprise client nested under the familiarcat main user; WorfGate hard, session isolation, env-var secrets.',
      };

  console.log(`Onboarding '${spec.clientId}' (${spec.clientName}) under ${spec.parentClientId ?? 'root'} @ ${spec.tier}…`);
  const policy = await onboardClient(spec, 'onboard-client-script');
  console.log(`✅ Persisted to Supabase. WorfGate=${policy.worfGate.enforceMode}, githubOrgs=${policy.worfGate.allowedGithubOrgs.join()}`);

  console.log('\nClient hierarchy:');
  const print = (n: any, d = 0) => { console.log('  '.repeat(d + 1) + `- ${n.clientName} (${n.clientId}) [${n.tier}, worf=${n.worfGateEnforce}]`); n.children.forEach((c: any) => print(c, d + 1)); };
  listClientHierarchy().forEach((n) => print(n));
  process.exit(0);
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
