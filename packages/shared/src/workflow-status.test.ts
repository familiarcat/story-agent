import { describe, it, expect } from 'vitest';
import { workflowStatusTone, workflowStatusLine, type WorkflowStatusData } from './workflow-status.js';

describe('workflow-status contract (shared crew-feedback shape)', () => {
  it('tone: clean run = ok', () => {
    expect(workflowStatusTone({ model: 'deepseek/deepseek-chat', posture: { green: 3, yellow: 0, red: 0 } })).toBe('ok');
  });
  it('tone: escalation / yellow gate / budget = warn', () => {
    expect(workflowStatusTone({ escalated: true })).toBe('warn');
    expect(workflowStatusTone({ posture: { green: 1, yellow: 1, red: 0 } })).toBe('warn');
    expect(workflowStatusTone({ budgetExceeded: true })).toBe('warn');
  });
  it('tone: stall or red gate = danger (overrides warn)', () => {
    expect(workflowStatusTone({ stalled: true, escalated: true })).toBe('danger');
    expect(workflowStatusTone({ posture: { green: 1, yellow: 2, red: 1 } })).toBe('danger');
  });
  it('line: compact, includes model/turns/tools/cost/posture', () => {
    const s: WorkflowStatusData = { model: 'm', iterations: 5, toolCount: 7, costUSD: 0.0123, posture: { green: 4, yellow: 1, red: 0 } };
    const line = workflowStatusLine(s);
    expect(line).toContain('m');
    expect(line).toContain('5 turns');
    expect(line).toContain('7 tools');
    expect(line).toContain('$0.01230');
    expect(line).toContain('🟢4/🟡1/🔴0');
  });
});
