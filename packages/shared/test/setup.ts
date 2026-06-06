/**
 * Test utilities for story-agent integration tests.
 * Provides mock clients and test fixtures.
 */

import { vi } from 'vitest';

/**
 * Configure test environment mode.
 * Affects whether mocks or real implementations are used.
 */
export const TEST_ENV = process.env.TEST_ENV || 'local';
export const IS_LOCAL_TEST = TEST_ENV === 'local';
export const IS_INTEGRATION_TEST = TEST_ENV === 'integration';

/**
 * Mock Supabase client for testing.
 * Returns an object shaped like SupabaseClient with chainable query builders.
 * Note: Returns synchronous results for testing, not Promises.
 */
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    sa_stories: [],
    sa_observation_memories: [],
    sa_docs_knowledge_vectors: [],
  };

  // Helper: create a chainable filter result with order/limit
  const createChainableResult = (table: string, filterFn?: (row: any) => boolean) => {
    const filtered = filterFn ? mockData[table].filter(filterFn) : [...(mockData[table] || [])];
    
    return {
      single: async () => ({
        data: filtered.length > 0 ? filtered[0] : null,
        error: null,
      }),
      order: (column: string, opts?: any) => {
        const sorted = filtered.sort((a: any, b: any) => {
          const cmp = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
          return opts?.ascending === false ? -cmp : cmp;
        });
        return { data: sorted, error: null };
      },
      limit: (n: number) => ({
        data: filtered.slice(0, n),
        error: null,
      }),
    };
  };

  const createQueryBuilder = (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: unknown) => createChainableResult(table, (row: any) => row[column] === value),
      order: (column: string, opts?: any) => {
        const sorted = (mockData[table] || []).sort((a: any, b: any) => {
          const cmp = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
          return opts?.ascending === false ? -cmp : cmp;
        });
        return { data: sorted, error: null };
      },
    }),
    upsert: vi.fn(async (data: any, opts?: any) => {
      if (!mockData[table]) mockData[table] = [];
      const existingIdx = mockData[table].findIndex((row: any) =>
        opts?.onConflict ? row[opts.onConflict] === data[opts.onConflict] : row.id === data.id
      );
      if (existingIdx >= 0) {
        mockData[table][existingIdx] = { ...mockData[table][existingIdx], ...data };
      } else {
        mockData[table].push(data);
      }
      return { data: null, error: null };
    }),
  });

  return {
    from: (table: string) => createQueryBuilder(table),
    __mockData: mockData,
  };
}

/**
 * Mock OpenRouter/OpenAI client for testing.
 * Returns deterministic responses for crew member prompts.
 */
export function createMockOpenRouterClient() {
  return {
    chat: {
      completions: {
        create: vi.fn(async (options: any) => {
          const { messages } = options;
          const userMessage = messages.find((m: any) => m.role === 'user')?.content || '';

          // Deterministic responses based on crew member or user prompt content
          let responseText = 'FINDINGS:\n- Analysis complete\n\nRECOMMENDATIONS:\n- Proceed\n\nCONFIDENCE: 0.8';

          if (userMessage.includes('picard') || userMessage.includes('captain')) {
            responseText = 'FINDINGS:\n- Strategic mission alignment achieved\n- Executive authority affirmed\n\nRECOMMENDATIONS:\n- Authorize mission execution\n\nCONFIDENCE: 0.95';
          } else if (userMessage.includes('worf') || userMessage.includes('security')) {
            responseText = 'FINDINGS:\n- Security perimeter validated\n- No blocking concerns detected\n\nRECOMMENDATIONS:\n- Proceed with caution\n\nCONFIDENCE: 0.85';
          } else if (userMessage.includes('data') || userMessage.includes('architecture')) {
            responseText = 'FINDINGS:\n- Architecture DDD compliance verified\n- Entity boundaries clean\n\nRECOMMENDATIONS:\n- Design approved for implementation\n\nCONFIDENCE: 0.9';
          }

          return Promise.resolve({
            choices: [{ message: { content: responseText, role: 'assistant' } }],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          });
        }),
      },
    },
  };
}

/**
 * Mock fetch implementation for testing HTTP providers.
 * Routes requests to mock responses based on URL patterns.
 */
export function createMockFetch(): (url: string | URL | Request, options?: any) => Promise<Response> {
  return vi.fn(async (url: string | URL | Request, options?: any) => {
    const urlString = url instanceof URL ? url.toString() : String(url);
    // Aha API
    if (urlString.includes('.aha.io/api/v1/')) {
      if (urlString.includes('/stories')) {
        return new Response(
          JSON.stringify({
            stories: [
              {
                id: 'story-1',
                reference_num: 'STORY-123',
                name: 'Test Story',
                description: 'A test story',
              },
            ],
          }),
          { status: 200 }
        );
      }
    }

    // Jira API
    if (urlString.includes('.atlassian.net/rest/api')) {
      if (urlString.includes('/search')) {
        return new Response(
          JSON.stringify({
            issues: [
              {
                key: 'PROJ-123',
                fields: { summary: 'Test Issue', description: 'A test issue' },
              },
            ],
          }),
          { status: 200 }
        );
      }
    }

    // Default: 404
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  });
}

/**
 * Reset all mocks before each test.
 * Call this in your test setup.
 */
export function resetMocks() {
  vi.clearAllMocks();
}

/**
 * Test fixtures for common story data.
 */
export const testFixtures = {
  storyAha: {
    id: 'aha-story-1',
    storyId: 'STORY-123',
    storyTitle: 'Build authentication system',
    storyUrl: 'https://company.aha.io/stories/STORY-123',
    repoFullName: 'company/auth-service',
    branch: 'STORY-123',
    baseBranch: 'dev',
    status: 'discovery' as const,
    prNumber: null,
    prUrl: null,
    prStatus: null,
    phase: 'phase1' as const,
    createdAt: '2026-06-05T10:00:00Z',
    updatedAt: '2026-06-05T10:00:00Z',
    notes: 'Test story',
  },

  storyJira: {
    id: 'jira-issue-1',
    storyId: 'PROJ-456',
    storyTitle: 'Add API rate limiting',
    storyUrl: 'https://company.atlassian.net/browse/PROJ-456',
    repoFullName: 'company/api-service',
    branch: 'PROJ-456',
    baseBranch: 'main',
    status: 'implementing' as const,
    prNumber: 42,
    prUrl: 'https://github.com/company/api-service/pull/42',
    prStatus: 'open' as const,
    phase: 'phase2' as const,
    createdAt: '2026-06-04T15:00:00Z',
    updatedAt: '2026-06-05T09:30:00Z',
    notes: null,
  },
};
