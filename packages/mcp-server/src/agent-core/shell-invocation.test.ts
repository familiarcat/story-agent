import { describe, it, expect, afterEach } from 'vitest';
import { shellInvocation } from './tools.js';

/**
 * Locks in the fix for the "(eval):1: can't change option: zle" noise: run_shell must source the
 * user's ~/.zshrc for their real PATH, but WITHOUT the interactive (-i) flag that triggers the zle
 * line-editor error on a non-TTY. Verified empirically that `-c 'source ~/.zshrc'` preserves PATH.
 */
describe('shellInvocation', () => {
  const orig = process.env.SHELL;
  afterEach(() => {
    if (orig === undefined) delete process.env.SHELL;
    else process.env.SHELL = orig;
  });

  it('zsh: sources ~/.zshrc non-interactively (no -i flag → no zle noise)', () => {
    process.env.SHELL = '/bin/zsh';
    const [bin, args] = shellInvocation('git status');
    expect(bin).toBe('/bin/zsh');
    expect(args[0]).toBe('-c');
    expect(args[1]).toContain('source ~/.zshrc 2>/dev/null;');
    expect(args[1]).toContain('git status');
    // The -i flag is precisely what caused `setopt zle` to fail on a non-TTY.
    expect(args).not.toContain('-ic');
    expect(args).not.toContain('-i');
  });

  it('bash: uses a login shell (-lc), which sources the bash profile', () => {
    process.env.SHELL = '/usr/bin/bash';
    expect(shellInvocation('ls')).toEqual(['/usr/bin/bash', ['-lc', 'ls']]);
  });

  it('unset/unknown SHELL: falls back to bash -lc (Linux/Fargate where SHELL is /bin/sh or unset)', () => {
    delete process.env.SHELL;
    expect(shellInvocation('ls')).toEqual(['bash', ['-lc', 'ls']]);
    process.env.SHELL = '/bin/sh';
    expect(shellInvocation('ls')).toEqual(['bash', ['-lc', 'ls']]);
  });
});
