import { describe, it, expect } from 'vitest';
import { gateLocalOp } from './worfgate-local.js';

const WS = '/tmp/ws';
const shell = (command: string) => gateLocalOp('run_shell', { command }, WS);

describe('worfgate-local — publish/deploy tier', () => {
  // These are irreversible from the outside world's perspective and are NOT covered by the loop's
  // file-snapshot rollback, so they must never proceed autonomously.
  const PUBLISH_OPS = [
    'gh pr merge 14 --squash',
    'gh workflow run deploy.yml -f apply=true --ref main',
    'gh release create v1.2.3',
    'git push origin main',
    'terraform apply -auto-approve',
    'aws ecs update-service --cluster c --service s --force-new-deployment',
    'supabase db push',
    'npm publish --access public',
  ];

  for (const cmd of PUBLISH_OPS) {
    it(`refuses to autonomously run: ${cmd}`, () => {
      const r = shell(cmd);
      expect(r.tier).toBe('red');
      expect(r.proceed).toBe(false);
      expect(r.reasons.join(' ')).toMatch(/publish\/deploy operation/);
    });
  }

  it('names the specific operation in the escalation reason', () => {
    expect(shell('gh pr merge 14 --squash').reasons.join(' ')).toContain('merge a pull request');
    expect(shell('terraform apply').reasons.join(' ')).toContain('apply infrastructure changes');
  });
});

describe('worfgate-local — ordinary crew work stays unblocked (regression)', () => {
  // The gate ENABLES speed. Narrowing publish ops must not collaterally block everyday commands.
  const ALLOWED = [
    'git push -u origin feat/my-branch',
    'git push origin HEAD',
    'gh pr create --title x --body y',
    'gh pr view 14 --json state',
    'gh pr checks 14',
    'pnpm --filter @story-agent/mcp-server run build',
    'pnpm run test:unit',
    'tsc --noEmit',
    'git commit -m "wip"',
    'gh workflow run audit-check.yml',
  ];

  for (const cmd of ALLOWED) {
    it(`still proceeds: ${cmd}`, () => {
      const r = shell(cmd);
      expect(r.tier).toBe('yellow');
      expect(r.proceed).toBe(true);
    });
  }

  it('a feature branch merely NAMED like main is not treated as a protected push', () => {
    const r = shell('git push origin feat/domain-model');
    expect(r.proceed).toBe(true);
  });
});

describe('worfgate-local — pre-existing tiers are unchanged', () => {
  it('reads are green', () => {
    expect(gateLocalOp('read_file', { path: 'a.ts' }, WS).tier).toBe('green');
  });

  it('file mutation is yellow', () => {
    expect(gateLocalOp('write_file', { path: 'a.ts' }, WS).tier).toBe('yellow');
  });

  it('destructive shell is still red', () => {
    expect(shell('rm -rf /').tier).toBe('red');
  });

  // Documents ACTUAL behaviour, which differs from what the source comment implies: RED_SHELL
  // matches `git push .*--force` and returns red BEFORE the "downgrade to --force-with-lease"
  // branch can run, so force-push is blocked outright and that remediation is unreachable.
  // Blocking is the safer of the two, so this test pins it rather than relaxing the gate.
  it('force-push is blocked outright (the --force-with-lease downgrade is unreachable)', () => {
    const r = shell('git push origin feat/x --force');
    expect(r.tier).toBe('red');
    expect(r.proceed).toBe(false);
  });

  it('even --force-with-lease is currently blocked (the \\b lands on the hyphen)', () => {
    expect(shell('git push origin feat/x --force-with-lease').proceed).toBe(false);
  });

  it('secret-bearing commands are refused', () => {
    expect(shell('cat ~/.alexai-secrets').proceed).toBe(false);
  });

  it('unclassified tools deny by default', () => {
    expect(gateLocalOp('some_unvetted_tool', {}, WS).tier).toBe('red');
  });
});
