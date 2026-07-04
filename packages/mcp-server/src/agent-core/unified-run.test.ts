import { describe, it, expect } from 'vitest';
import { buildUnifiedRunRecord } from './unified-run.js';

const base = {
  missionId: 'm1',
  task: 'do a thing',
  plan: { missionPlan: 'step 1', topModel: 'deepseek/deepseek-chat', costUSD: 0.002 },
  run: { iterations: 3, toolCalls: [{}, {}], escalated: false, stalled: false, totalCostUSD: 0.008, finalText: 'done' },
  timestamp: '2026-07-04T00:00:00Z',
};

describe('buildUnifiedRunRecord', () => {
  it('derives toolCalls count from the array length', () => {
    expect(buildUnifiedRunRecord(base).outcome.toolCalls).toBe(2);
  });

  it('sums plan + run cost into totalCostUSD', () => {
    expect(buildUnifiedRunRecord(base).totalCostUSD).toBeCloseTo(0.01, 6);
  });

  it('truncates finalText to 2000 chars', () => {
    const long = { ...base, run: { ...base.run, finalText: 'x'.repeat(5000) } };
    expect(buildUnifiedRunRecord(long).outcome.finalText.length).toBe(2000);
  });

  it('defaults clientId to null', () => {
    expect(buildUnifiedRunRecord(base).clientId).toBeNull();
  });

  it('carries stalled through to the outcome', () => {
    const stalled = { ...base, run: { ...base.run, stalled: true } };
    expect(buildUnifiedRunRecord(stalled).outcome.stalled).toBe(true);
  });
});
