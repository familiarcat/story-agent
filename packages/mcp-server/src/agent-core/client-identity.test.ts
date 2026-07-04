import { describe, it, expect } from 'vitest';
import { resolveClientId } from './client-identity.js';

describe('resolveClientId', () => {
  it('slugifies values', () => {
    expect(resolveClientId({ 'x-client-id': 'VS Code Ext!' })).toBe('vs-code-ext');
  });

  it('handles capitalized keys', () => {
    expect(resolveClientId({ 'X-Client-Id': 'test' })).toBe('test');
  });

  it('uses first array element', () => {
    expect(resolveClientId({ 'x-client-id': ['first', 'second'] })).toBe('first');
  });

  it('returns anonymous for missing headers', () => {
    expect(resolveClientId({})).toBe('anonymous');
  });

  it('falls back to anonymous for an all-symbol value', () => {
    expect(resolveClientId({ 'x-client-id': '™™™!!!' })).toBe('anonymous');
  });

  it('caps at 64 chars', () => {
    const longInput = 'a'.repeat(100);
    expect(resolveClientId({ 'x-client-id': longInput }).length).toBe(64);
  });
});
