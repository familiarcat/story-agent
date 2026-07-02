import { describe, it, expect } from 'vitest';
import { laneForRoute, summarizeLanes, laneBanner, buildStatusMarker, type LedgerEntry } from './control-lane.js';

describe('control-lane', () => {
  it('maps routes to lanes', () => {
    expect(laneForRoute('delegate')).toBe('crew');
    expect(laneForRoute('native')).toBe('anthropic');
  });

  it('summarizes intent (decisions) + actual (crew-run) separately, Worf-safe', () => {
    const entries: LedgerEntry[] = [
      { route: 'delegate', savingsUSD: 0.02, tokens: 1000 },       // legacy decision (no kind)
      { kind: 'decision', route: 'delegate', savingsUSD: 0.03, tokens: 1500 },
      { kind: 'decision', route: 'native' },
      { kind: 'crew-run', costUSD: 0.0026, members: 9, label: 'pipeline' },
    ];
    const s = summarizeLanes(entries);
    expect(s.totalDecisions).toBe(3);
    expect(s.crew.decisions).toBe(2);
    expect(s.anthropic.decisions).toBe(1);
    expect(s.crew.actualRuns).toBe(1);
    expect(s.crew.actualCostUSD).toBeCloseTo(0.0026, 6);
    expect(s.cumulativeSavingsUSD).toBeCloseTo(0.05, 6);
    expect(s.delegationRatePct).toBe(67); // 2 of 3
    expect(s.currentLane).toBe('anthropic'); // last decision
  });

  it('empty ledger → zeros, no throw', () => {
    const s = summarizeLanes([]);
    expect(s.totalDecisions).toBe(0);
    expect(s.delegationRatePct).toBe(0);
    expect(s.currentLane).toBeNull();
    expect(laneBanner(s)).toContain('Control lane');
    expect(buildStatusMarker(s, '2026-07-02T00:00:00Z').headline).toContain('ANTHROPIC');
  });
});
