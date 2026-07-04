import { describe, it, expect } from 'vitest';
import { nextEscalationTier } from './escalation-policy.js';

describe('nextEscalationTier', () => {
  it('returns null when below threshold', () => {
    expect(nextEscalationTier(3, 2)).toBeNull();
  });

  it('escalates when at threshold', () => {
    expect(nextEscalationTier(3, 3)).toBe(4);
  });

  it('returns null when already at maxTier', () => {
    expect(nextEscalationTier(4, 3)).toBeNull();
  });

  it('honors custom threshold', () => {
    expect(nextEscalationTier(3, 2, { threshold: 2 })).toBe(4);
  });

  it('honors custom maxTier', () => {
    expect(nextEscalationTier(3, 3, { maxTier: 3 })).toBeNull();
  });
});