import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const getStoryMock = vi.fn();

vi.mock('@/lib/db', () => ({
  getStory: (storyId: string) => getStoryMock(storyId),
}));

const sampleStory = {
  id: 'story-row-1',
  storyId: 'STORY-11',
  storyTitle: 'Hydrate regulated story fields',
  storyUrl: 'https://aha.io/features/STORY-11',
  repoFullName: 'client-int/story-agent',
  branch: 'STORY-11',
  baseBranch: 'main',
  status: 'implementing',
  prNumber: 11,
  prUrl: 'https://github.com/familiarcat/story-agent/pull/11',
  prStatus: 'open',
  phase: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: 'line one\n- line two',
  clientId: 'client-int',
};

describe('/api/stories/[storyId] route policy', () => {
  beforeEach(() => {
    getStoryMock.mockReset();
    getStoryMock.mockResolvedValue(sampleStory);
  });

  it('returns advisory mode and strips controlled payload when unauthorized', async () => {
    const request = new NextRequest('http://localhost/api/stories/STORY-11?includeControlled=true');
    const response = await GET(request, { params: Promise.resolve({ storyId: 'STORY-11' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.policy.controlledDataAccess).toBe('advisory_downgrade');
    expect(body.controlled).toBeNull();
    expect(body.story.repository).toContain('[restricted');
  });

  it('returns controlled payload when authorized client scope is present', async () => {
    const request = new NextRequest('http://localhost/api/stories/STORY-11?includeControlled=true', {
      headers: {
        'x-client-id': 'client-int',
        'x-client-role': 'client_delivery',
        'x-controlled-data-purpose': 'ui_story_detail',
      },
    });

    const response = await GET(request, { params: Promise.resolve({ storyId: 'STORY-11' }) });
    const body = await response.json();

    expect(body.policy.controlledDataAccess).toBe('authorized');
    expect(body.controlled.storyUrl).toBe(sampleStory.storyUrl);
    expect(body.controlled.prUrl).toBe(sampleStory.prUrl);
    expect(body.story.repository).toBe(sampleStory.repoFullName);
  });

  it('returns 404 when story does not exist', async () => {
    getStoryMock.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/stories/MISSING');
    const response = await GET(request, { params: Promise.resolve({ storyId: 'MISSING' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Story not found');
  });
});
