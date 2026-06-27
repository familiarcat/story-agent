import { describe, it, expect } from 'vitest';
import { slugify, ahaRefToBranchName, branchCreateCommand } from './git-aha-branching.js';

describe('slugify', () => {
  it('kebab-cases, strips punctuation, bounds length', () => {
    expect(slugify('Redis TLS: add approval tests!')).toBe('redis-tls-add-approval-tests');
    expect(slugify('x'.repeat(60)).length).toBeLessThanOrEqual(40);
  });
});

describe('ahaRefToBranchName (mirrors Aha → git)', () => {
  it('story → story/<REF>-<slug>', () => {
    expect(ahaRefToBranchName({ ref: 'PROD-17', name: 'Redis TLS approval tests', kind: 'story' }))
      .toBe('story/PROD-17-redis-tls-approval-tests');
  });
  it('task → task/<REF>-<slug>', () => {
    expect(ahaRefToBranchName({ ref: 'PROD-17.1', name: 'add fixtures', kind: 'task' }))
      .toBe('task/PROD-17.1-add-fixtures');
  });
  it('normalizes a lowercase/dirty ref and defaults kind to story', () => {
    expect(ahaRefToBranchName({ ref: 'prod-18 ', name: 'Theme system' })).toBe('story/PROD-18-theme-system');
  });
  it('falls back to kind/REF with no title', () => {
    expect(ahaRefToBranchName({ ref: 'PROD-19' })).toBe('story/PROD-19');
  });
  it('throws on empty ref', () => {
    expect(() => ahaRefToBranchName({ ref: '' })).toThrow();
  });
});

describe('branchCreateCommand (never force; from main)', () => {
  it('checks out main, ff-pulls, then creates the branch', () => {
    const cmd = branchCreateCommand('story/PROD-17-x');
    expect(cmd).toContain('git checkout main');
    expect(cmd).toContain('--ff-only');
    expect(cmd).toContain('git checkout -b story/PROD-17-x');
    expect(cmd).not.toContain('--force');
  });
});
