import { describe, it, expect } from 'vitest';
import { scoreDelegation } from './delegation-router.js';

describe('scoreDelegation', () => {
  it('keeps trivial/conversational prompts native', () => {
    for (const p of ['thanks', 'continue', 'fix this typo', 'what is a closure?']) {
      expect(scoreDelegation(p).route).toBe('native');
    }
  });

  it('delegates substantive design/analysis prompts (deliberate mode)', () => {
    const d = scoreDelegation(
      'Analyze our deployment pipeline and design a strategy to reduce cost across all clients, ' +
      'weighing the trade-offs and recommending an approach.'
    );
    expect(d.route).toBe('delegate');
    expect(d.mode).toBe('deliberate');
    expect(d.savingsUSD).toBeGreaterThan(0);
  });

  it('delegates multi-step coding prompts in agent mode', () => {
    const d = scoreDelegation('Refactor the auth module and migrate every file to the new client API.');
    expect(d.route).toBe('delegate');
    expect(d.mode).toBe('agent');
  });

  it('never silently delegates safety/credential-sensitive prompts', () => {
    const d = scoreDelegation('Rotate the production database credential and the private key.');
    expect(d.route).toBe('native');
    expect(d.signals.safetyGated).toBe(true);
    expect(d.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('is deterministic and reports positive savings when delegating', () => {
    const p = 'Design and plan a migration strategy for the data model, comparing options.';
    const a = scoreDelegation(p);
    const b = scoreDelegation(p);
    expect(a).toEqual(b);
    if (a.route === 'delegate') expect(a.estCostNativeUSD).toBeGreaterThan(a.estCostDelegateUSD);
  });

  it('honors a custom threshold', () => {
    const p = 'Summarize this short note.';
    expect(scoreDelegation(p, { threshold: 0.95 }).route).toBe('native');
  });
});
