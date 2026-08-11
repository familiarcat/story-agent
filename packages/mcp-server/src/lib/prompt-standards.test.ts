import { describe, it, expect } from 'vitest';
import { buildStructuredPrompt, scoreFramingTips, FRAMING_TIP_REMINDER } from './prompt-standards.js';

describe('buildStructuredPrompt (Prompt Eng Q2: Role→Context→Task→Constraints→Output Format)', () => {
  it('always includes role and task', () => {
    const p = buildStructuredPrompt({ role: 'You are Data.', task: 'Assess the schema change.' });
    expect(p).toContain('You are Data.');
    expect(p).toContain('TASK:\nAssess the schema change.');
  });

  it('omits empty sections entirely rather than emitting an empty header', () => {
    const p = buildStructuredPrompt({ role: 'You are Worf.', task: 'Gate this operation.' });
    expect(p).not.toContain('CONTEXT:');
    expect(p).not.toContain('CONSTRAINTS:');
    expect(p).not.toContain('OUTPUT FORMAT:');
  });

  it('includes context, constraints, and output format when provided, in order', () => {
    const p = buildStructuredPrompt({
      role: 'You are Quark.',
      context: 'Budget is $500/mo.',
      task: 'Recommend a model tier.',
      constraints: ['Stay under budget.', 'Prefer DeepSeek for tier 3.'],
      outputFormat: 'JSON: { tier: number }',
    });
    const roleIdx = p.indexOf('You are Quark.');
    const contextIdx = p.indexOf('CONTEXT:');
    const taskIdx = p.indexOf('TASK:');
    const constraintsIdx = p.indexOf('CONSTRAINTS:');
    const outputIdx = p.indexOf('OUTPUT FORMAT:');
    expect(roleIdx).toBeLessThan(contextIdx);
    expect(contextIdx).toBeLessThan(taskIdx);
    expect(taskIdx).toBeLessThan(constraintsIdx);
    expect(constraintsIdx).toBeLessThan(outputIdx);
    expect(p).toContain('- Stay under budget.');
    expect(p).toContain('- Prefer DeepSeek for tier 3.');
  });
});

describe('scoreFramingTips (the scenario playbook\'s four badges, applied to crew text)', () => {
  // Real sentence from the uploaded scenario 01 answer ("The Support Bot That Outgrew Its Budget").
  const scenario01 = "I'd track cost-per-resolved-ticket alongside a routing-accuracy eval on a representative ticket set, so a cheaper pipeline that also got sloppier wouldn't quietly look like a win. The tradeoff is real: now there are two models and a router to maintain.";

  it('lights up tradeoff and eval badges on real scenario-answer text', () => {
    const s = scoreFramingTips(scenario01);
    expect(s.namesTradeoff).toBe(true);
    expect(s.namesEval).toBe(true);
  });

  // Real sentence from scenario 03 ("The Deployment Agent With Too Much Trust").
  const scenario03 = "the permission scope on the tool is what actually stops a bad call, not the prompt telling the agent to be careful — that's architecture, not prompt-level security.";

  it('lights up the security≠prompt badge when the text draws that distinction', () => {
    const s = scoreFramingTips(scenario03);
    expect(s.securityNePrompt).toBe(true);
  });

  it('does not light up badges on a generic, unanchored statement', () => {
    const s = scoreFramingTips('This looks fine to me, no concerns.');
    expect(s.namesTradeoff).toBe(false);
    expect(s.namesEval).toBe(false);
    expect(s.securityNePrompt).toBe(false);
    expect(s.badgeCount).toBe(0);
  });

  it('badgeCount reflects how many of the four are lit', () => {
    const allFour = scoreFramingTips(
      'On `orders.ts` line 42: the tradeoff is latency versus consistency. ' +
      "I'd track the eval regression suite before and after. This is a permission-scoping issue, not a prompt issue.",
    );
    expect(allFour.badgeCount).toBe(4);
  });

  it('is a pure function with no side effects or model calls (safe to call on every contribution)', () => {
    const a = scoreFramingTips('same input');
    const b = scoreFramingTips('same input');
    expect(a).toEqual(b);
  });
});

describe('FRAMING_TIP_REMINDER', () => {
  it('is a non-empty instruction string safe to append to any crew prompt', () => {
    expect(typeof FRAMING_TIP_REMINDER).toBe('string');
    expect(FRAMING_TIP_REMINDER.length).toBeGreaterThan(20);
  });
});
