import { describe, it, expect } from 'vitest';
import { normalizeServer, searchMcpRegistry, type McpRegistryServer } from './mcp-registry-client.js';
import {
  categoriesForCrew,
  buildRegistryQuery,
  inferCategory,
  deriveCapabilities,
  registryServerToProposal,
  buildToolCard,
  validateToolCard,
  toolCardStoryId,
  toolCardText,
  constrainToAllowedTools,
} from './mcp-discovery.js';
import type { ToolRecord } from './crew-tool-registry.js';

const sample: McpRegistryServer = {
  name: 'io.github.acme/sql-explorer',
  title: 'SQL Explorer',
  description: 'Query and explore Postgres databases over MCP',
  version: '1.0.1',
  remotes: [{ type: 'streamable-http', url: 'https://mcp.acme.dev/sql' }],
  isLatest: true,
};

describe('normalizeServer', () => {
  it('flattens the registry _meta block and keeps url-bearing remotes', () => {
    const s = normalizeServer({
      name: 'x/y',
      description: 'd',
      title: 't',
      version: '2.0.0',
      remotes: [{ type: 'streamable-http', url: 'https://h/mcp' }, { type: 'sse' }],
      _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', isLatest: true } },
    });
    expect(s.name).toBe('x/y');
    expect(s.status).toBe('active');
    expect(s.isLatest).toBe(true);
    expect(s.remotes).toEqual([{ type: 'streamable-http', url: 'https://h/mcp' }]); // remote w/o url dropped
  });

  it('reads the WRAPPED registry v0 shape { server: {...}, _meta } (real API format)', () => {
    // The live registry nests fields under `.server`; reading raw.name returned '' for every server
    // (the bug that made discovery yield 0 candidates).
    const s = normalizeServer({
      server: {
        name: 'com.figma.mcp/mcp',
        description: 'The Figma MCP server brings Figma context into your AI workflow.',
        remotes: [{ type: 'streamable-http', url: 'https://mcp.figma.com/mcp' }],
      },
      _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', isLatest: false } },
    });
    expect(s.name).toBe('com.figma.mcp/mcp');
    expect(s.description).toContain('Figma');
    expect(s.status).toBe('active');
    expect(s.remotes?.[0].url).toBe('https://mcp.figma.com/mcp');
  });
});

describe('searchMcpRegistry (mocked fetch)', () => {
  it('builds the v0/servers query and parses servers + cursor', async () => {
    let calledUrl = '';
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({ servers: [{ name: 'a/b', description: 'd' }], metadata: { nextCursor: 'c1', count: 1 } }),
      };
    }) as unknown as typeof fetch;

    const res = await searchMcpRegistry({ search: 'database query', limit: 5, fetchImpl });
    expect(calledUrl).toContain('/v0/servers');
    expect(calledUrl).toContain('search=database+query');
    expect(calledUrl).toContain('limit=5');
    expect(res.servers).toHaveLength(1);
    expect(res.nextCursor).toBe('c1');
  });

  it('throws on non-ok responses', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(searchMcpRegistry({ fetchImpl })).rejects.toThrow(/503/);
  });
});

describe('categoriesForCrew (reverse of TOOL_EVALUATORS)', () => {
  it('maps security to worf', () => {
    expect(categoriesForCrew('worf')).toContain('security');
  });
  it('gives geordi infra + ci-cd + code-search', () => {
    const cats = categoriesForCrew('geordi');
    expect(cats).toEqual(expect.arrayContaining(['code-search', 'ci-cd', 'infrastructure']));
  });
});

describe('buildRegistryQuery', () => {
  it('combines task keywords with role categories', () => {
    const q = buildRegistryQuery('worf', 'scan dependencies for vulnerabilities');
    expect(q).toContain('security');
    expect(q.split(' ').length).toBeLessThanOrEqual(6);
  });
});

describe('inferCategory', () => {
  it('picks a keyword-matching allowed category', () => {
    expect(inferCategory(sample, ['database', 'analytics'])).toBe('database');
  });
  it('falls back to the first allowed when nothing matches', () => {
    expect(inferCategory({ name: 'x', description: 'mystery' }, ['testing', 'security'])).toBe('testing');
  });
});

describe('registryServerToProposal', () => {
  it('records the endpoint but human-gates execution', () => {
    const p = registryServerToProposal(sample, 'database');
    expect(p.endpoint).toBe('https://mcp.acme.dev/sql');
    expect(p.category).toBe('database');
    expect(p.costProfile).toBe('paid'); // has a remote
    expect((p.metadata as any).autoExecute).toBe(false);
    expect((p.metadata as any).requiresHumanGate).toBe(true);
    expect((p.metadata as any).source).toBe('mcp-registry');
  });
  it('treats package-only (no remote) servers as self-hosted/stdio', () => {
    const p = registryServerToProposal(
      { name: 'pkg/x', description: 'local tool', packages: [{ registryType: 'npm', identifier: 'mcp-x' }] },
      'ai-tooling',
    );
    expect(p.costProfile).toBe('self-hosted');
    expect(p.sourceReference).toBe('npm:mcp-x');
    expect((p.metadata as any).transports).toEqual(['stdio']);
  });
});

describe('constrainToAllowedTools (anti-drift guardrail)', () => {
  const allowed = ['Playwright MCP', 'Storybook MCP Server', 'MCP-Miro', 'Cursor Talk to Figma'];
  it('keeps list-faithful picks (case/space-insensitive) and drops off-list drift', () => {
    const picks = [{ name: 'playwright-mcp' }, { name: 'Storybook MCP' }, { name: 'PostgreSQL' }, { name: 'Trivy' }];
    const { kept, dropped } = constrainToAllowedTools(picks, allowed);
    expect(kept.map((k) => k.name)).toEqual(['playwright-mcp', 'Storybook MCP']);
    expect(dropped).toEqual(['PostgreSQL', 'Trivy']);
  });
  it('matches Miro to MCP-Miro', () => {
    const { kept } = constrainToAllowedTools([{ name: 'miro' }], allowed);
    expect(kept).toHaveLength(1);
  });
});

describe('deriveCapabilities', () => {
  it('extracts loose keywords, deduped and capped', () => {
    const caps = deriveCapabilities(sample);
    expect(caps).toContain('query');
    expect(caps.length).toBeLessThanOrEqual(8);
  });
});

const approvedTool: ToolRecord = {
  name: 'io.github.acme/sql-explorer',
  description: 'Query Postgres over MCP',
  category: 'database',
  capabilities: ['query', 'schema'],
  endpoint: 'https://mcp.acme.dev/sql',
  sourceReference: 'npm:sql-explorer',
  qualityScore: 0.8,
  costProfile: 'free',
  securityClearance: 'approved',
  status: 'approved',
  worfVeto: false,
  crewVotes: {},
  crewEvaluationNotes: {},
  metadata: {},
};

describe('tool-card teaching (crew-wide shared understanding)', () => {
  it('buildToolCard derives risk/cost tiers and always human-gates execution', () => {
    const card = buildToolCard(approvedTool, 'data', '2026-06-27T00:00:00Z');
    expect(card.owningRole).toBe('data');
    expect(card.autoExecute).toBe(false);
    expect(card.riskTier).toBe('low'); // approved clearance
    expect(card.costTier).toBe('low'); // free
    expect(card.invocation).toContain('Human-gated');
    expect(card.endpoint).toBe('https://mcp.acme.dev/sql');
  });
  it('maps review clearance + paid cost to higher tiers', () => {
    const card = buildToolCard({ ...approvedTool, securityClearance: 'review', costProfile: 'paid' }, 'worf', 'now');
    expect(card.riskTier).toBe('medium');
    expect(card.costTier).toBe('high');
  });
  it('validateToolCard rejects auto-execute or missing fields', () => {
    expect(validateToolCard(buildToolCard(approvedTool, 'data', 'now')).ok).toBe(true);
    expect(validateToolCard({ name: 'x', category: 'database', capabilities: ['q'], owningRole: 'data', autoExecute: true as any }).ok).toBe(false);
    expect(validateToolCard({ name: 'x' }).ok).toBe(false);
  });
  it('toolCardStoryId is deterministic (dedup on re-teach)', () => {
    expect(toolCardStoryId('acme/x')).toBe('tool-card:acme/x');
  });
  it('toolCardText embeds the key recall fields', () => {
    const text = toolCardText(buildToolCard(approvedTool, 'data', 'now'));
    expect(text).toContain('TOOL-CARD');
    expect(text).toContain('owner=data');
    expect(text).toContain('Capabilities:');
  });
});
