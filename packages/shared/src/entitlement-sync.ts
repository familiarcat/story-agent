import type { Grant } from './entitlements.js';

/**
 * Pure entitlement-sync logic — the brain of the hands-free entitlement system (no AWS calls here;
 * see iam-identity-center.ts for the live adapter). Turns the client/project hierarchy into the set of
 * IAM Identity Center groups that SHOULD exist, diffs against what DOES exist, and parses a human's
 * group memberships back into entitlement Grants. Fully unit-testable in isolation.
 */

export type GroupLevel = 'tier' | 'client' | 'project' | 'sprint';

/** Canonical Identity Center group name for a hierarchy node, e.g. groupName('client','jonah') = "client:jonah". */
export function groupName(level: GroupLevel, id: string): string {
  return `${level}:${id}`;
}

/** The desired group set from the live hierarchy (tiers + clients + projects + sprints). Sorted, deduped. */
export function desiredGroupsFromHierarchy(input: {
  tiers?: string[];
  clients?: string[];
  projects?: string[];
  sprints?: string[];
}): string[] {
  const g = new Set<string>();
  for (const t of input.tiers ?? []) g.add(groupName('tier', t));
  for (const c of input.clients ?? []) g.add(groupName('client', c));
  for (const p of input.projects ?? []) g.add(groupName('project', p));
  for (const s of input.sprints ?? []) g.add(groupName('sprint', s));
  return [...g].sort();
}

export interface ReconcilePlan {
  toCreate: string[];
  toDelete: string[];
  unchanged: string[];
}

/**
 * Diff desired vs existing group names → a reconciliation plan. `protectedGroups` are NEVER deleted
 * (e.g. the baseline tier:commercial / tier:enterprise groups, or groups holding live memberships) —
 * a safety floor so a hierarchy hiccup can't strip access.
 */
export function planReconciliation(
  desired: string[],
  existing: string[],
  protectedGroups: string[] = ['tier:commercial', 'tier:enterprise'],
): ReconcilePlan {
  const d = new Set(desired);
  const e = new Set(existing);
  const prot = new Set(protectedGroups);
  return {
    toCreate: desired.filter((x) => !e.has(x)),
    toDelete: existing.filter((x) => !d.has(x) && !prot.has(x)),
    unchanged: desired.filter((x) => e.has(x)),
  };
}

/**
 * Parse a human's IAM Identity Center group memberships → entitlement Grants for checkHumanEntitlement.
 * Group `level:id` → a grant at that level (inherits below). Optional `:read`/`:write` suffix sets
 * access (default write). `*` / `admin:*` → full-hierarchy grant. Unrecognized groups are ignored.
 */
export function membershipsToGrants(groupNames: string[], defaultAccess: 'read' | 'write' = 'write'): Grant[] {
  const grants: Grant[] = [];
  for (const raw of groupNames) {
    const name = raw.trim();
    if (name === '*' || name === 'admin:*') {
      grants.push({ scope: '*', access: defaultAccess });
      continue;
    }
    const parts = name.split(':');
    const level = parts[0] as GroupLevel;
    if (!['tier', 'client', 'project', 'sprint'].includes(level)) continue;
    // trailing access qualifier? e.g. client:jonah:read
    const last = parts[parts.length - 1];
    const access: 'read' | 'write' = last === 'read' || last === 'write' ? last : defaultAccess;
    const idParts = access === defaultAccess && last !== 'read' && last !== 'write' ? parts.slice(1) : parts.slice(1, -1);
    const id = idParts.join(':');
    if (!id) continue;
    grants.push({ scope: level, id, access });
  }
  return grants;
}
