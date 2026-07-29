import { describe, it, expect } from 'vitest';
import { evaluatePublishPrecondition, parsePrNumber, type GhRunner } from './publish-precondition.js';

const WS = '/tmp/ws';

/** A gh stub that returns one canned payload. */
const ghWith = (payload: unknown, ok = true): GhRunner =>
  async () => ({ ok, stdout: JSON.stringify(payload), stderr: '' });

const green = {
  number: 15,
  state: 'OPEN',
  mergeable: 'MERGEABLE',
  statusCheckRollup: [
    { name: 'Smoke Tests (Chromium)', conclusion: 'SUCCESS' },
    { name: 'Full Tests (firefox)', conclusion: 'SUCCESS' },
  ],
};

const evaluate = (command: string, gh: GhRunner) => evaluatePublishPrecondition({ command, workspace: WS, gh });

describe('evaluatePublishPrecondition — ratifies a genuinely green PR merge', () => {
  it('ratifies when every check passed and the PR is mergeable', async () => {
    const r = await evaluate('gh pr merge 15 --squash', ghWith(green));
    expect(r.ratified).toBe(true);
    expect(r.reason).toMatch(/CI green/);
    expect(r.checks).toHaveLength(2);
  });

  it('treats SKIPPED and NEUTRAL as passing, not as failures', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({
      ...green,
      statusCheckRollup: [
        { name: 'build', conclusion: 'SUCCESS' },
        { name: 'optional-lint', conclusion: 'SKIPPED' },
        { name: 'advisory', conclusion: 'NEUTRAL' },
      ],
    }));
    expect(r.ratified).toBe(true);
  });
});

describe('evaluatePublishPrecondition — only pr-merge is machine-ratifiable', () => {
  const HUMAN_ONLY = [
    'gh workflow run deploy.yml -f apply=true --ref main',
    'terraform apply -auto-approve',
    'aws ecs update-service --cluster c --service s',
    'supabase db push',
    'npm publish',
    'gh release create v1.0.0',
    'git push origin main',
  ];

  for (const cmd of HUMAN_ONLY) {
    it(`refuses to ratify: ${cmd}`, async () => {
      const r = await evaluate(cmd, ghWith(green));
      expect(r.ratified).toBe(false);
      expect(r.reason).toMatch(/human ratification required/);
    });
  }

  it('is a no-op for commands that are not publish ops at all', async () => {
    const r = await evaluate('pnpm run build', ghWith(green));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/not a publish operation/);
  });
});

describe('evaluatePublishPrecondition — fails closed', () => {
  // The repo has already been bitten by this exact shape: ui-tests was invalid YAML, ran 0 jobs, and
  // therefore reported no checks. An empty check set must never read as "all checks passed".
  it('does NOT ratify when zero checks are reported', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({ ...green, statusCheckRollup: [] }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/empty check set is not green/);
  });

  it('does NOT ratify when statusCheckRollup is missing entirely', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({ number: 15, state: 'OPEN', mergeable: 'MERGEABLE' }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/empty check set is not green/);
  });

  it('does NOT ratify a null-named placeholder check row', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({ ...green, statusCheckRollup: [{ name: null, conclusion: null }] }));
    expect(r.ratified).toBe(false);
  });

  it('does NOT ratify while a check is still running', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({
      ...green,
      statusCheckRollup: [{ name: 'build', conclusion: 'SUCCESS' }, { name: 'e2e', conclusion: 'IN_PROGRESS' }],
    }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/still running/);
  });

  it('does NOT ratify a pending check reported with an empty conclusion', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({
      ...green,
      statusCheckRollup: [{ name: 'CodeRabbit', conclusion: '' }],
    }));
    expect(r.ratified).toBe(false);
  });

  it('does NOT ratify on a failing check, and names it', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({
      ...green,
      statusCheckRollup: [{ name: 'build', conclusion: 'SUCCESS' }, { name: 'e2e', conclusion: 'FAILURE' }],
    }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toContain('e2e=FAILURE');
  });

  it('does NOT ratify when the PR is not mergeable (conflicts)', async () => {
    const r = await evaluate('gh pr merge 15', ghWith({ ...green, mergeable: 'CONFLICTING' }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/not mergeable/);
  });

  it('does NOT ratify a PR that is already closed or merged', async () => {
    for (const state of ['MERGED', 'CLOSED']) {
      const r = await evaluate('gh pr merge 15', ghWith({ ...green, state }));
      expect(r.ratified).toBe(false);
      expect(r.reason).toContain(state);
    }
  });

  it('does NOT ratify when gh exits non-zero', async () => {
    const r = await evaluate('gh pr merge 15', async () => ({ ok: false, stdout: '', stderr: 'gh: not authenticated' }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/failing closed/);
  });

  it('does NOT ratify when gh output is unparseable', async () => {
    const r = await evaluate('gh pr merge 15', async () => ({ ok: true, stdout: 'not json', stderr: '' }));
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/could not parse/);
  });

  it('does NOT ratify when the runner throws (gh binary missing)', async () => {
    const r = await evaluate('gh pr merge 15', async () => { throw new Error('spawn gh ENOENT'); });
    expect(r.ratified).toBe(false);
    expect(r.reason).toMatch(/failing closed/);
  });
});

describe('parsePrNumber', () => {
  it('extracts an explicit PR number', () => {
    expect(parsePrNumber('gh pr merge 14 --squash')).toBe('14');
  });

  it('returns null when the command relies on the current branch', () => {
    expect(parsePrNumber('gh pr merge --squash')).toBeNull();
  });
});
