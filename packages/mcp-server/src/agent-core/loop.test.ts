import { describe, it, expect } from 'vitest';
import { looksActionable, shouldEscalate, isRetryable, resolveWorkspaceBinding } from './loop.js';

describe('looksActionable (self-healing stall detection)', () => {
  it('is true for tasks that imply tool use', () => {
    expect(looksActionable('edit the DiffView colors in agent/page.tsx')).toBe(true);
    expect(looksActionable('create scripts/check.mjs and run it')).toBe(true);
    expect(looksActionable('reskin the page through the primitives')).toBe(true);
    expect(looksActionable('fix the failing build')).toBe(true);
  });
  it('is false for pure questions / answers', () => {
    expect(looksActionable('what does this function do?')).toBe(false);
    expect(looksActionable('summarize the architecture')).toBe(false);
  });
});

describe('shouldEscalate', () => {
  it('escalates on security/architecture signals', () => {
    expect(shouldEscalate('review the security of the auth flow')).toBe(true);
    expect(shouldEscalate('design the schema migration')).toBe(true);
  });
  it('escalates on very long prompts (>1200 chars — crew stall-research tuning)', () => {
    expect(shouldEscalate('x'.repeat(1201))).toBe(true);
  });
  it('does NOT escalate a long-but-actionable prompt under the raised threshold', () => {
    expect(shouldEscalate('x'.repeat(601))).toBe(false); // 600→1200 reduces escalation-into-inaction
  });
  it('does not escalate a short simple task', () => {
    expect(shouldEscalate('add a comment to README')).toBe(false);
  });
});

describe('isRetryable', () => {
  it('retries 429 / 5xx / transient network', () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ code: 'ECONNRESET' })).toBe(true);
  });
  it('does not retry a 400', () => {
    expect(isRetryable({ status: 400 })).toBe(false);
  });
});

describe('resolveWorkspaceBinding (2026-08-11 hosted-workspace safety fix)', () => {
  it('local dev (NODE_ENV unset, no explicit workspace) is NOT flagged hosted-without-workspace', () => {
    const r = resolveWorkspaceBinding({}, {});
    expect(r.hostedWithoutWorkspace).toBe(false);
    expect(r.workspaceExplicit).toBe(false);
    expect(r.workspace).toBe(process.cwd());
  });

  it('production with no client workspace and no STORY_AGENT_WORKSPACE IS flagged', () => {
    const r = resolveWorkspaceBinding({}, { NODE_ENV: 'production' });
    expect(r.hostedWithoutWorkspace).toBe(true);
    expect(r.workspaceExplicit).toBe(false);
  });

  it('production WITH an explicit client-supplied workspace is NOT flagged (VS Code lane)', () => {
    const r = resolveWorkspaceBinding({ workspace: '/Users/bradygeorgen/Developer/story-agent' }, { NODE_ENV: 'production' });
    expect(r.hostedWithoutWorkspace).toBe(false);
    expect(r.workspaceExplicit).toBe(true);
    expect(r.workspace).toBe('/Users/bradygeorgen/Developer/story-agent');
  });

  it('production WITH STORY_AGENT_WORKSPACE configured (e.g. a mounted volume) is NOT flagged', () => {
    const r = resolveWorkspaceBinding({}, { NODE_ENV: 'production', STORY_AGENT_WORKSPACE: '/mnt/repo' });
    expect(r.hostedWithoutWorkspace).toBe(false);
    expect(r.workspaceExplicit).toBe(true);
    expect(r.workspace).toBe('/mnt/repo');
  });

  it('an explicit workspace always wins over STORY_AGENT_WORKSPACE', () => {
    const r = resolveWorkspaceBinding(
      { workspace: '/explicit' },
      { NODE_ENV: 'production', STORY_AGENT_WORKSPACE: '/mnt/repo' },
    );
    expect(r.workspace).toBe('/explicit');
  });
});
