/**
 * Client registry persistence — clients are managed DYNAMICALLY in Supabase (+ RAG memory),
 * not hardcoded. The crew can onboard and maintain clients end-to-end:
 *
 *   hydrateClientPolicies()  — load all rows from public.clients into the sync resolve cache (startup).
 *   onboardClient(spec)      — build a floor-compliant policy, persist it to the DB, cache it, return it.
 *   listClientsFromDb()      — read the durable client records.
 *
 * resolveClientPolicy() (sync, used by WorfGate/auth hot paths) reads the cache this hydrates.
 * Bayer + familiarcat remain code bootstrap; everything else is a DB row.
 */
import { getDbClient } from './db.js';
import {
  buildClientPolicy,
  cacheClientPolicy,
  clearDynamicClientCache,
  lookupClientPolicy,
  resolveClientPolicy,
  type ClientOnboardingSpec,
  type ClientSecurityPolicy,
} from './client-security-policy.js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ClientRow {
  id: string;
  name: string;
  security_tier: string;
  parent_client_id: string | null;
  policy: ClientSecurityPolicy | null;
  onboarded_by?: string | null;
}

/** Turn a DB row into a full policy (prefer the stored policy JSONB; otherwise rebuild from fields). */
function rowToPolicy(row: ClientRow): ClientSecurityPolicy {
  if (row.policy && typeof row.policy === 'object' && row.policy.clientId) return row.policy;
  return buildClientPolicy({
    clientId: row.id,
    clientName: row.name,
    tier: (row.security_tier as ClientSecurityPolicy['tier']) || 'enterprise',
    parentClientId: row.parent_client_id ?? null,
    githubOrg: row.id,
  });
}

/** Load every client from Supabase into the sync resolve cache. Call at server startup. */
export async function hydrateClientPolicies(): Promise<{ loaded: number }> {
  const db = await getDbClient();
  const { data, error } = await db.from('clients').select('id, name, security_tier, parent_client_id, policy, onboarded_by');
  if (error) throw new Error(`hydrateClientPolicies: ${error.message}`);
  clearDynamicClientCache();
  let loaded = 0;
  for (const row of (data ?? []) as ClientRow[]) {
    cacheClientPolicy(rowToPolicy(row));
    loaded++;
  }
  return { loaded };
}

/**
 * Onboard a client into the live system: build a floor-compliant WorfGate-governed policy, validate
 * the parent exists, PERSIST it to Supabase (durable, crew-maintainable), and cache it so
 * resolveClientPolicy recognizes it immediately. Returns the registered policy.
 */
export async function onboardClient(
  spec: ClientOnboardingSpec,
  onboardedBy = 'crew',
): Promise<ClientSecurityPolicy> {
  const policy = buildClientPolicy(spec);
  if (policy.parentClientId && !lookupClientPolicy(policy.parentClientId)) {
    // parent may be a DB row not yet cached — hydrate once and re-check.
    await hydrateClientPolicies();
    if (!lookupClientPolicy(policy.parentClientId)) {
      throw new Error(`Cannot onboard '${policy.clientId}': parent client '${policy.parentClientId}' is not registered.`);
    }
  }

  const db = await getDbClient();

  // The clients.parent_client_id FK requires the parent to be a ROW. Code-bootstrap parents
  // (e.g. familiarcat, bayer-int) have no row yet — persist the parent from its resolved policy
  // first so the hierarchy FK is satisfied. Walks up so a whole bootstrap chain is materialized.
  if (policy.parentClientId) await ensureParentRow(db, policy.parentClientId, onboardedBy);

  await persistPolicyRow(db, policy, onboardedBy);
  cacheClientPolicy(policy);
  return policy;
}

/** Upsert a policy as a clients row. */
async function persistPolicyRow(db: SupabaseClient, policy: ClientSecurityPolicy, onboardedBy: string): Promise<void> {
  const { error } = await db.from('clients').upsert({
    id: policy.clientId,
    name: policy.clientName,
    security_tier: policy.tier,
    parent_client_id: policy.parentClientId ?? null,
    policy: policy as unknown as Record<string, unknown>,
    onboarded_by: onboardedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`persist '${policy.clientId}' failed: ${error.message}`);
}

/** Ensure a parent client has a DB row (materialize from its code/cache policy if missing). */
async function ensureParentRow(db: SupabaseClient, parentId: string, onboardedBy: string): Promise<void> {
  const { data } = await db.from('clients').select('id').eq('id', parentId).maybeSingle();
  if (data) return; // already a row
  const parentPolicy = lookupClientPolicy(parentId) ?? resolveClientPolicy(parentId);
  if (parentPolicy.parentClientId) await ensureParentRow(db, parentPolicy.parentClientId, onboardedBy);
  await persistPolicyRow(db, parentPolicy, `${onboardedBy} (auto-seeded parent)`);
  cacheClientPolicy(parentPolicy);
}

/** Read durable client records (for hierarchy/admin views). */
export async function listClientsFromDb(): Promise<ClientRow[]> {
  const db = await getDbClient();
  const { data, error } = await db.from('clients').select('id, name, security_tier, parent_client_id, onboarded_by').order('name');
  if (error) throw new Error(`listClientsFromDb: ${error.message}`);
  return (data ?? []) as ClientRow[];
}
