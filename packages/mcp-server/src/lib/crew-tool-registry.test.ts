import { describe, it, expect } from 'vitest';
import { parseVote, parseDecision } from './crew-tool-registry.js';

describe('parseVote (robust verdict parsing)', () => {
  it('honors an explicit VOTE tag', () => {
    expect(parseVote('VOTE: approve\nNOTES: solid')).toBe('approve');
    expect(parseVote('VOTE: reject')).toBe('reject');
  });
  it('infers approve from positive prose with no VOTE tag (the abstain bug)', () => {
    expect(parseVote('This is best-of-breed for our domain; I recommend we adopt it.')).toBe('approve');
  });
  it('infers reject from negative prose', () => {
    expect(parseVote('We should not add this — it duplicates existing tooling.')).toBe('reject');
  });
  it('abstains only when genuinely ambiguous', () => {
    expect(parseVote('It has some pros and some cons.')).toBe('abstain');
  });
});

describe('parseDecision', () => {
  it('honors an explicit DECISION tag', () => {
    expect(parseDecision('DECISION: approved')).toBe('approved');
  });
  it('infers from prose', () => {
    expect(parseDecision('Add to registry — green-light it.')).toBe('approved');
    expect(parseDecision('Run a limited trial first.')).toBe('trial');
    expect(parseDecision('Do not add this tool.')).toBe('rejected');
  });
});
