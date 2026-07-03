import { describe, it, expect } from 'vitest';
import { chatRoleStyle, type ChatRole } from './ChatMessage.tokens';

describe('ChatMessage — role token contract', () => {
  const roles: ChatRole[] = ['user', 'crew', 'assistant'];

  it('every role binds var(--*) tokens (accent + surface), never hex', () => {
    for (const r of roles) {
      const s = chatRoleStyle(r);
      for (const v of [s.accent, s.surface]) {
        expect(v).toMatch(/^var\(--[a-z0-9-]+\)$/);
        expect(v).not.toMatch(/#[0-9a-f]{3,8}/i);
      }
    }
  });

  it('differentiates You vs Crew; assistant renders as Crew', () => {
    expect(chatRoleStyle('user').label).toBe('You');
    expect(chatRoleStyle('crew').label).toBe('Crew');
    expect(chatRoleStyle('assistant').label).toBe('Crew');
    expect(chatRoleStyle('user').accent).not.toBe(chatRoleStyle('crew').accent);
  });
});
