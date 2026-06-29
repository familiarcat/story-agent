import { describe, it, expect } from 'vitest';
import { businessTierFromSecurityTier, enforceEnterpriseFloor, assertTierAttestation } from './business-tier.js';
import { checkHumanEntitlement, setEntitlementResolver, type Grant } from './entitlements.js';

describe('business tier', () => {
  it('derives tier from security tier', () => {
    expect(businessTierFromSecurityTier('regulated')).toBe('enterprise');
    expect(businessTierFromSecurityTier('enterprise')).toBe('enterprise');
    expect(businessTierFromSecurityTier('standard')).toBe('commercial');
  });

  it('enterprise floors a standard security tier up to enterprise', () => {
    expect(enforceEnterpriseFloor('enterprise', 'standard')).toBe('enterprise');
    expect(enforceEnterpriseFloor('enterprise', 'regulated')).toBe('regulated');
    expect(enforceEnterpriseFloor('commercial', 'standard')).toBe('standard');
  });

  it('requires a manager attestation to place a client in the enterprise tier', () => {
    expect(() => assertTierAttestation('commercial')).not.toThrow();
    expect(() => assertTierAttestation('enterprise')).toThrow(/attestation/i);
    expect(() => assertTierAttestation('enterprise', { approvedBy: '', statement: 'x', approvedAt: 't' })).toThrow();
    expect(() => assertTierAttestation('enterprise', { approvedBy: 'mgr', statement: 'ITAR data', approvedAt: 't' })).not.toThrow();
  });
});

describe('human entitlements (top-down inheritance, fail-closed)', () => {
  it('denies by default (no resolver)', async () => {
    setEntitlementResolver(() => []);
    const d = await checkHumanEntitlement('alice', { tier: 'enterprise', client: 'jonah', project: 'JONAH-RE-1' }, 'write');
    expect(d.allowed).toBe(false);
  });

  it('a client-level grant inherits projects below it', async () => {
    const grants: Grant[] = [{ scope: 'client', id: 'jonah', access: 'write' }];
    setEntitlementResolver(() => grants);
    expect((await checkHumanEntitlement('bob', { tier: 'enterprise', client: 'jonah', project: 'JONAH-RE-1' }, 'write')).allowed).toBe(true);
    // different client → denied
    expect((await checkHumanEntitlement('bob', { tier: 'enterprise', client: 'bayer' }, 'read')).allowed).toBe(false);
  });

  it('read grant does not satisfy a write need; "*" covers all', async () => {
    setEntitlementResolver(() => [{ scope: 'client', id: 'jonah', access: 'read' }]);
    expect((await checkHumanEntitlement('carol', { client: 'jonah' }, 'write')).allowed).toBe(false);
    setEntitlementResolver(() => [{ scope: '*', access: 'write' }]);
    expect((await checkHumanEntitlement('root', { tier: 'enterprise', client: 'anything' }, 'write')).allowed).toBe(true);
  });
});
