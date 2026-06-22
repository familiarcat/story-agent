import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const listStoriesMock = vi.fn();
const getCommentsForStoryMock = vi.fn();

vi.mock('@/lib/db', () => ({
  listStories: () => listStoriesMock(),
  getCommentsForStory: (storyId: string) => getCommentsForStoryMock(storyId),
}));

const sampleStory = {
  id: '1',
  storyId: 'STORY-1',
  storyTitle: 'Sensitive integration',
  storyUrl: 'https://aha.io/features/STORY-1',
  repoFullName: 'client-int/story-agent',
  branch: 'STORY-1',
  baseBranch: 'main',
  status: 'implementing',
  prNumber: 7,
  prUrl: 'https://github.com/familiarcat/story-agent/pull/7',
  prStatus: 'open',
  phase: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: 'contains controlled notes',
  clientId: 'client-int',
};

describe('/api/stories route policy', () => {
  beforeEach(() => {
    listStoriesMock.mockReset();
    getCommentsForStoryMock.mockReset();
    listStoriesMock.mockResolvedValue([sampleStory]);
    getCommentsForStoryMock.mockResolvedValue([{ id: 'c1', state: 'SUBMITTED' }]);
  });

  it('redacts controlled fields when includeControlled is requested without client scope', async () => {
    const request = new NextRequest('http://localhost/api/stories?includeControlled=true&clientId=client-int');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.policy.controlledDataAccess).toBe('advisory_downgrade');
    expect(body.policy.reason).toBe('missing_client_selection');
    expect(body.stories).toHaveLength(1);
    expect(body.stories[0].storyUrl).toBe('');
    expect(body.stories[0].prUrl).toBeNull();
    expect(body.stories[0].notes).toBeNull();
    expect(body.stories[0].openCommentCount).toBe(1);
  });

  it('returns controlled fields when role and selected client are authorized', async () => {
    const request = new NextRequest('http://localhost/api/stories?includeControlled=true&clientId=client-int', {
      headers: {
        'x-client-id': 'client-int',
        'x-client-role': 'client_delivery',
        'x-controlled-data-purpose': 'ui_population',
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.policy.controlledDataAccess).toBe('authorized');
    expect(body.policy.reason).toBe('approved');
    expect(body.stories[0].storyUrl).toBe(sampleStory.storyUrl);
    expect(body.stories[0].prUrl).toBe(sampleStory.prUrl);
    expect(body.stories[0].notes).toBe(sampleStory.notes);
  });
});
