import { describe, it, expect } from 'vitest';
import { selectVisionModel, runVisionAnalysis, INTENT_COMPLEXITY } from './vision.js';
import { imageInputToUrl, checkImageSize, MAX_IMAGE_BASE64_BYTES, type ImageInput } from './image-input.js';

const IMG: ImageInput = { type: 'base64', data: 'AAAA', mimeType: 'image/png' };

describe('vision model routing', () => {
  it('routes complexity → cheapest adequate vision model; Anthropic thin', () => {
    expect(selectVisionModel('simple')).toBe('google/gemini-flash-1.5');
    expect(selectVisionModel('moderate')).toBe('openai/gpt-4o-mini');
    expect(selectVisionModel('complex')).toBe('openai/gpt-4o');
    expect(selectVisionModel('complex', { anthropic: true })).toMatch(/^anthropic\//);
  });
  it('maps intents to complexity', () => {
    expect(INTENT_COMPLEXITY.describe).toBe('simple');
    expect(INTENT_COMPLEXITY.screenshot_to_story).toBe('moderate');
    expect(INTENT_COMPLEXITY.diagram_to_tasks).toBe('complex');
  });
});

describe('image helpers', () => {
  it('builds a data URL for base64 and passes url through', () => {
    expect(imageInputToUrl(IMG)).toBe('data:image/png;base64,AAAA');
    expect(imageInputToUrl({ type: 'url', url: 'https://x/y.png' })).toBe('https://x/y.png');
  });
  it('rejects oversized base64', () => {
    expect(checkImageSize(IMG)).toBeNull();
    expect(checkImageSize({ type: 'base64', data: 'a'.repeat(MAX_IMAGE_BASE64_BYTES + 1), mimeType: 'image/png' })).toMatch(/exceeds/);
  });
});

describe('runVisionAnalysis (mocked fetch)', () => {
  const ok = (text: string) => ({ ok: true, json: async () => ({ choices: [{ message: { content: text } }] }) });

  it('calls the vision model with an image_url + text part and returns analysis', async () => {
    let sentBody: any;
    const fetchImpl = (async (_url: string, init: any) => { sentBody = JSON.parse(init.body); return ok('a description'); }) as unknown as typeof fetch;
    const r = await runVisionAnalysis(IMG, { intent: 'describe', apiKey: 'k', fetchImpl });
    expect(r.analysis).toBe('a description');
    expect(r.model).toBe('google/gemini-flash-1.5'); // describe → simple
    const parts = sentBody.messages[0].content;
    expect(parts.find((p: any) => p.type === 'image_url').image_url.url).toBe('data:image/png;base64,AAAA');
    expect(parts.find((p: any) => p.type === 'text')).toBeTruthy();
  });

  it('falls back to gpt-4o-mini when the primary model fails', async () => {
    let n = 0;
    const fetchImpl = (async () => { n += 1; return n === 1 ? { ok: false, status: 404, json: async () => ({}) } : ok('fallback result'); }) as unknown as typeof fetch;
    const r = await runVisionAnalysis(IMG, { intent: 'describe', apiKey: 'k', fetchImpl });
    expect(r.analysis).toBe('fallback result');
    expect(r.model).toBe('openai/gpt-4o-mini');
  });

  it('throws without an API key', async () => {
    await expect(runVisionAnalysis(IMG, { intent: 'describe', apiKey: '' })).rejects.toThrow(/authenticate/);
  });
});
