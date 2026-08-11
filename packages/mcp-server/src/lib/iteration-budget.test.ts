import { describe, it, expect } from 'vitest';
import { computeMaxIterations, SAFE_FALLBACK_ITERATIONS } from './iteration-budget.js';
import type { TeamMember } from './crew-team-assembly.js';

function member(crewId: string, capabilityTier: 1 | 2 | 3 | 4 = 2): TeamMember {
  return { crewId, domain: 'test', capabilityTier, model: 'test/model', provider: 'DeepSeek', reason: 'test' };
}

describe('computeMaxIterations', () => {
  it('freezes to the safe fallback when no team is available', () => {
    expect(computeMaxIterations(null)).toBe(SAFE_FALLBACK_ITERATIONS);
    expect(computeMaxIterations(undefined)).toBe(SAFE_FALLBACK_ITERATIONS);
    expect(computeMaxIterations({ team: [], reflectionRounds: 0 })).toBe(SAFE_FALLBACK_ITERATIONS);
  });

  it('scales up with team size', () => {
    const small = computeMaxIterations({ team: [member('picard')], reflectionRounds: 0 });
    const large = computeMaxIterations({
      team: [member('picard'), member('data'), member('riker'), member('worf'), member('geordi')],
      reflectionRounds: 0,
    });
    expect(large).toBeGreaterThan(small);
  });

  it('scales up with reflection rounds', () => {
    const team = [member('picard'), member('data'), member('riker')];
    const noReflection = computeMaxIterations({ team, reflectionRounds: 0 });
    const withReflection = computeMaxIterations({ team, reflectionRounds: 2 });
    expect(withReflection).toBeGreaterThan(noReflection);
  });

  it('never goes below the old flat-12 floor that caused the max-iterations bug', () => {
    const tiny = computeMaxIterations({ team: [member('picard')], reflectionRounds: 0 });
    expect(tiny).toBeGreaterThanOrEqual(12);
  });

  it('is bounded at 50 even for a huge crew with many reflection rounds', () => {
    const hugeTeam = Array.from({ length: 11 }, (_, i) => member(`crew-${i}`, 4));
    expect(computeMaxIterations({ team: hugeTeam, reflectionRounds: 3 })).toBeLessThanOrEqual(50);
  });
});
