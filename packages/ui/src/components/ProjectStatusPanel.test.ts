import { describe, it, expect } from 'vitest';
import { statusToken, type ProjectStatus } from './ProjectStatusPanel.tokens';

/**
 * Figma→token pilot acceptance (Yar): the component binds to the LCARS token contract only.
 * Node-env test (no DOM) — asserts the pure status→token map returns var(--*) tokens, never hex.
 */
const ALL: ProjectStatus[] = ['pending', 'implementing', 'pr_open', 'merged', 'blocked'];

describe('ProjectStatusPanel — token contract', () => {
  it('every status maps to a var(--*) token, never a hardcoded color', () => {
    for (const s of ALL) {
      const t = statusToken(s);
      expect(t).toMatch(/^var\(--[a-z0-9-]+\)$/); // token, not literal
      expect(t).not.toMatch(/#[0-9a-f]{3,8}/i);   // no hex
      expect(t).not.toMatch(/rgb|hsl/i);          // no literal color fns
    }
  });

  it('distinct statuses use distinct tokens (readable at a glance)', () => {
    const tokens = ALL.map(statusToken);
    expect(new Set(tokens).size).toBe(ALL.length);
  });
});
