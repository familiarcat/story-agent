import { describe, it, expect } from 'vitest';
import { escalatedTierForBusinessTier, effectiveCapabilityTier, quarkSelectModelForRequester, crewBaseTier } from './crew-team-assembly.js';

describe('tier-aware LLM escalation (business tier → OpenRouter model tier)', () => {
  it('enterprise → frontier tier 4; commercial → cost tier 3; none → 0 (no escalation)', () => {
    expect(escalatedTierForBusinessTier('enterprise')).toBe(4);
    expect(escalatedTierForBusinessTier('commercial')).toBe(3);
    expect(escalatedTierForBusinessTier(undefined)).toBe(0);
    expect(escalatedTierForBusinessTier(null)).toBe(0);
  });

  it('floors UP, never down', () => {
    expect(effectiveCapabilityTier('obrien')).toBe(crewBaseTier('obrien')); // base 2, no requester
    expect(effectiveCapabilityTier('obrien', 'enterprise')).toBe(4); // escalated to leader/frontier
    expect(effectiveCapabilityTier('obrien', 'commercial')).toBe(3); // raised to cost-optimized floor
    expect(effectiveCapabilityTier('data', 'commercial')).toBe(4);   // base 4 wins — never lowered
  });

  it('enterprise selects a frontier model; commercial stays cheaper', () => {
    const ent = quarkSelectModelForRequester('obrien', 'enterprise');
    const com = quarkSelectModelForRequester('obrien', 'commercial');
    expect(ent.tier).toBe(4);                       // leader/frontier (e.g. anthropic sonnet)
    expect(com.tier).toBeGreaterThanOrEqual(3);     // cost-optimized (e.g. deepseek)
    expect(com.costIn).toBeLessThan(ent.costIn);    // commercial never silently pulls frontier $
  });
});
