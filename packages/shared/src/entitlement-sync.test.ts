import { describe, it, expect } from 'vitest';
import { groupName, desiredGroupsFromHierarchy, planReconciliation, membershipsToGrants } from './entitlement-sync.js';
import { checkHumanEntitlement, setEntitlementResolver } from './entitlements.js';

describe('entitlement sync (pure)', () => {
  it('builds canonical group names from the hierarchy', () => {
    const g = desiredGroupsFromHierarchy({ tiers: ['enterprise'], clients: ['jonah'], projects: ['JONAH-RE-1'] });
    expect(g).toEqual(['client:jonah', 'project:JONAH-RE-1', 'tier:enterprise']);
    expect(groupName('client', 'jonah')).toBe('client:jonah');
  });

  it('plans create/delete, never deleting protected baseline groups', () => {
    const plan = planReconciliation(
      ['tier:enterprise', 'client:jonah', 'project:NEW'],
      ['tier:enterprise', 'tier:commercial', 'client:stale'],
    );
    expect(plan.toCreate).toEqual(['client:jonah', 'project:NEW']);
    expect(plan.toDelete).toEqual(['client:stale']); // tier:commercial protected, not deleted
    expect(plan.unchanged).toEqual(['tier:enterprise']);
  });

  it('parses memberships → grants (level, id, access, wildcard)', () => {
    expect(membershipsToGrants(['client:jonah'])).toEqual([{ scope: 'client', id: 'jonah', access: 'write' }]);
    expect(membershipsToGrants(['client:jonah:read'])).toEqual([{ scope: 'client', id: 'jonah', access: 'read' }]);
    expect(membershipsToGrants(['*'])).toEqual([{ scope: '*', access: 'write' }]);
    expect(membershipsToGrants(['garbage', 'notalevel:x'])).toEqual([]);
  });

  it('end-to-end: IAM memberships resolve through checkHumanEntitlement with inheritance', async () => {
    // simulate the live resolver: alice is in client:jonah → inherits its projects
    setEntitlementResolver((id) => (id === 'alice' ? membershipsToGrants(['client:jonah']) : []));
    expect((await checkHumanEntitlement('alice', { tier: 'enterprise', client: 'jonah', project: 'JONAH-RE-1' }, 'write')).allowed).toBe(true);
    expect((await checkHumanEntitlement('alice', { client: 'bayer' }, 'read')).allowed).toBe(false);
    expect((await checkHumanEntitlement('bob', { client: 'jonah' }, 'read')).allowed).toBe(false);
  });
});
