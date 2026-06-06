"use strict";
/**
 * Test utilities for story-agent integration tests.
 * Provides mock clients and test fixtures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFixtures = exports.IS_INTEGRATION_TEST = exports.IS_LOCAL_TEST = exports.TEST_ENV = void 0;
exports.createMockSupabaseClient = createMockSupabaseClient;
exports.createMockApprovedLlmClient = createMockApprovedLlmClient;
exports.createMockFetch = createMockFetch;
exports.resetMocks = resetMocks;
const vitest_1 = require("vitest");
/**
 * Configure test environment mode.
 * Affects whether mocks or real implementations are used.
 */
exports.TEST_ENV = process.env.TEST_ENV || 'local';
exports.IS_LOCAL_TEST = exports.TEST_ENV === 'local';
exports.IS_INTEGRATION_TEST = exports.TEST_ENV === 'integration';
/**
 * Mock Supabase client for testing.
 * Returns an object shaped like SupabaseClient with chainable query builders.
 * Note: Returns synchronous results for testing, not Promises.
 */
function createMockSupabaseClient() {
    const mockData = {
        sa_stories: [],
        sa_observation_memories: [],
        sa_docs_knowledge_vectors: [],
    };
    // Helper: create a chainable filter result with order/limit
    const createChainableResult = (table, filterFn) => {
        const filtered = filterFn ? mockData[table].filter(filterFn) : [...(mockData[table] || [])];
        return {
            single: async () => ({
                data: filtered.length > 0 ? filtered[0] : null,
                error: null,
            }),
            order: (column, opts) => {
                const sorted = filtered.sort((a, b) => {
                    const cmp = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
                    return opts?.ascending === false ? -cmp : cmp;
                });
                return { data: sorted, error: null };
            },
            limit: (n) => ({
                data: filtered.slice(0, n),
                error: null,
            }),
        };
    };
    const createQueryBuilder = (table) => ({
        select: (columns) => ({
            eq: (column, value) => createChainableResult(table, (row) => row[column] === value),
            order: (column, opts) => {
                const sorted = (mockData[table] || []).sort((a, b) => {
                    const cmp = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
                    return opts?.ascending === false ? -cmp : cmp;
                });
                return { data: sorted, error: null };
            },
        }),
        upsert: vitest_1.vi.fn(async (data, opts) => {
            if (!mockData[table])
                mockData[table] = [];
            const existingIdx = mockData[table].findIndex((row) => opts?.onConflict ? row[opts.onConflict] === data[opts.onConflict] : row.id === data.id);
            if (existingIdx >= 0) {
                mockData[table][existingIdx] = { ...mockData[table][existingIdx], ...data };
            }
            else {
                mockData[table].push(data);
            }
            return { data: null, error: null };
        }),
    });
    return {
        from: (table) => createQueryBuilder(table),
        __mockData: mockData,
    };
}
/**
 * Mock approved OpenAI-compatible LLM client for testing.
 * Returns deterministic responses for crew member prompts.
 */
function createMockApprovedLlmClient() {
    return {
        chat: {
            completions: {
                create: vitest_1.vi.fn(async (options) => {
                    const { messages } = options;
                    const userMessage = messages.find((m) => m.role === 'user')?.content || '';
                    // Deterministic responses based on crew member or user prompt content
                    let responseText = 'FINDINGS:\n- Analysis complete\n\nRECOMMENDATIONS:\n- Proceed\n\nCONFIDENCE: 0.8';
                    if (userMessage.includes('picard') || userMessage.includes('captain')) {
                        responseText = 'FINDINGS:\n- Strategic mission alignment achieved\n- Executive authority affirmed\n\nRECOMMENDATIONS:\n- Authorize mission execution\n\nCONFIDENCE: 0.95';
                    }
                    else if (userMessage.includes('worf') || userMessage.includes('security')) {
                        responseText = 'FINDINGS:\n- Security perimeter validated\n- No blocking concerns detected\n\nRECOMMENDATIONS:\n- Proceed with caution\n\nCONFIDENCE: 0.85';
                    }
                    else if (userMessage.includes('data') || userMessage.includes('architecture')) {
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
function createMockFetch() {
    return vitest_1.vi.fn(async (url, options) => {
        // Aha API
        if (url.includes('.aha.io/api/v1/')) {
            if (url.includes('/stories')) {
                return new Response(JSON.stringify({
                    stories: [
                        {
                            id: 'story-1',
                            reference_num: 'STORY-123',
                            name: 'Test Story',
                            description: 'A test story',
                        },
                    ],
                }), { status: 200 });
            }
        }
        // Jira API
        if (url.includes('.atlassian.net/rest/api')) {
            if (url.includes('/search')) {
                return new Response(JSON.stringify({
                    issues: [
                        {
                            key: 'PROJ-123',
                            fields: { summary: 'Test Issue', description: 'A test issue' },
                        },
                    ],
                }), { status: 200 });
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
function resetMocks() {
    vitest_1.vi.clearAllMocks();
}
/**
 * Test fixtures for common story data.
 */
exports.testFixtures = {
    storyAha: {
        id: 'aha-story-1',
        storyId: 'STORY-123',
        storyTitle: 'Build authentication system',
        storyUrl: 'https://company.aha.io/stories/STORY-123',
        repoFullName: 'company/auth-service',
        branch: 'STORY-123',
        baseBranch: 'dev',
        status: 'discovery',
        prNumber: null,
        prUrl: null,
        prStatus: null,
        phase: 'phase1',
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
        status: 'implementing',
        prNumber: 42,
        prUrl: 'https://github.com/company/api-service/pull/42',
        prStatus: 'open',
        phase: 'phase2',
        createdAt: '2026-06-04T15:00:00Z',
        updatedAt: '2026-06-05T09:30:00Z',
        notes: null,
    },
};
//# sourceMappingURL=setup.js.map