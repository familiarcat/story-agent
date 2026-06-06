/**
 * MCP Server test utilities.
 */

import { vi } from 'vitest';

export const TEST_ENV = process.env.TEST_ENV || 'local';
export const IS_LOCAL_TEST = TEST_ENV === 'local';

/**
 * Mock implementation for getPromptTemplate.
 */
export function createMockPromptTemplate(crewId: string) {
  return {
    id: `${crewId}_test`,
    crewId,
    systemPrompt: `You are ${crewId}. Respond with FINDINGS, RECOMMENDATIONS, CONFIDENCE.`,
    userPromptTemplate: 'Story {{storyNum}}: {{storyName}}. {{#description}}Description: {{description}}{{/description}}',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1500,
    requiredVariables: ['storyNum', 'storyName'],
  };
}

/**
 * Mock environment variables for provider testing.
 */
export function setupProviderEnv(providerName: 'aha' | 'jira' | 'linear' | 'github-projects') {
  switch (providerName) {
    case 'aha':
      process.env.AHA_DOMAIN = 'test.aha.io';
      process.env.AHA_API_KEY = 'test-aha-key';
      delete process.env.JIRA_DOMAIN;
      delete process.env.LINEAR_API_KEY;
      break;
    case 'jira':
      process.env.JIRA_DOMAIN = 'test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-jira-token';
      delete process.env.AHA_DOMAIN;
      delete process.env.LINEAR_API_KEY;
      break;
    case 'linear':
      process.env.LINEAR_API_KEY = 'test-linear-key';
      delete process.env.AHA_DOMAIN;
      delete process.env.JIRA_DOMAIN;
      break;
    case 'github-projects':
      process.env.GITHUB_TOKEN = 'test-gh-token';
      process.env.GITHUB_ORG = 'test-org';
      delete process.env.AHA_DOMAIN;
      delete process.env.JIRA_DOMAIN;
      break;
  }
}

/**
 * Clear provider env vars.
 */
export function clearProviderEnv() {
  delete process.env.AGILE_PROVIDER;
  delete process.env.AHA_DOMAIN;
  delete process.env.AHA_API_KEY;
  delete process.env.JIRA_DOMAIN;
  delete process.env.JIRA_EMAIL;
  delete process.env.JIRA_API_TOKEN;
  delete process.env.LINEAR_API_KEY;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_ORG;
}

/**
 * Mock approved OpenAI-compatible LLM client for testing.
 * Returns deterministic responses for crew member prompts.
 */
export function createMockApprovedLlmClient() {
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
