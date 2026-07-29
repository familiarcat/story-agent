import { describe, it, expect } from 'vitest';
import {
  classifyStance,
  buildDigest,
  buildReflectionSystemPrompt,
  summarizeReflection,
  resolveReflectionRounds,
  type RoundContribution,
} from './reflection-rounds.js';

const c = (crewId: string, text: string): RoundContribution => ({ crewId, model: 'deepseek/deepseek-chat', text, costUSD: 0.0002 });

describe('classifyStance', () => {
  it('reads each declared stance', () => {
    expect(classifyStance('REVISED — Worf changed my mind on the gate.')).toBe('revised');
    expect(classifyStance('HELD — the cost argument still stands.')).toBe('held');
    expect(classifyStance('CONCEDED — I defer to Quark on pricing.')).toBe('conceded');
  });

  it('is case-insensitive and tolerates inflection', () => {
    expect(classifyStance('revised: new evidence')).toBe('revised');
    expect(classifyStance('I hold my position')).toBe('held');
    expect(classifyStance('Concede to Data.')).toBe('conceded');
  });

  // Officers hedge. "I concede, I will not hold to my earlier claim" must read as movement, not a hold.
  it('prefers CONCEDED over HELD when both words appear', () => {
    expect(classifyStance('CONCEDED — I will not hold my earlier position.')).toBe('conceded');
  });

  it('returns unknown when no stance was declared', () => {
    expect(classifyStance('The system should be more observable.')).toBe('unknown');
    expect(classifyStance('')).toBe('unknown');
  });
});

describe('buildDigest', () => {
  const all = [c('worf', 'Publish must stay gated.'), c('quark', 'Triads cost 3x.'), c('yar', 'Need evidence first.')];

  it('excludes the reading officer so they respond to others, not themselves', () => {
    const d = buildDigest(all, 'quark');
    expect(d).toContain('worf:');
    expect(d).toContain('yar:');
    expect(d).not.toContain('quark:');
  });

  it('truncates long positions to bound token growth', () => {
    const long = [c('picard', 'x'.repeat(1000)), c('worf', 'short')];
    const d = buildDigest(long, 'worf', 100);
    expect(d).toContain('…');
    expect(d.length).toBeLessThan(200);
  });

  it('collapses whitespace so multi-line positions stay one line each', () => {
    expect(buildDigest([c('data', 'line one\n\n  line two')], 'worf')).toBe('data: line one line two');
  });

  it('returns empty string when the officer is the only contributor', () => {
    expect(buildDigest([c('worf', 'solo')], 'worf')).toBe('');
  });
});

describe('buildReflectionSystemPrompt', () => {
  it('demands a machine-readable stance and forbids restating', () => {
    const p = buildReflectionSystemPrompt('worf', 'security', 2, 3);
    expect(p).toContain('round 2 of 3');
    expect(p).toContain('REVISED');
    expect(p).toContain('CONCEDED');
    expect(p).toContain('HELD');
    expect(p).toMatch(/do NOT simply restate/i);
  });

  it('warns against manufacturing agreement', () => {
    expect(buildReflectionSystemPrompt('troi', 'stakeholder', 3, 3)).toMatch(/do not manufacture agreement/i);
  });
});

describe('summarizeReflection — the anti-theater measurement', () => {
  it('records who moved and does not warn when positions changed', () => {
    const s = summarizeReflection([
      [c('worf', 'HELD — gate stays.'), c('quark', 'REVISED — Worf is right about blast radius.')],
      [c('worf', 'HELD — unchanged.'), c('yar', 'CONCEDED — defer to Worf.')],
    ]);
    expect(s.positionsChanged).toEqual(['quark', 'yar']);
    expect(s.theaterWarning).toBe(false);
    expect(s.stanceCounts.held).toBe(2);
    expect(s.stanceCounts.revised).toBe(1);
    expect(s.stanceCounts.conceded).toBe(1);
  });

  // The central check: a template also produces perfect agreement. Unanimity is only evidence when
  // dissent was possible, so a deliberation where nobody budged must be flagged as unvalidated.
  it('WARNS when reflection ran but nobody revised or conceded', () => {
    const s = summarizeReflection([
      [c('worf', 'HELD — as stated.'), c('quark', 'HELD — as stated.')],
      [c('worf', 'HELD — as stated.'), c('quark', 'HELD — as stated.')],
    ]);
    expect(s.theaterWarning).toBe(true);
    expect(s.positionsChanged).toEqual([]);
    expect(s.note).toMatch(/not evidence/);
  });

  it('treats an all-unknown round as theater too (no declared movement)', () => {
    const s = summarizeReflection([[c('worf', 'Some general commentary.')]]);
    expect(s.theaterWarning).toBe(true);
    expect(s.stanceCounts.unknown).toBe(1);
  });

  it('does not warn when no reflection rounds ran at all', () => {
    const s = summarizeReflection([]);
    expect(s.theaterWarning).toBe(false);
    expect(s.rounds).toBe(0);
    expect(s.note).toMatch(/single-round/);
  });

  it('does not warn when rounds exist but contain no contributions', () => {
    const s = summarizeReflection([[], []]);
    expect(s.theaterWarning).toBe(false);
  });

  it('counts an officer once even if they move in several rounds', () => {
    const s = summarizeReflection([[c('quark', 'REVISED — a.')], [c('quark', 'REVISED — b.')]]);
    expect(s.positionsChanged).toEqual(['quark']);
  });
});

describe('resolveReflectionRounds', () => {
  it('defaults to 3 — the operator\'s "3x self-reflection"', () => {
    expect(resolveReflectionRounds(undefined, {} as NodeJS.ProcessEnv)).toBe(3);
  });

  it('honours an explicit argument over the environment', () => {
    expect(resolveReflectionRounds(1, { CREW_REFLECTION_ROUNDS: '4' } as any)).toBe(1);
  });

  it('reads CREW_REFLECTION_ROUNDS when no explicit value is given', () => {
    expect(resolveReflectionRounds(undefined, { CREW_REFLECTION_ROUNDS: '2' } as any)).toBe(2);
  });

  it('allows 0 to restore the old blind single-round behaviour', () => {
    expect(resolveReflectionRounds(0, {} as NodeJS.ProcessEnv)).toBe(0);
    expect(resolveReflectionRounds(undefined, { CREW_REFLECTION_ROUNDS: '0' } as any)).toBe(0);
  });

  it('clamps to a sane ceiling so cost cannot run away', () => {
    expect(resolveReflectionRounds(99, {} as NodeJS.ProcessEnv)).toBe(5);
    expect(resolveReflectionRounds(-3, {} as NodeJS.ProcessEnv)).toBe(0);
  });

  it('ignores junk env values and falls back to the default', () => {
    expect(resolveReflectionRounds(undefined, { CREW_REFLECTION_ROUNDS: 'lots' } as any)).toBe(3);
    expect(resolveReflectionRounds(undefined, { CREW_REFLECTION_ROUNDS: '' } as any)).toBe(3);
  });
});
