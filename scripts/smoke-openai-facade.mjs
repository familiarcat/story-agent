#!/usr/bin/env node

const baseUrl = (process.env.STORY_AGENT_OPENAI_BASE_URL || 'http://localhost:3103/v1').replace(/\/$/, '');
const apiKey = process.env.AGENT_SERVICE_TOKEN || process.env.STORY_AGENT_TOKEN || 'local-dev-token';
const timeoutMs = Number(process.env.STORY_AGENT_SMOKE_TIMEOUT_MS || 15000);
const prompt = process.env.STORY_AGENT_SMOKE_PROMPT || 'Say hello from Story Agent.';

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

function fail(message, detail) {
  console.error(`story-agent facade smoke FAILED: ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'story-agent/crew-chat',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
    signal: controller.signal,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    fail(`HTTP ${response.status}`, json ? JSON.stringify(json, null, 2) : undefined);
  }

  const answer = json?.choices?.[0]?.message?.content;
  const model = json?.model;
  const usage = json?.usage;

  if (typeof answer !== 'string' || !answer.trim()) fail('missing assistant message content');
  if (typeof model !== 'string' || !model.trim()) fail('missing model in response');
  if (!usage || typeof usage.prompt_tokens !== 'number' || typeof usage.completion_tokens !== 'number') {
    fail('missing usage block in response');
  }

  console.log('story-agent facade smoke OK');
  console.log(JSON.stringify({
    baseUrl,
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    preview: answer.slice(0, 160),
  }, null, 2));
} catch (error) {
  fail(error?.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : 'request failed', error instanceof Error ? error.message : String(error));
} finally {
  clearTimeout(timer);
}