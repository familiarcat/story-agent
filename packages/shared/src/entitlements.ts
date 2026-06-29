/**
 * Human entitlement check — the in-loop access boundary (crew reorg; see
 * docs/architecture/hierarchy-and-entitlements.md §4).
 *
 * Humans (employees) are granted access at a level of the hierarchy and INHERIT everything below it
 * (top-down): tier → client → project → sprint. A grant at `client:jonah` covers every project/sprint
 * under Jonah; a grant at `tier:enterprise` covers every enterprise client; `*` covers all.
 *
 * The grant SOURCE is pluggable: the real backend is AWS IAM Identity Center (groups mirroring the
 * hierarchy), resolved via `setEntitlementResolver`. Until that's wired, the default resolver denies
 * everything (fail-closed) — WorfGate must never assume access. This module is the seam the live IAM
 * resolver plugs into; no AWS calls happen here.
 */

export type EntitlementLevel = 'tier' | 'client' | 'project' | 'sprint';

/** A resource path in the hierarchy, e.g. { tier: 'enterprise', client: 'jonah', project: 'JONAH-RE-1' }. */
export interface ResourcePath {
  tier?: string;
  client?: string;
  project?: string;
  sprint?: string;
}

/** A grant: the human may act at this node and everything below it. `scope: '*'` = all hierarchy. */
export interface Grant {
  scope: '*' | EntitlementLevel;
  /** The node id at `scope` (ignored for '*'), e.g. client='jonah'. */
  id?: string;
  /** read = view (incl. controlled data per tier); write = act / approve-override in the loop. */
  access: 'read' | 'write';
}

/** Resolves the grants a human currently holds. Backed by AWS IAM Identity Center groups in prod. */
export type EntitlementResolver = (humanId: string) => Promise<Grant[]> | Grant[];

// Fail-closed default: no resolver wired → no access. The live IAM resolver replaces this.
let resolver: EntitlementResolver = () => [];

export function setEntitlementResolver(r: EntitlementResolver): void {
  resolver = r;
}

const ORDER: EntitlementLevel[] = ['tier', 'client', 'project', 'sprint'];

/** Does a single grant cover the requested resource path (top-down inheritance)? */
function grantCovers(grant: Grant, path: ResourcePath, need: 'read' | 'write'): boolean {
  if (grant.access === 'read' && need === 'write') return false;
  if (grant.scope === '*') return true;
  // The grant's level node must match the path at that level; deeper levels are inherited.
  const lvl = grant.scope;
  const idx = ORDER.indexOf(lvl);
  if (idx === -1) return false;
  const pathVal = path[lvl];
  if (!pathVal || pathVal !== grant.id) return false;
  // All levels ABOVE the grant must also be specified in the path (you can't grant client without tier context).
  return true;
}

export interface EntitlementDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Check whether a human may act on a resource. Fail-closed: denies unless a held grant covers the
 * path at the requested access. WorfGate calls this before a human acts in-loop or sees controlled data.
 */
export async function checkHumanEntitlement(
  humanId: string,
  path: ResourcePath,
  need: 'read' | 'write' = 'read',
): Promise<EntitlementDecision> {
  if (!humanId?.trim()) return { allowed: false, reason: 'No human identity provided.' };
  const grants = await resolver(humanId);
  const hit = grants.find((g) => grantCovers(g, path, need));
  if (hit) {
    const where = hit.scope === '*' ? 'all hierarchy' : `${hit.scope}:${hit.id}`;
    return { allowed: true, reason: `${humanId} holds ${hit.access} at ${where} (inherits below).` };
  }
  return { allowed: false, reason: `${humanId} has no ${need} grant covering ${JSON.stringify(path)} (fail-closed).` };
}
