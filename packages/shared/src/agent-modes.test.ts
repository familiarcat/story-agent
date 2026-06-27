import { describe, it, expect } from 'vitest';
import { AGENT_MODES, PLAN_AHA_TOOLS, resolveMode, modeAllowsWrite, toolsForMode } from './agent-modes.js';

describe('agent modes contract (Ask / Plan / Agent)', () => {
  it('ask = chat, no tools, no Aha', () => {
    expect(AGENT_MODES.ask.endpoint).toBe('/chat');
    expect(AGENT_MODES.ask.toolPolicy).toBe('none');
    expect(AGENT_MODES.ask.ahaEnabled).toBe(false);
  });
  it('plan = /agent read-only + Aha PM lane', () => {
    expect(AGENT_MODES.plan.endpoint).toBe('/agent');
    expect(AGENT_MODES.plan.toolPolicy).toBe('read-only');
    expect(AGENT_MODES.plan.ahaEnabled).toBe(true);
  });
  it('agent = /agent full loop + Aha', () => {
    expect(AGENT_MODES.agent.toolPolicy).toBe('full');
    expect(AGENT_MODES.agent.ahaEnabled).toBe(true);
  });

  it('PLAN_AHA_TOOLS includes the read hierarchy + gated lifecycle tools', () => {
    expect(PLAN_AHA_TOOLS).toEqual(expect.arrayContaining(['aha:get-record', 'crew_start_story', 'crew_sync_to_aha', 'aha_branch_for_story']));
  });

  it('resolveMode defaults unknown → ask', () => {
    expect(resolveMode('plan').id).toBe('plan');
    expect(resolveMode('nonsense').id).toBe('ask');
    expect(resolveMode(undefined).id).toBe('ask');
  });

  it('only Agent executes writes; Plan proposes (dry-run), Ask never writes', () => {
    expect(modeAllowsWrite('agent')).toBe(true);
    expect(modeAllowsWrite('plan')).toBe(false);
    expect(modeAllowsWrite('ask')).toBe(false);
  });

  it('toolsForMode surfaces Aha tools only when ahaEnabled', () => {
    expect(toolsForMode('ask').ahaTools).toHaveLength(0);
    expect(toolsForMode('plan').ahaTools.length).toBeGreaterThan(0);
    expect(toolsForMode('agent').codeTools).toBe('full');
  });
});
