import { describe, it, expect, vi } from 'vitest';

vi.mock('@story-agent/shared/db', () => ({ storeObservationMemory: vi.fn(async () => ({})) }));
vi.mock('../agent-core/plan-then-execute.js', () => ({ planThenExecute: vi.fn() })); // avoid loading the loop graph

import { runShellGoverned } from './run-shell.js';

const WS = process.cwd();

describe('runShellGoverned (WorfGate-governed shell)', () => {
  it('runs a benign command and returns exit 0', async () => {
    const r = await runShellGoverned({ command: 'echo hello-worfgate', reason: 'test', workspace: WS });
    expect(r.blocked).toBe(false);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('hello-worfgate');
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('BLOCKS a red command (rm -rf /) — never executes', async () => {
    const r = await runShellGoverned({ command: 'rm -rf /', reason: 'malicious', workspace: WS });
    expect(r.blocked).toBe(true);
    expect(r.tier).toBe('red');
    expect(r.exitCode).toBe(-1);
  });

  it('BLOCKS a forced push (red)', async () => {
    const r = await runShellGoverned({ command: 'git push origin main --force', reason: 'x', workspace: WS });
    expect(r.blocked).toBe(true);
    expect(r.tier).toBe('red');
  });

  it('captures a non-zero exit code (records a failure memory, best-effort)', async () => {
    const r = await runShellGoverned({ command: 'exit 3', reason: 'expected failure', workspace: WS });
    expect(r.blocked).toBe(false);
    expect(r.exitCode).toBe(3);
  });
});
