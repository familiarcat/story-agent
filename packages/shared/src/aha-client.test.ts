import { describe, it, expect } from 'vitest';
import { createAhaClient } from './aha-client.js';

/** Build a fetch stub that returns the first route whose key is a substring of the URL. */
function mockFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (url: string | URL | Request) => {
    const u = String(url);
    const key = Object.keys(routes).find((k) => u.includes(k));
    if (!key) throw new Error(`no mock route for ${u}`);
    return { ok: true, json: async () => routes[key], text: async () => '' } as Response;
  }) as typeof fetch;
}

describe('createAhaClient (canonical Aha domain client)', () => {
  it('getStory normalizes a URL reference and maps description + requirements', async () => {
    const client = createAhaClient({
      domain: 'x.aha.io', token: 't',
      fetchImpl: mockFetch({
        'features/STORY-1': {
          feature: {
            id: '1', reference_num: 'STORY-1', name: 'N',
            description: { body: 'D' },
            requirements: [{ name: 'R', description: { body: 'rb' } }],
            url: 'u', workflow_status: { name: 'In Progress' },
          },
        },
      }),
    });
    const s = await client.getStory('https://x.aha.io/features/STORY-1');
    expect(s.referenceNum).toBe('STORY-1');
    expect(s.description).toBe('D');
    expect(s.acceptanceCriteria).toContain('R: rb');
    expect(s.workflowStatus).toBe('In Progress');
  });

  it('listProjects maps reference_prefix → referencePrefix', async () => {
    const client = createAhaClient({
      domain: 'x.aha.io', token: 't',
      fetchImpl: mockFetch({ 'products?': { products: [{ id: 'p1', name: 'P', reference_prefix: 'PRJ', url: 'u' }] } }),
    });
    const ps = await client.listProjects();
    expect(ps).toHaveLength(1);
    expect(ps[0].referencePrefix).toBe('PRJ');
  });

  it('listSprints maps release progress points', async () => {
    const client = createAhaClient({
      domain: 'x.aha.io', token: 't',
      fetchImpl: mockFetch({
        'releases': { releases: [{ id: 'r1', name: 'Sprint 1', url: 'u', num_features: 3, progress_source_data: { total_points: 10, done_points: 4, remaining_points: 6 } }] },
      }),
    });
    const sprints = await client.listSprints('p1');
    expect(sprints[0].totalStoryPoints).toBe(10);
    expect(sprints[0].doneStoryPoints).toBe(4);
    expect(sprints[0].featureCount).toBe(3);
  });
});
