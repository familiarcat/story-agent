import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

const originalEnv = process.env;
const cachePathSuffix = '.claude/control-lane-status.json';

vi.mock('node:fs', async () => {
  const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actualFs,
    existsSync: vi.fn((path: string) => typeof path === 'string' && path.endsWith(cachePathSuffix)),
    readFileSync: vi.fn((path: string) => {
      if (typeof path === 'string' && path.endsWith(cachePathSuffix)) {
        return JSON.stringify({
          updatedAt: '2026-07-06T00:00:00Z',
          currentLane: 'crew',
          delegationRatePct: 87,
          cumulativeSavingsUSD: 1.23,
          crewActualCostUSD: 0.45,
          crewDecisions: 9,
          anthropicDecisions: 2,
          crewActualRuns: 3,
          headline: 'Control lane: 🖖 CREW · CREW 9 delegated (~$1.2300 saved, 3 runs $0.4500) | ANTHROPIC 2 native · 82% delegated',
        });
      }
      return actualFs.readFileSync(path, 'utf8');
    }),
  };
});

vi.stubGlobal('fetch', vi.fn(async () => {
  return { ok: false, status: 503 } as unknown as Response;
}));

describe('/api/cost route fallback', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, STORY_AGENT_AGENT_URL: 'http://localhost:3103' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  it('returns cached control-lane status when the agent brain is unavailable', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('cache');
    expect(body.offlineMarker).toEqual(expect.objectContaining({
      currentLane: 'crew',
      crewActualCostUSD: 0.45,
      crewDecisions: 9,
    }));
    expect(body.note).toContain('cached lane status');
  });
});
