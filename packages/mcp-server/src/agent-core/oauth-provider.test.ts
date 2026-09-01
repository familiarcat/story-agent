import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase-backed data layer entirely — these tests exercise the OAuthServerProvider's
// own logic (token issuance/verification, client-ownership checks, error handling), not Supabase
// itself. oauth-db.ts's actual queries have no branching logic worth unit-testing in isolation;
// what matters is that oauth-provider.ts calls them correctly and reacts correctly to their results.
const mockDb = {
  registerOAuthClient: vi.fn(),
  getOAuthClient: vi.fn(),
  createAuthorizationCode: vi.fn(),
  peekAuthorizationCode: vi.fn(),
  consumeAuthorizationCode: vi.fn(),
  revokeTokenJti: vi.fn(),
  isTokenRevoked: vi.fn(),
  cacheClientPolicy: vi.fn(),
  DEFAULT_STANDARD_POLICY: {},
};
vi.mock('@story-agent/shared', () => mockDb);

process.env.STORY_AGENT_OAUTH_SIGNING_KEY = 'test-signing-key-at-least-32-bytes-long-for-hs256-please';
process.env.STORY_AGENT_OAUTH_ISSUER = 'https://test.example.com';
process.env.STORY_AGENT_OAUTH_OWNER_PASSPHRASE = 'correct-horse-battery-staple';

const { storyAgentOAuthProvider, checkOwnerPassphrase, verifyPendingAuthorization } = await import('./oauth-provider.js');

function fakeClient(clientId = 'sa_testclient') {
  return {
    client_id: clientId,
    client_name: 'Test Client',
    redirect_uris: ['https://claude.ai/callback'],
    token_endpoint_auth_method: 'none' as const,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.isTokenRevoked.mockResolvedValue(false);
});

describe('checkOwnerPassphrase (single-owner consent gate)', () => {
  it('accepts the exact configured passphrase', () => {
    expect(checkOwnerPassphrase('correct-horse-battery-staple')).toBe(true);
  });
  it('rejects a wrong passphrase', () => {
    expect(checkOwnerPassphrase('wrong')).toBe(false);
  });
  it('rejects an empty passphrase', () => {
    expect(checkOwnerPassphrase('')).toBe(false);
  });
  it('fails closed when unset (no accidental open-door deploy)', () => {
    const prev = process.env.STORY_AGENT_OAUTH_OWNER_PASSPHRASE;
    delete process.env.STORY_AGENT_OAUTH_OWNER_PASSPHRASE;
    expect(checkOwnerPassphrase('anything')).toBe(false);
    process.env.STORY_AGENT_OAUTH_OWNER_PASSPHRASE = prev;
  });
});

describe('clientsStore', () => {
  it('registerClient stores via oauth-db and returns a spec-shaped client', async () => {
    mockDb.registerOAuthClient.mockResolvedValue({
      client_id: 'sa_abc123',
      client_name: 'Claude.ai',
      redirect_uris: ['https://claude.ai/callback'],
      token_endpoint_auth_method: 'none',
      created_at: '2026-08-12T00:00:00.000Z',
    });
    const result = await storyAgentOAuthProvider.clientsStore.registerClient!({
      redirect_uris: ['https://claude.ai/callback'],
      client_name: 'Claude.ai',
    } as any);
    expect(result.client_id).toBe('sa_abc123');
    expect(result.redirect_uris).toEqual(['https://claude.ai/callback']);
    expect(mockDb.registerOAuthClient).toHaveBeenCalledWith({ clientName: 'Claude.ai', redirectUris: ['https://claude.ai/callback'] });
  });

  it('getClient returns undefined (not throw) for an unknown client — SDK contract', async () => {
    mockDb.getOAuthClient.mockResolvedValue(null);
    const result = await storyAgentOAuthProvider.clientsStore.getClient('sa_nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('exchangeAuthorizationCode → verifyAccessToken (the actual JWT round trip)', () => {
  it('issues an access token that verifyAccessToken accepts, with the right client/scope', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode',
      client_id: 'sa_testclient',
      code_challenge: 'x',
      code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback',
      resource: null,
      scopes: ['crew:deliberate', 'crew:memory'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const tokens = await storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient(), 'testcode');
    expect(tokens.token_type).toBe('bearer');
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.scope).toBe('crew:deliberate crew:memory');

    const authInfo = await storyAgentOAuthProvider.verifyAccessToken(tokens.access_token);
    expect(authInfo.clientId).toBe('sa_testclient');
    expect(authInfo.scopes).toEqual(['crew:deliberate', 'crew:memory']);
    expect(authInfo.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects exchange when the code was already consumed / unknown / expired (replay protection)', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue(null); // atomic UPDATE found nothing to consume
    await expect(storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient(), 'reused-code')).rejects.toThrow(/already used|expired|unknown/);
  });

  it('rejects exchange when the code belongs to a different client (cross-client code theft)', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode', client_id: 'sa_someone_else', code_challenge: 'x', code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback', resource: null, scopes: ['crew:deliberate'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    await expect(storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient('sa_testclient'), 'testcode')).rejects.toThrow(/not issued to this client/);
  });
});

describe('token-type confusion protection', () => {
  it('rejects a REFRESH token presented as an access token', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode', client_id: 'sa_testclient', code_challenge: 'x', code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback', resource: null, scopes: ['crew:deliberate'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    const tokens = await storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient(), 'testcode');
    // The refresh token is structurally a valid, correctly-signed JWT — it must still be rejected
    // here because its token_type claim says 'refresh', not 'access'. This is the exact bug class
    // "check token_type" exists to prevent: a leaked refresh token being usable as an access token.
    await expect(storyAgentOAuthProvider.verifyAccessToken(tokens.refresh_token!)).rejects.toThrow();
  });

  it('rejects an ACCESS token presented to exchangeRefreshToken', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode', client_id: 'sa_testclient', code_challenge: 'x', code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback', resource: null, scopes: ['crew:deliberate'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    const tokens = await storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient(), 'testcode');
    await expect(storyAgentOAuthProvider.exchangeRefreshToken(fakeClient(), tokens.access_token)).rejects.toThrow();
  });
});

describe('exchangeRefreshToken', () => {
  it('rotates the refresh token and revokes the old one', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode', client_id: 'sa_testclient', code_challenge: 'x', code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback', resource: null, scopes: ['crew:deliberate'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    const first = await storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient(), 'testcode');
    const rotated = await storyAgentOAuthProvider.exchangeRefreshToken(fakeClient(), first.refresh_token!);

    expect(rotated.refresh_token).toBeTruthy();
    expect(rotated.refresh_token).not.toBe(first.refresh_token); // actually rotated, not reissued verbatim
    expect(mockDb.revokeTokenJti).toHaveBeenCalledTimes(1); // the OLD refresh token's jti got blocklisted
  });

  it('rejects a refresh token belonging to a different client', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode', client_id: 'sa_testclient', code_challenge: 'x', code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback', resource: null, scopes: ['crew:deliberate'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    const tokens = await storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient('sa_testclient'), 'testcode');
    await expect(storyAgentOAuthProvider.exchangeRefreshToken(fakeClient('sa_a_different_client'), tokens.refresh_token!)).rejects.toThrow(/not issued to this client/);
  });
});

describe('revocation', () => {
  it('verifyAccessToken rejects a token whose jti has been revoked', async () => {
    mockDb.consumeAuthorizationCode.mockResolvedValue({
      code: 'testcode', client_id: 'sa_testclient', code_challenge: 'x', code_challenge_method: 'S256',
      redirect_uri: 'https://claude.ai/callback', resource: null, scopes: ['crew:deliberate'],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    const tokens = await storyAgentOAuthProvider.exchangeAuthorizationCode(fakeClient(), 'testcode');
    mockDb.isTokenRevoked.mockResolvedValue(true); // simulate a subsequent revocation
    await expect(storyAgentOAuthProvider.verifyAccessToken(tokens.access_token)).rejects.toThrow();
  });

  it('revokeToken is a no-op (per RFC 7009) for garbage input rather than throwing', async () => {
    await expect(storyAgentOAuthProvider.revokeToken!(fakeClient(), { token: 'not-a-real-jwt' })).resolves.toBeUndefined();
  });
});

describe('verifyPendingAuthorization (the GET /authorize → POST /authorize/confirm bridge)', () => {
  it('round-trips the authorization params through a signed pending token', async () => {
    const res: any = { status: () => res, type: () => res, send: (html: string) => { res.html = html; } };
    await storyAgentOAuthProvider.authorize(fakeClient(), {
      state: 'xyz',
      scopes: ['crew:deliberate'],
      codeChallenge: 'abc123challenge',
      redirectUri: 'https://claude.ai/callback',
    }, res);

    const match = res.html.match(/name="pending" value="([^"]+)"/);
    expect(match).toBeTruthy();
    const claim = await verifyPendingAuthorization(match[1]);
    expect(claim.clientId).toBe('sa_testclient');
    expect(claim.redirectUri).toBe('https://claude.ai/callback');
    expect(claim.codeChallenge).toBe('abc123challenge');
    expect(claim.state).toBe('xyz');
  });

  it('rejects a tampered pending token', async () => {
    await expect(verifyPendingAuthorization('not.a.valid.jwt')).rejects.toThrow();
  });
});
