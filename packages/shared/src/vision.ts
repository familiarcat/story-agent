/**
 * Multimodal analysis primitives — model routing + the core OpenRouter multimodal call.
 * Shared so MCP tools and UI routes use ONE implementation (crew ruling: no duplication).
 *
 * Model routing (Quark): cheapest adequate model per complexity; Anthropic stays thin.
 * Reachability: gemini-flash-1.5 is best-effort — runMultimodalAnalysis falls back to gpt-4o-mini on any
 * failure (MODEL_POOL rule: don't hard-depend on unverified slugs).
 */
import { type ImageInput, imageInputToUrl } from './image-input.js';

export type MultimodalComplexity = 'simple' | 'moderate' | 'complex';

export const MULTIMODAL_MODELS: Record<MultimodalComplexity, string> = {
  simple: 'google/gemini-flash-1.5',   // cheap OCR/describe
  moderate: 'openai/gpt-4o-mini',      // balanced
  complex: 'openai/gpt-4o',            // diagrams / UI reasoning
};
/** Anthropic vision — thin, explicit-only. Uses the reachable pool slug (spec's opus-4-5 was not
 *  verified-reachable; per the MODEL_POOL "reachable slugs only" rule we use claude-sonnet-4.6). */
export const MULTIMODAL_MODEL_ARCHITECTURE = 'anthropic/claude-sonnet-4.6';

export function selectMultimodalModel(complexity: MultimodalComplexity, opts?: { anthropic?: boolean }): string {
  if (opts?.anthropic) return MULTIMODAL_MODEL_ARCHITECTURE;
  return MULTIMODAL_MODELS[complexity] ?? MULTIMODAL_MODELS.moderate;
}

export type MultimodalIntent = 'describe' | 'screenshot_to_story' | 'ui_review' | 'diagram_to_tasks' | 'extract_text' | 'custom';

export const MULTIMODAL_INTENT_COMPLEXITY: Record<MultimodalIntent, MultimodalComplexity> = {
  describe: 'simple',
  extract_text: 'simple',
  screenshot_to_story: 'moderate',
  ui_review: 'moderate',
  diagram_to_tasks: 'complex',
  custom: 'complex',
};

export const MULTIMODAL_INTENT_PROMPTS: Record<Exclude<MultimodalIntent, 'custom'>, string> = {
  describe: 'Describe this image concisely and accurately: layout, key elements, and any text.',
  extract_text: 'Extract ALL text visible in this image verbatim, preserving structure (headings, lists, tables). Output only the extracted text.',
  screenshot_to_story: 'You are a product analyst. From this UI screenshot, produce a delivery breakdown as EPIC → STORIES → TASKS: 1 epic (the feature shown), 3-6 user stories ("As a … I want … so that …"), and concrete implementation tasks under each. Be specific to what is visible.',
  ui_review: 'You are a senior UI/UX + accessibility reviewer. Critique this interface: visual hierarchy, contrast/legibility (WCAG), spacing, consistency, and clarity. Give prioritized, actionable fixes.',
  diagram_to_tasks: 'This is a diagram (architecture/flow/wireframe). Interpret it and produce a concrete, ordered list of engineering TASKS to implement what it depicts, noting components, data flow, and dependencies.',
};

export interface MultimodalResult { analysis: string; model: string; }

/**
 * Core multimodal call — POST an image + intent prompt to an OpenRouter multimodal model (OpenAI-compatible
 * chat/completions with an image_url content part). Tries the complexity-selected model, then falls
 * back to gpt-4o-mini. Image data is passed through, never logged.
 */
export async function runMultimodalAnalysis(
  image: ImageInput,
  opts: { intent: MultimodalIntent; customPrompt?: string; anthropic?: boolean; apiKey?: string; apiUrl?: string; maxTokens?: number; fetchImpl?: typeof fetch },
): Promise<MultimodalResult> {
  const key = opts.apiKey ?? process.env.CREW_LLM_APPROVED_KEY ?? '';
  const base = (opts.apiUrl ?? process.env.CREW_LLM_APPROVED_URL ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;
  if (!key) throw new Error('no CREW_LLM_APPROVED_KEY — multimodal call cannot authenticate');

  const complexity = MULTIMODAL_INTENT_COMPLEXITY[opts.intent] ?? 'moderate';
  const prompt = opts.intent === 'custom'
    ? (opts.customPrompt?.trim() || 'Describe this image.')
    : MULTIMODAL_INTENT_PROMPTS[opts.intent];
  const imageUrl = imageInputToUrl(image);

  const candidates = [...new Set([selectMultimodalModel(complexity, { anthropic: opts.anthropic }), 'openai/gpt-4o-mini'])];
  let lastErr: unknown;
  for (const model of candidates) {
    try {
      const res = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: opts.maxTokens ?? 900,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ] }],
        }),
      });
      if (!res.ok) { lastErr = new Error(`vision HTTP ${res.status}`); continue; }
      const j: any = await res.json(); // eslint-disable-line @typescript-eslint/no-explicit-any
      const text = (j?.choices?.[0]?.message?.content ?? '').trim();
      if (text) return { analysis: text, model };
      lastErr = new Error('empty vision response');
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error('multimodal analysis failed');
}

// Backward-compatible aliases while the platform migrates from vision-* naming.
export type VisionComplexity = MultimodalComplexity;
export type VisionIntent = MultimodalIntent;
export type VisionResult = MultimodalResult;
export const VISION_MODELS = MULTIMODAL_MODELS;
export const VISION_MODEL_ARCHITECTURE = MULTIMODAL_MODEL_ARCHITECTURE;
export const INTENT_COMPLEXITY = MULTIMODAL_INTENT_COMPLEXITY;
export const INTENT_PROMPTS = MULTIMODAL_INTENT_PROMPTS;
export const selectVisionModel = selectMultimodalModel;
export const runVisionAnalysis = runMultimodalAnalysis;
