import { describe, it, expect } from 'vitest';
import { redactSecrets } from './worfgate-redact.js';

describe('redactSecrets (WorfGate value-safe redaction)', () => {
  it('masks an sk- provider key', () => {
    const out = redactSecrets('use sk-abc123def456ghi789jkl for the call');
    expect(out).not.toContain('sk-abc123def456ghi789jkl');
    expect(out).toContain('[REDACTED]');
  });

  it('masks a ghp_ GitHub token', () => {
    expect(redactSecrets('token ghp_ABCdef123456789012345')).not.toContain('ghp_ABCdef');
  });

  it('masks an AWS access key id', () => {
    expect(redactSecrets('AKIAIOSFODNN7EXAMPLE is the id')).toBe('[REDACTED] is the id');
  });

  it('masks a JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(redactSecrets(`bearer-less ${jwt}`)).not.toContain('eyJzdWIi');
  });

  it('keeps the Bearer scheme but masks the token', () => {
    const out = redactSecrets('Authorization: Bearer abcdef123456789');
    expect(out).toMatch(/Bearer \[REDACTED\]/i);
    expect(out).not.toContain('abcdef123456789');
  });

  it('masks credentials embedded in a URL but keeps scheme and host', () => {
    const out = redactSecrets('postgres://user:pw123456@db.example.com/main');
    expect(out).toContain('postgres://');
    expect(out).toContain('db.example.com/main');
    expect(out).not.toContain('pw123456');
  });

  it('masks the value of a sensitively-named key', () => {
    const out = redactSecrets('OPENROUTER_API_KEY=sk-abc123def456ghi');
    expect(out).toContain('OPENROUTER_API_KEY=');
    expect(out).not.toContain('sk-abc123def456ghi');
  });

  it('leaves ordinary prose untouched', () => {
    const prose = 'fix the login button so it stops double-firing on submit';
    expect(redactSecrets(prose)).toBe(prose);
  });

  it('returns empty string for non-string input', () => {
    expect(redactSecrets(undefined)).toBe('');
    expect(redactSecrets(null)).toBe('');
    expect(redactSecrets(42)).toBe('');
    expect(redactSecrets({ key: 'v' })).toBe('');
  });

  it('is idempotent — re-redacting an already-redacted string is a no-op', () => {
    const once = redactSecrets('SUPABASE_SERVICE_ROLE_KEY=sk-abc123def456ghi789 and Bearer abcdef123456789');
    expect(redactSecrets(once)).toBe(once);
  });
});
