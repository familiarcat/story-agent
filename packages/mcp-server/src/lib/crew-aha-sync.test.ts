import { describe, it, expect } from 'vitest';
import { crewResultToAhaDraft } from './crew-aha-sync.js';

describe('crewResultToAhaDraft (crew status feed → Aha story)', () => {
  const result = {
    goals: 'GOALS:\n1. Harden the approval channel.\n2. Add tests.',
    missionPlan: 'MISSION PLAN: secure Redis TLS, add approval tests, verify deploy.',
    topModel: 'deepseek/deepseek-chat',
    efficiency: { totalCostUSD: 0.003 },
    contributions: [{ crewId: 'picard' }, { crewId: 'worf' }, { crewId: 'data' }],
    storyId: 'crew-autonomy',
  };

  it('derives a clean title from the first goal (strips list markers)', () => {
    const d = crewResultToAhaDraft(result);
    expect(d.name).toBe('[Crew] Harden the approval channel.');
  });
  it('honors a custom title prefix', () => {
    expect(crewResultToAhaDraft(result, { titlePrefix: '[PROD]' }).name.startsWith('[PROD] ')).toBe(true);
  });
  it('embeds the mission plan + crew + model + cost in the description', () => {
    const d = crewResultToAhaDraft(result);
    expect(d.description).toContain('MISSION PLAN');
    expect(d.description).toContain('picard, worf, data');
    expect(d.description).toContain('deepseek/deepseek-chat');
    expect(d.description).toContain('$0.003');
    expect(d.description).toContain('WorfGate-gated');
  });
  it('falls back to storyId when goals are absent', () => {
    expect(crewResultToAhaDraft({ missionPlan: 'x', storyId: 'snyk-mcp-tools' }).name).toBe('[Crew] snyk-mcp-tools');
  });
});
