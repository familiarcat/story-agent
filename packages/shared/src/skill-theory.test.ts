import { describe, it, expect } from 'vitest';
import {
  defineSkillTheory,
  getSkillTheory,
  validateSkillTheory,
  mcpAnnotationsFor,
  skillCoverage,
  type SkillTheory,
} from './skill-theory.js';

const sample: SkillTheory = {
  tool: 'sample_tool',
  who: { owner: 'worf', minTier: 'enterprise' },
  what: { summary: 'Does a sample thing.', capabilities: ['demo'] },
  when: { useWhen: ['when testing'], avoidWhen: ['in production'] },
  where: { scope: ['meta'], surfaces: ['mcp'], sideEffects: 'none' },
  why: { rationale: 'to exercise the framework', goalsServed: ['testing'] },
  how: { invocation: 'sample_tool({})', annotations: { title: 'Sample', readOnlyHint: true, idempotentHint: true }, output: 'a result' },
};

describe('SkillTheory framework', () => {
  it('validates a complete theory', () => {
    expect(validateSkillTheory(sample).ok).toBe(true);
  });

  it('rejects an incomplete theory with the missing dimensions', () => {
    const v = validateSkillTheory({ tool: 'x' } as any);
    expect(v.ok).toBe(false);
    expect(v.missing).toEqual(expect.arrayContaining(['who', 'what', 'when', 'where', 'why', 'how']));
  });

  it('defineSkillTheory throws on an incomplete theory (no half-described skills)', () => {
    expect(() => defineSkillTheory({ tool: 'broken' } as any)).toThrow(/incomplete/);
  });

  it('registers and retrieves a theory', () => {
    defineSkillTheory(sample);
    expect(getSkillTheory('sample_tool')?.who.owner).toBe('worf');
  });

  it('exposes MCP ToolAnnotations from the theory (theory → protocol)', () => {
    defineSkillTheory(sample);
    expect(mcpAnnotationsFor('sample_tool')).toEqual({ title: 'Sample', readOnlyHint: true, idempotentHint: true });
  });

  it('reports coverage and flags undescribed tools', () => {
    defineSkillTheory(sample);
    const cov = skillCoverage(['sample_tool', 'not_described_1', 'not_described_2']);
    expect(cov.described).toBe(1);
    expect(cov.total).toBe(3);
    expect(cov.missing).toEqual(['not_described_1', 'not_described_2']);
  });
});
