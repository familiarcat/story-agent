import { describe, it, expect } from 'vitest';
import { TaskPlan, buildIncompleteNudge } from './task-plan.js';
import { normalizeStepDescription, resolveCompletedIds } from './task-plan-tool.js';

describe('TaskPlan — declaration', () => {
  it('assigns 1-based ids and starts every step pending', () => {
    const p = new TaskPlan();
    const steps = p.declare(['read the file', 'edit it', 'build']);
    expect(steps.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('ignores blank descriptions', () => {
    const p = new TaskPlan();
    expect(p.declare(['a', '', '   ', 'b'])).toHaveLength(2);
  });

  it('reports no plan before declaration', () => {
    expect(new TaskPlan().hasPlan()).toBe(false);
  });

  it('allows replacing the plan after reading the code', () => {
    const p = new TaskPlan();
    p.declare(['guess']);
    p.complete([1]);
    p.declare(['informed step one', 'informed step two']);
    const a = p.assess();
    expect(a.total).toBe(2);
    expect(a.completed).toBe(0); // replacement resets status; it is not a way to bank credit
  });

  it('snapshot is a copy, so callers cannot mutate internal state', () => {
    const p = new TaskPlan();
    p.declare(['x']);
    p.snapshot()[0].status = 'done';
    expect(p.assess().completed).toBe(0);
  });
});

describe('TaskPlan — completion', () => {
  it('marks steps done by id', () => {
    const p = new TaskPlan();
    p.declare(['a', 'b', 'c']);
    const r = p.complete([1, 3]);
    expect(r.completed).toEqual([1, 3]);
    expect(r.unknown).toEqual([]);
    expect(p.assess().completed).toBe(2);
  });

  it('reports unknown ids rather than silently ignoring them', () => {
    const p = new TaskPlan();
    p.declare(['a']);
    expect(p.complete([1, 99]).unknown).toEqual([99]);
  });

  it('is idempotent — completing twice does not double-count', () => {
    const p = new TaskPlan();
    p.declare(['a', 'b']);
    p.complete([1]);
    p.complete([1]);
    expect(p.assess().completed).toBe(1);
  });
});

// This is the whole point: "7 tool calls then stopped" is indistinguishable from success unless the
// model stated up front what it intended to do.
describe('TaskPlan — the finished-vs-stopped assessment', () => {
  it('a fully completed plan is FINISHED', () => {
    const p = new TaskPlan();
    p.declare(['a', 'b']);
    p.complete([1, 2]);
    const a = p.assess();
    expect(a.satisfied).toBe(true);
    expect(a.note).toMatch(/^Finished/);
  });

  it('a partially completed plan is STOPPED, and names what is outstanding', () => {
    const p = new TaskPlan();
    p.declare(['create web-tools.ts', 'register in AGENT_TOOLS', 'classify in WorfGate']);
    p.complete([1, 2]);
    const a = p.assess();
    expect(a.satisfied).toBe(false);
    expect(a.note).toMatch(/STOPPED, not finished/);
    expect(a.remaining).toEqual(['classify in WorfGate']);
    expect(a.completed).toBe(2);
    expect(a.total).toBe(3);
  });

  it('an undeclared plan cannot be judged, so it does not block finishing', () => {
    const a = new TaskPlan().assess();
    expect(a.declared).toBe(false);
    expect(a.satisfied).toBe(true);
    expect(a.note).toMatch(/could not be verified/);
  });

  it('an explicit abandonment is honest but still NOT satisfied', () => {
    const p = new TaskPlan();
    p.declare(['a', 'b']);
    p.complete([1]);
    p.abandon('the API key is missing, cannot proceed');
    const a = p.assess();
    expect(a.satisfied).toBe(false);
    expect(a.note).toMatch(/ABANDONED/);
    expect(a.note).toContain('API key is missing');
  });

  it('records a reason even when the model abandons without giving one', () => {
    const p = new TaskPlan();
    p.declare(['a']);
    p.abandon('   ');
    expect(p.assess().note).toContain('no reason given');
  });

  it('a re-declared plan is judged on the CURRENT steps, not the old ones', () => {
    const p = new TaskPlan();
    p.declare(['a', 'b', 'c']);
    p.complete([1, 2, 3]);
    p.declare(['d']); // revised plan, new work outstanding
    expect(p.assess().satisfied).toBe(false);
  });
});

describe('TaskPlan — render', () => {
  it('shows checkboxes and a done count', () => {
    const p = new TaskPlan();
    p.declare(['first', 'second']);
    p.complete([1]);
    const out = p.render();
    expect(out).toContain('1/2 done');
    expect(out).toContain('[x] 1. first');
    expect(out).toContain('[ ] 2. second');
  });

  it('surfaces an abandonment', () => {
    const p = new TaskPlan();
    p.declare(['x']);
    p.abandon('blocked on creds');
    expect(p.render()).toContain('ABANDONED: blocked on creds');
  });

  it('says so when nothing was declared', () => {
    expect(new TaskPlan().render()).toBe('(no plan declared)');
  });
});

describe('buildIncompleteNudge', () => {
  it('states the shortfall, lists outstanding work, and offers an honest exit', () => {
    const p = new TaskPlan();
    p.declare(['a', 'b', 'c']);
    p.complete([1]);
    const msg = buildIncompleteNudge(p.assess(), p.render());
    expect(msg).toContain('2 of your 3 declared step(s) NOT done');
    expect(msg).toContain('abandon');
    expect(msg).toMatch(/Do NOT summarize/);
    expect(msg).toContain('b');
    expect(msg).toContain('c');
  });
});

// ── The dialects models ACTUALLY emit ─────────────────────────────────────────────────────────────
// Captured verbatim from one live tier-3 run. Naive coercion produced "[object Object]" step titles
// and rejected seven consecutive complete calls, which means nothing was tracked and the contract was
// vacuous. A planning tool that only accepts its own documented shape provides no contract at all.
describe('normalizeStepDescription', () => {
  it('accepts a plain string', () => {
    expect(normalizeStepDescription('read the file')).toBe('read the file');
  });

  it('accepts { name } — the shape observed live', () => {
    expect(normalizeStepDescription({ name: 'Count test files' })).toBe('Count test files');
  });

  it('accepts description / title / text / step / content / task keys', () => {
    expect(normalizeStepDescription({ description: 'a' })).toBe('a');
    expect(normalizeStepDescription({ title: 'b' })).toBe('b');
    expect(normalizeStepDescription({ text: 'c' })).toBe('c');
    expect(normalizeStepDescription({ step: 'd' })).toBe('d');
    expect(normalizeStepDescription({ content: 'e' })).toBe('e');
    expect(normalizeStepDescription({ task: 'f' })).toBe('f');
  });

  it('prefers description over name when both are present', () => {
    expect(normalizeStepDescription({ name: 'short', description: 'fuller' })).toBe('fuller');
  });

  it('never yields "[object Object]"', () => {
    expect(normalizeStepDescription({ unexpected: 1 })).toBe('');
    expect(normalizeStepDescription(null)).toBe('');
    expect(normalizeStepDescription(42)).toBe('');
  });
});

describe('resolveCompletedIds', () => {
  const planWith = () => {
    const p = new TaskPlan();
    p.declare(['Read PUBLISH_SHELL entries', 'Count test files', 'Report class name']);
    return p;
  };

  it('accepts the documented id array', () => {
    expect(resolveCompletedIds({ completed: [1, 3] }, planWith()).sort()).toEqual([1, 3]);
  });

  it('accepts a step object carrying an id — the shape observed live', () => {
    expect(resolveCompletedIds({ step: { id: 2, name: 'Count test files' }, result: 'x' }, planWith())).toEqual([2]);
  });

  it('falls back to matching by NAME when no id is supplied at all', () => {
    expect(resolveCompletedIds({ step: { name: 'Count test files' } }, planWith())).toEqual([2]);
  });

  it('matches a partial description', () => {
    expect(resolveCompletedIds({ step: { name: 'Count test' } }, planWith())).toEqual([2]);
  });

  it('accepts a bare number or numeric string', () => {
    expect(resolveCompletedIds({ step: 3 }, planWith())).toEqual([3]);
    expect(resolveCompletedIds({ id: '1' }, planWith())).toEqual([1]);
  });

  it('accepts an array of step objects', () => {
    expect(resolveCompletedIds({ completed: [{ id: 1 }, { id: 2 }] }, planWith()).sort()).toEqual([1, 2]);
  });

  it('deduplicates ids given in several forms at once', () => {
    expect(resolveCompletedIds({ completed: [1], id: 1, step: { id: 1 } }, planWith())).toEqual([1]);
  });

  it('returns empty when nothing identifies a step', () => {
    expect(resolveCompletedIds({ result: 'done!' }, planWith())).toEqual([]);
  });
});
