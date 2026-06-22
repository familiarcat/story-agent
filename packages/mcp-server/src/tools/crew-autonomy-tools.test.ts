import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCrewAutonomyTools } from '../../src/tools/crew-autonomy-tools.js';
import { getDbClient, getRelevantObservationMemories, storeObservationMemory, getSupabaseConnectivityDiagnostics } from '@story-agent/shared/db';

// NOTE: the vitest config sets mockReset:true + restoreMocks:true, which wipes mock
// implementations before each test. So the factory only declares the shape; the actual
// implementations are (re)established in beforeEach. getSupabaseConnectivityDiagnostics
// must be included — the SUT imports it, and a factory omitting it would make it undefined.
vi.mock('@story-agent/shared/db', () => ({
  getDbClient: vi.fn(),
  getRelevantObservationMemories: vi.fn(),
  storeObservationMemory: vi.fn(),
  getSupabaseConnectivityDiagnostics: vi.fn(),
}));

describe('Crew Autonomy Tools', () => {
  let server: any;
  let toolHandlers: Record<string, Function> = {};

  beforeEach(() => {
    // Re-establish mock implementations (mockReset:true wipes them before each test).
    // The query builder (qb) is chainable (every method returns qb) AND thenable, so both
    // patterns work: terminating methods (.single()/.limit()/.order()) can be overridden to
    // resolve, and direct `await query` (e.g. after chained .eq().eq()) resolves qb.__result.
    const qb: any = {
      select: vi.fn(() => qb),
      eq: vi.fn(() => qb),
      order: vi.fn(() => qb),
      contains: vi.fn(() => qb),
      limit: vi.fn(() => qb),
      is: vi.fn(() => qb),
      or: vi.fn(() => qb),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      __result: { data: [], error: null },
    };
    qb.then = (onF: any, onR?: any) => Promise.resolve(qb.__result).then(onF, onR);
    const mockDb: any = { from: vi.fn(() => qb) };
    vi.mocked(getDbClient).mockResolvedValue(mockDb);
    vi.mocked(getRelevantObservationMemories).mockResolvedValue([] as any);
    vi.mocked(storeObservationMemory).mockResolvedValue({ id: 'mem-999' } as any);
    vi.mocked(getSupabaseConnectivityDiagnostics).mockResolvedValue({ reachable: true } as any);

    toolHandlers = {};
    server = {
      tool: vi.fn().mockImplementation((name, desc, schema, handler) => {
        toolHandlers[name] = handler;
      }),
    };
    registerCrewAutonomyTools(server);
  });

  it('registers all tools including domain-specific ones', () => {
    const expectedTools = [
      'crew:get-personal-profile',
      'crew:get-console-status',
      'crew:assume-station',
      'crew:get-station-briefing',
      'crew:get-campaign-summary',
      'crew:request-station-support',
      'crew:request-tool-access',
      'crew:list-clients',
      'crew:list-active-projects',
      'crew:list-epics',
      'crew:list-active-sprints',
      'crew:query-stories',
      'crew:get-relevant-memories',
      'crew:store-learning',
      'picard:assess-readiness',
      'data:review-architecture',
      'data:analyze-type-safety',
      'riker:plan-execution',
      'geordi:scaffold-vscode-tool',
      'obrien:integrate-mcp-transport',
      'geordi:assess-infrastructure',
      'obrien:plan-deployment',
      'obrien:audit-workspace',
      'geordi:verify-build-references',
      'obrien:sync-dependencies',
      'worf:security-audit',
      'worf:veto-scaffolding',
      'yar:assess-test-coverage',
      'yar:audit-scaffolding',
      'troi:assess-stakeholder-impact',
      'troi:analyze-ux-alignment',
      'crusher:diagnose-system-health',
      'uhura:draft-communication',
      'quark:analyze-costs'
    ];
    expectedTools.forEach(tool => {
      expect(toolHandlers[tool]).toBeDefined();
    });
  });

  it('crew:get-personal-profile fetches from sa_crew_personas', async () => {
    const mockProfile = { crew_id: 'picard', role: 'Captain' };
    const mockDb = await getDbClient();
    (mockDb.from as any)().select().eq().single.mockResolvedValue({ data: mockProfile, error: null });

    const result = await toolHandlers['crew:get-personal-profile']({ crewId: 'picard' });
    expect(result.content[0].text).toContain('picard');
    expect(mockDb.from).toHaveBeenCalledWith('sa_crew_personas');
  });

  it('crew:list-clients fetches from clients table', async () => {
    const mockClients = [{ id: 'client-1', name: 'Client' }];
    const mockDb = await getDbClient();
    (mockDb.from as any)().select().order.mockResolvedValue({ data: mockClients, error: null });

    const result = await toolHandlers['crew:list-clients']({});
    expect(result.content[0].text).toContain('Client');
    expect(mockDb.from).toHaveBeenCalledWith('clients');
  });

  it('crew:list-active-projects handles clientId filter', async () => {
    const mockProjects = [{ id: '1', name: 'PCTMS' }];
    const mockDb = await getDbClient();
    // listActiveProjects chains .eq().eq() then `await query` — set the builder's result.
    (mockDb.from as any)().__result = { data: mockProjects, error: null };

    const result = await toolHandlers['crew:list-active-projects']({ includeArchived: false, clientId: 'client' });
    expect(result.content[0].text).toContain('PCTMS');
    expect(mockDb.from).toHaveBeenCalledWith('projects');
  });

  it('crew:query-stories applies domain and status filters', async () => {
    const mockStories = [{ referenceNum: 'PCTMS-001' }];
    const mockDb = await getDbClient();
    (mockDb.from as any)().select().eq().contains().limit.mockResolvedValue({ data: mockStories, error: null });

    const result = await toolHandlers['crew:query-stories']({ status: 'pending', domain: 'security' });
    expect(result.content[0].text).toContain('PCTMS-001');
  });

  it('crew:get-relevant-memories searches observation memories', async () => {
    const mockMemories = [{ transcript: { decision: 'Use RLS' } }];
    (getRelevantObservationMemories as any).mockResolvedValue(mockMemories);

    const result = await toolHandlers['crew:get-relevant-memories']({ domain: 'security' });
    expect(result.content[0].text).toContain('Use RLS');
    expect(getRelevantObservationMemories).toHaveBeenCalledWith(expect.objectContaining({ queryText: 'security' }));
  });

  it('crew:store-learning persists mission insights', async () => {
    (storeObservationMemory as any).mockResolvedValue({ id: 'mem-999' });

    const result = await toolHandlers['crew:store-learning']({
      crewId: 'worf',
      domain: 'security',
      content: 'RLS policies verified for PHI',
      projectId: 'pctms-core'
    });
    expect(result.content[0].text).toContain('mem-999');
    expect(storeObservationMemory).toHaveBeenCalled();
  });

  it('assess-readiness returns calculated readiness status', async () => {
    const result = await toolHandlers['picard:assess-readiness']({ projectId: 'p1', readinessArea: 'technical' });
    const parsed = JSON.parse(result.content[0].text);
    expect(['at_risk', 'high', 'medium']).toContain(parsed.readiness);
  });

  it('data:analyze-type-safety identifies "any" usage in critical interfaces', async () => {
    const codeSnippet = `interface AuthContext { user: any; token: string; }`;
    const criticalInterfaces = ['AuthContext'];
    const result = await toolHandlers['data:analyze-type-safety']({ code: codeSnippet, criticalInterfaces });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('REVIEW_REQUIRED');
    expect(parsed.findings).toContain("Critical interface 'AuthContext' contains 'any' type usage.");
    expect(parsed.recommendations).toContain("Refactor 'AuthContext' to use specific types instead of 'any'.");
  });
});