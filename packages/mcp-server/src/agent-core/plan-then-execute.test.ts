import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/crew-mission-pipeline.js', () => ({
  runMissionPipeline: vi.fn(async () => ({ missionPlan: 'MISSION_PLAN_TEXT', efficiency: { totalCostUSD: 0.002 }, topModel: 'deepseek', goals: '', team: [], contributions: [] })),
}));

let captured: { input: string; opts: any } | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
vi.mock('./loop.js', () => ({
  runAgentLoop: vi.fn(async (input: string, opts: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    captured = { input, opts };
    return { finalText: 'DONE', iterations: 2, toolCalls: [], model: 'm', totalCostUSD: 0.01, totalTokens: 0, escalated: false, budgetExceeded: false, stalled: false, observatory: { perProvider: {}, burnRatePerTurnUSD: 0, reviewTriggered: false } };
  }),
}));

import { planThenExecute } from './plan-then-execute.js';

describe('planThenExecute', () => {
  it('deliberates a plan, PREPENDS it to the agent input, and runs the loop', async () => {
    const r = await planThenExecute('add a feature flag', { maxIterations: 7 });
    expect(r.plan.missionPlan).toBe('MISSION_PLAN_TEXT');
    expect(captured?.input).toContain('MISSION_PLAN_TEXT');       // plan injected
    expect(captured?.input).toContain('TASK: add a feature flag'); // original task preserved
    expect(captured?.opts.maxIterations).toBe(7);
    expect(captured?.opts.tier).toBe(3);                           // frugal default
    expect(r.run.finalText).toBe('DONE');
  });
});
