import { describe, it, expect } from 'vitest';
import {
  NODE_LEVELS, CHILD_LEVEL, childLevel, actionsForLevel, actionRequiresConfirm, actionsForPersona,
  type NodeLevel,
} from './selection-contract.js';

describe('selection-first contract (firm → client → project → epic → story → task)', () => {
  it('levels are ordered firm → task', () => {
    expect(NODE_LEVELS).toEqual(['firm', 'client', 'project', 'epic', 'story', 'task']);
  });

  it('progressive disclosure: each level points to its child; task is the leaf', () => {
    expect(childLevel('firm')).toBe('client');
    expect(childLevel('project')).toBe('epic');
    expect(childLevel('story')).toBe('task');
    expect(childLevel('task')).toBeNull();
    // CHILD_LEVEL covers every level exactly once
    expect(Object.keys(CHILD_LEVEL).sort()).toEqual([...NODE_LEVELS].sort());
  });

  it('reads are available at every level (open never writes)', () => {
    for (const lvl of NODE_LEVELS) {
      const open = actionsForLevel(lvl as NodeLevel).find(a => a.intent === 'open');
      expect(open, `open missing on ${lvl}`).toBeDefined();
      expect(open!.write).toBe(false);
    }
  });

  it('the gated lifecycle WRITES live on story and map to the real tools', () => {
    const story = actionsForLevel('story');
    const writes = story.filter(a => a.write);
    expect(writes.map(a => a.tool)).toEqual(
      expect.arrayContaining(['crew_start_story', 'aha_branch_for_story', 'crew_link_story_pr', 'crew_complete_story']),
    );
    // every write action requires a WorfGate confirm
    expect(writes.every(actionRequiresConfirm)).toBe(true);
  });

  it('firm / client / project / epic / task expose NO direct writes (selection stays safe)', () => {
    for (const lvl of ['firm', 'client', 'project', 'epic', 'task'] as NodeLevel[]) {
      expect(actionsForLevel(lvl).some(a => a.write), `${lvl} should not write`).toBe(false);
    }
  });

  it('plan (read-only) is offered on project, epic, story, task — the PM lane', () => {
    for (const lvl of ['project', 'epic', 'story', 'task'] as NodeLevel[]) {
      expect(actionsForLevel(lvl).some(a => a.intent === 'plan')).toBe(true);
    }
  });

  it('persona filter: developer gets the full code lifecycle; management drops dev-only ops', () => {
    const dev = actionsForPersona('story', 'developer').map(a => a.intent);
    const mgmt = actionsForPersona('story', 'management').map(a => a.intent);
    // developer = the full set
    expect(dev).toEqual(actionsForLevel('story').map(a => a.intent));
    expect(dev).toEqual(expect.arrayContaining(['agent', 'branch', 'link-pr']));
    // management hides dev-only ops...
    expect(mgmt).not.toContain('agent');
    expect(mgmt).not.toContain('branch');
    expect(mgmt).not.toContain('link-pr');
    // ...but keeps reads + approval-style writes
    expect(mgmt).toEqual(expect.arrayContaining(['plan', 'open', 'start-story', 'complete']));
  });

  it('management never loses read access at any level', () => {
    for (const lvl of NODE_LEVELS) {
      const reads = actionsForPersona(lvl as NodeLevel, 'management').filter(a => !a.write);
      expect(reads.length, `management has no reads on ${lvl}`).toBeGreaterThan(0);
    }
  });
});
