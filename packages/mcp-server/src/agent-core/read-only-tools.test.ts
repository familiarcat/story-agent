import { describe, it, expect } from 'vitest';
import { READ_ONLY_TOOLS } from './loop.js';
import { AGENT_TOOLS } from './tools.js';

/**
 * The chat lane runs under toolPolicy 'read-only', which filters the tool mesh through
 * READ_ONLY_TOOLS. That set had gone stale — glob_files, task_plan, web_search and web_fetch were all
 * missing, so chat silently lacked capabilities the loop had gained. These tests keep the two in step.
 */
describe('READ_ONLY_TOOLS — what the chat lane can reach', () => {
  it('includes every non-mutating tool the loop registers', () => {
    for (const name of ['read_file', 'list_dir', 'search_code', 'glob_files', 'git_status',
      'git_diff', 'rag_recall', 'crew_deliberate', 'task_plan', 'web_search', 'web_fetch']) {
      expect(READ_ONLY_TOOLS.has(name), `${name} should be reachable in read-only mode`).toBe(true);
    }
  });

  it('excludes every mutating tool', () => {
    for (const name of ['write_file', 'edit_file', 'apply_patch', 'delete_file', 'run_shell']) {
      expect(READ_ONLY_TOOLS.has(name), `${name} must NOT be reachable in read-only mode`).toBe(false);
    }
  });

  it('names only tools that actually exist in AGENT_TOOLS', () => {
    const registered = new Set(AGENT_TOOLS.map((t) => t.name));
    for (const name of READ_ONLY_TOOLS) {
      expect(registered.has(name), `${name} is listed read-only but is not a registered tool`).toBe(true);
    }
  });

  // The failure mode this guards: a new read-only tool is added to AGENT_TOOLS and nobody updates
  // READ_ONLY_TOOLS, so chat silently cannot use it — exactly what happened to glob_files.
  it('accounts for every registered tool as either read-only or mutating', () => {
    const MUTATING = new Set(['write_file', 'edit_file', 'apply_patch', 'delete_file', 'run_shell']);
    const unclassified = AGENT_TOOLS
      .map((t) => t.name)
      .filter((n) => !READ_ONLY_TOOLS.has(n) && !MUTATING.has(n));
    expect(unclassified, 'every tool must be classified read-only or mutating').toEqual([]);
  });
});
