import { describe, it, expect } from 'vitest';
import { escalatedTierForBusinessTier, effectiveCapabilityTier, quarkSelectModelForRequester, crewBaseTier, quarkSelectModel, MODEL_POOL } from './crew-team-assembly.js';

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

  it('text routing never selects a visionOnly slug (regression: dead google/gemini-flash-1.5 404 → demo fallback)', () => {
    // gemini-flash-1.5 is the cheapest tier-2 entry by blended cost, but 404s on chat-completions.
    // quarkSelectModel must skip visionOnly entries at every tier so text crew get a live model.
    for (let tier = 1; tier <= 4; tier++) {
      expect(quarkSelectModel(tier).visionOnly).toBeFalsy();
    }
    // Tier-2 crew (obrien/troi/crusher/uhura/quark) resolve to the cheapest LIVE text model.
    expect(quarkSelectModel(2).id).toBe('meta-llama/llama-3.3-70b-instruct');
    // Guard: the visionOnly slug is still present in the pool (available to the vision path).
    expect(MODEL_POOL.some(m => m.id === 'google/gemini-flash-1.5' && m.visionOnly)).toBe(true);
  });
});
