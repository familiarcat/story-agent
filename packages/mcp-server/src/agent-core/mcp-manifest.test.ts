import { describe, it, expect } from 'vitest';
import { buildMcpManifest } from './mcp-manifest.js';

describe('buildMcpManifest', () => {
  it('endpoints.mcp ends with /mcp', () => {
    expect(buildMcpManifest('https://example.com').endpoints.mcp).toMatch(/\/mcp$/);
  });

  it('entryPoint is plan_then_execute', () => {
    expect(buildMcpManifest('https://example.com').entryPoint).toBe('plan_then_execute');
  });

  it('crew is 11', () => {
    expect(buildMcpManifest('https://example.com').crew).toBe(11);
  });

  it('trailing slash in baseUrl does not produce a double slash', () => {
    expect(buildMcpManifest('https://example.com/').endpoints.mcp).toBe('https://example.com/mcp');
  });

  it('empty baseUrl yields relative /mcp', () => {
    expect(buildMcpManifest('').endpoints.mcp).toBe('/mcp');
  });

  it('includes tool-name compatibility guidance for legacy clients', () => {
    const manifest = buildMcpManifest('https://example.com');
    expect(manifest.toolNameCompatibility.legacyDelimiter).toBe(':');
    expect(manifest.toolNameCompatibility.normalizedPattern).toBe('^[A-Za-z0-9_.-]+$');
    expect(manifest.toolNameCompatibility.examples.length).toBeGreaterThan(0);
    expect(manifest.toolNameCompatibility.examples[0]?.legacy).toMatch(/:/);
  });
});
