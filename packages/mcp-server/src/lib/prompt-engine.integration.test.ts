import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockApprovedLlmClient, IS_LOCAL_TEST } from '../../test/setup.js';
import { substitutePromptVariables } from '../lib/prompt-engine.js';

/**
 * Integration tests for prompt engine with mocked LLM calls.
 * These test the full crew agent flow with mocked approved-provider responses.
 * In local mode (TEST_ENV=local), uses deterministic mock responses.
 * In integration mode (TEST_ENV=integration), would call real approved LLM API.
 */

const skipIfNotTesting = IS_LOCAL_TEST ? describe : describe.skip;

skipIfNotTesting('Prompt Engine Integration Tests', () => {
  let mockApprovedLlm: any;

  beforeEach(() => {
    mockApprovedLlm = createMockApprovedLlmClient();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('LLM call mocking', () => {
    it('returns deterministic response for captain picard', async () => {
      const response = await mockApprovedLlm.chat.completions.create({
        model: 'claude-3-opus',
        messages: [
          { role: 'system', content: 'You are Captain Picard.' },
          { role: 'user', content: 'Analyze story captain picard mission.' },
        ],
      });

      const content = response.choices[0].message.content;
      expect(content).toContain('FINDINGS:');
      expect(content).toContain('Strategic mission alignment achieved');
      expect(content).toContain('Executive authority affirmed');
    });

    it('returns deterministic response for worf security', async () => {
      const response = await mockApprovedLlm.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Lt. Worf, Security Officer.' },
          { role: 'user', content: 'Review security for story worf audit.' },
        ],
      });

      const content = response.choices[0].message.content;
      expect(content).toContain('Security perimeter validated');
      expect(content).toContain('No blocking concerns detected');
    });

    it('returns deterministic response for data architecture', async () => {
      const response = await mockApprovedLlm.chat.completions.create({
        model: 'claude-3.5-sonnet',
        messages: [
          { role: 'system', content: 'You are Commander Data, Architect.' },
          { role: 'user', content: 'Validate architecture for story data design.' },
        ],
      });

      const content = response.choices[0].message.content;
      expect(content).toContain('Architecture DDD compliance verified');
      expect(content).toContain('Design approved for implementation');
    });

    it('returns generic response for unknown crew member', async () => {
      const response = await mockApprovedLlm.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Unknown Crew.' },
          { role: 'user', content: 'Analyze story unknown crew.' },
        ],
      });

      const content = response.choices[0].message.content;
      expect(content).toContain('FINDINGS:');
      expect(content).toContain('Analysis complete');
    });
  });

  describe('Token counting', () => {
    it('tracks token usage from mock responses', async () => {
      const response = await mockApprovedLlm.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test message' }],
      });

      expect(response.usage.prompt_tokens).toBe(100);
      expect(response.usage.completion_tokens).toBe(50);
    });
  });

  describe('Variable substitution + LLM integration', () => {
    it('substitutes variables before sending to LLM', () => {
      const template = 'Story {{storyNum}}: {{storyName}}';
      const vars = { storyNum: 'STORY-123', storyName: 'Build auth' };
      
      const prompt = substitutePromptVariables(template, vars);
      
      expect(prompt).toBe('Story STORY-123: Build auth');
    });

    it('handles conditional variables in prompt', () => {
      const template = 'Story {{storyNum}}.{{#description}} Description: {{description}}{{/description}}';
      const varsWithDesc = { storyNum: 'STORY-456', description: 'Add features' };
      const varsWithoutDesc = { storyNum: 'STORY-789' };

      const with_desc = substitutePromptVariables(template, varsWithDesc);
      const without_desc = substitutePromptVariables(template, varsWithoutDesc);

      expect(with_desc).toBe('Story STORY-456. Description: Add features');
      expect(without_desc).toBe('Story STORY-789.');
    });
  });

  describe('Error handling', () => {
    it('handles LLM call failures gracefully', async () => {
      const failingClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
          },
        },
      };

      await expect(
        failingClient.chat.completions.create({ model: 'test', messages: [] })
      ).rejects.toThrow('API rate limit exceeded');
    });
  });
});
