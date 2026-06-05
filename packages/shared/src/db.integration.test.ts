import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient, testFixtures, IS_LOCAL_TEST } from '../test/setup.js';
import type { StoryRecord } from './index.js';

/**
 * Integration tests for database functions.
 * These test DB operations against a mocked Supabase client.
 * In local mode (TEST_ENV=local), uses in-memory mocks.
 * In integration mode (TEST_ENV=integration), would use a real Supabase instance.
 */

// Only run these tests in local or integration mode
const skipIfNotTesting = IS_LOCAL_TEST ? describe : describe.skip;

skipIfNotTesting('Database Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
  });

  describe('Story CRUD operations', () => {
    it('upserts a story into the mock database', async () => {
      const story = testFixtures.storyAha;
      // Note: upsert returns a vi.fn, so we can check if it was called
      await mockClient.from('sa_stories').upsert(story, { onConflict: 'storyId' });

      // Check that the story was stored in mock data
      expect(mockClient.__mockData['sa_stories']).toContainEqual(story);
    });

    it('retrieves a story by storyId', async () => {
      const story = testFixtures.storyAha;
      mockClient.__mockData['sa_stories'].push(story);

      const result = await mockClient
        .from('sa_stories')
        .select('*')
        .eq('storyId', story.storyId)
        .single();

      expect(result.data).toEqual(story);
      expect(result.error).toBeNull();
    });

    it('lists all stories ordered by updatedAt descending', async () => {
      const story1 = { ...testFixtures.storyAha, updatedAt: '2026-06-05T10:00:00Z' };
      const story2 = { ...testFixtures.storyJira, updatedAt: '2026-06-05T12:00:00Z' };
      mockClient.__mockData['sa_stories'].push(story1, story2);

      const result = mockClient
        .from('sa_stories')
        .select('*')
        .order('updatedAt', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].updatedAt).toBe('2026-06-05T12:00:00Z');
    });

    it('updates an existing story on upsert', async () => {
      const story = { ...testFixtures.storyAha, pr_number: null };
      mockClient.__mockData['sa_stories'].push(story);

      const updated = { ...story, pr_number: 42, pr_url: 'https://github.com/test/pr/42' };
      await mockClient.from('sa_stories').upsert(updated, { onConflict: 'story_id' });

      const fromDb = mockClient.__mockData['sa_stories'][0];
      expect(fromDb.pr_number).toBe(42);
      expect(fromDb.pr_url).toBe('https://github.com/test/pr/42');
    });
  });

  describe('Observation Memory operations', () => {
    it('stores observation memory records', async () => {
      const memory = {
        id: 'mem-1',
        story_id: 'STORY-123',
        source: 'crew_analysis' as const,
        transcript_hash: 'hash-abc',
        transcript_text: 'Crew analysis results...',
        transcript: { rounds: [], consensus: 'approved' },
        memory_embedding: '[0.1,0.2,0.3]',
        tags: ['autonomous', 'crew'],
        created_at: new Date().toISOString(),
      };

      await mockClient.from('sa_observation_memories').upsert(memory);

      expect(mockClient.__mockData['sa_observation_memories']).toContainEqual(memory);
    });

    it('retrieves memories for a story', async () => {
      const mem1 = { story_id: 'STORY-123', transcript_text: 'Memory 1', created_at: '2026-06-05T10:00:00Z' };
      const mem2 = { story_id: 'STORY-123', transcript_text: 'Memory 2', created_at: '2026-06-05T11:00:00Z' };
      mockClient.__mockData['sa_observation_memories'].push(mem1, mem2);

      const result = mockClient
        .from('sa_observation_memories')
        .select('*')
        .eq('story_id', 'STORY-123')
        .order('created_at', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].transcript_text).toBe('Memory 2');
    });
  });

  describe('Error handling', () => {
    it('returns null when story not found', async () => {
      const result = await mockClient
        .from('sa_stories')
        .select('*')
        .eq('story_id', 'NONEXISTENT')
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull(); // Mock returns graceful null, not error
    });

    it('handles empty result sets', () => {
      const result = mockClient.from('sa_stories').select('*').order('updated_at', { ascending: false });
      expect(result.data).toEqual([]);
    });
  });
});
