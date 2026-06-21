import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveWorfGateCredential,
  resolveWorfGateCredentialAsync,
  registerCredentialProvider,
  listCredentialProviders,
  worfGateHasCredential,
  credentialStatus,
  redactCredential,
} from './worfgate-credentials.js';
import { ocelotCredentialProvider, initWorfGateCredentialProviders } from './worfgate-credential-providers.js';

describe('WorfGate credential broker', () => {
  beforeEach(() => {
    process.env.AHA_API_KEY = 'env-aha-test';
  });
  afterEach(() => {
    delete process.env.AHA_API_KEY;
  });

  it('resolves an authorized credential from the env provider', async () => {
    const r = await resolveWorfGateCredentialAsync('AHA_API_KEY', { operation: 'aha:write', crewId: 'worf' });
    expect(r.authorized).toBe(true);
    expect(r.available).toBe(true);
    expect(r.value).toBe('env-aha-test');
    expect((r as any).source).toBe('env');
  });

  it('sync path resolves from env', () => {
    const r = resolveWorfGateCredential('AHA_API_KEY', { operation: 'aha:read', crewId: 'data' });
    expect(r.authorized).toBe(true);
    expect(r.value).toBe('env-aha-test');
  });

  it('refuses an unauthorized crew member across the chain', async () => {
    const r = await resolveWorfGateCredentialAsync('AHA_API_KEY', { operation: 'aha:write', crewId: 'intruder' });
    expect(r.authorized).toBe(false);
    expect(r.value).toBeUndefined();
  });

  it('refuses a credential used for a non-permitted operation', () => {
    const r = resolveWorfGateCredential('AHA_API_KEY', { operation: 'aws:deploy', crewId: 'worf' });
    expect(r.authorized).toBe(false);
  });

  it('redactCredential never exposes the value', async () => {
    const r = await resolveWorfGateCredentialAsync('AHA_API_KEY', { operation: 'aha:write', crewId: 'worf' });
    const safe = redactCredential(r);
    expect((safe as any).value).toBeUndefined();
    expect(safe.hasValue).toBe(true);
    expect(JSON.stringify(safe)).not.toContain('env-aha-test');
  });

  it('presence-only helpers never return values', () => {
    expect(worfGateHasCredential('AHA_API_KEY')).toBe(true);
    const status = credentialStatus(['AHA_API_KEY']);
    expect(status[0].available).toBe(true);
    expect(JSON.stringify(status)).not.toContain('env-aha-test');
  });

  it('a higher-priority provider overrides env (source reflects origin)', async () => {
    registerCredentialProvider({
      name: 'test-vault',
      priority: 1,
      isActive: () => true,
      get: async (n) => (n === 'AHA_API_KEY' ? 'vault-issued' : undefined),
    });
    const r = await resolveWorfGateCredentialAsync('AHA_API_KEY', { operation: 'aha:write', crewId: 'worf' });
    expect(r.value).toBe('vault-issued');
    expect((r as any).source).toBe('test-vault');
  });
});

describe('Ocelot provider (stub — non-blocking until enabled)', () => {
  afterEach(() => {
    delete process.env.OCELOT_ENABLED;
    delete process.env.OCELOT_GATEWAY_URL;
    delete process.env.OCELOT_API_KEY;
    vi.unstubAllGlobals();
  });

  it('is INACTIVE by default — does not fire or block the chain', () => {
    expect(ocelotCredentialProvider.isActive()).toBe(false);
    process.env.OCELOT_GATEWAY_URL = 'https://gw.example';
    // still inactive without the explicit enable flag
    expect(ocelotCredentialProvider.isActive()).toBe(false);
  });

  it('activates and resolves through the gateway when explicitly enabled', async () => {
    process.env.OCELOT_ENABLED = 'true';
    process.env.OCELOT_GATEWAY_URL = 'https://gw.example';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ secrets: { GITHUB_TOKEN: 'ocelot-gh-token' } }) })) as any);

    expect(ocelotCredentialProvider.isActive()).toBe(true);
    const v = await ocelotCredentialProvider.get('GITHUB_TOKEN');
    expect(v).toBe('ocelot-gh-token');
  });

  it('registers in the chain via init without breaking when inactive', () => {
    const active = initWorfGateCredentialProviders();
    expect(active).not.toContain('ocelot'); // inactive by default
    expect(listCredentialProviders().some(p => p.name === 'ocelot')).toBe(true);
  });
});
