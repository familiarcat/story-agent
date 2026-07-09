import { describe, expect, it } from 'vitest';
import { installMcpToolNamePolicy, normalizeMcpToolName } from './mcp-tool-name-policy.js';

function createMockServer() {
  const registered: string[] = [];
  const mock = {
    tool(name: string, ..._rest: any[]) {
      registered.push(name);
      return name;
    },
  };
  return { mock, registered };
}

describe('normalizeMcpToolName', () => {
  it('normalizes colon-delimited names to MCP-safe dash names', () => {
    expect(normalizeMcpToolName('crew:get-personal-profile')).toBe('crew-get-personal-profile');
  });

  it('trims, collapses separators, and strips invalid edge characters', () => {
    expect(normalizeMcpToolName('  ::picard::assess-readiness::  ')).toBe('picard-assess-readiness');
  });
});

describe('installMcpToolNamePolicy', () => {
  it('normalizes tool names during registration', () => {
    const { mock, registered } = createMockServer();
    installMcpToolNamePolicy(mock as any);

    mock.tool('crew:get-personal-profile', 'desc', {}, () => ({}));

    expect(registered).toEqual(['crew-get-personal-profile']);
  });

  it('does not double-wrap when installed multiple times', () => {
    const { mock, registered } = createMockServer();
    installMcpToolNamePolicy(mock as any);
    installMcpToolNamePolicy(mock as any);

    mock.tool('aha:list-features', 'desc', {}, () => ({}));

    expect(registered).toEqual(['aha-list-features']);
  });

  it('throws on post-normalization collisions', () => {
    const { mock } = createMockServer();
    installMcpToolNamePolicy(mock as any);

    mock.tool('crew:get-memories', 'desc', {}, () => ({}));

    expect(() => {
      mock.tool('crew-get-memories', 'desc', {}, () => ({}));
    }).toThrow(/collision/i);
  });
});
