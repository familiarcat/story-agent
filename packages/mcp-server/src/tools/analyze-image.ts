import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ImageInputSchema, checkImageSize, runVisionAnalysis, INTENT_COMPLEXITY, type ImageInput, type VisionIntent } from '@story-agent/shared';
import { storeObservationMemory } from '@story-agent/shared/db';

/**
 * analyze_image — multimodal vision tool. Sends an image/screenshot + an intent prompt to a
 * Quark-selected OpenRouter VISION model (cheap→gemini-flash, moderate→gpt-4o-mini, complex→gpt-4o),
 * optionally storing the result to crew RAG.
 *
 * SECURITY (Worf): images EGRESS to a 3rd-party vision provider — non-controlled UI only; never send
 * sa_ / client / secret data or screenshots of controlled surfaces. Base64 is size-capped; image data
 * is never logged (only the model id + resulting text are surfaced).
 */
const INTENTS = ['describe', 'screenshot_to_story', 'ui_review', 'diagram_to_tasks', 'extract_text', 'custom'] as const;

export function registerAnalyzeImageTool(server: McpServer): void {
  server.tool(
    'analyze_image',
    [
      'Analyze an image/screenshot with a Quark-selected OpenRouter VISION model and optionally store the',
      'result to crew RAG. Intents: describe, screenshot_to_story (→ epic/story/task breakdown), ui_review',
      '(→ UX/accessibility critique), diagram_to_tasks, extract_text (OCR), custom (with customPrompt).',
      'SECURITY: images egress to a 3rd-party vision provider — send NON-CONTROLLED UI only, never',
      'sa_*/client/secret data. Base64 is size-capped; image data is never logged.',
    ].join(' '),
    {
      image: ImageInputSchema,
      intent: z.enum(INTENTS),
      customPrompt: z.string().optional().describe('Prompt for intent="custom".'),
      storeToRag: z.boolean().optional().default(true),
      ragTags: z.array(z.string()).optional(),
    },
    async ({ image, intent, customPrompt, storeToRag, ragTags }) => {
      const img = image as ImageInput;
      const sizeErr = checkImageSize(img);
      if (sizeErr) return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: sizeErr }) }] };

      let result;
      try {
        result = await runVisionAnalysis(img, { intent: intent as VisionIntent, customPrompt });
      } catch (e) {
        return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: `vision analysis failed: ${e instanceof Error ? e.message : String(e)}` }) }] };
      }

      let ragStored = false;
      if (storeToRag !== false) {
        try {
          await storeObservationMemory({
            storyId: `VISION-${intent}`,
            source: 'mcp',
            transcript: { rounds: [{ title: `analyze_image:${intent}`, entries: [] }], consensusSummary: result.analysis, unresolvedRisks: [], finalDecision: 'approved', actionItems: [] },
            tags: ['multimodal', 'vision', intent, ...(ragTags ?? [])],
          });
          ragStored = true;
        } catch { /* RAG store is best-effort — never fail the analysis on a memory hiccup */ }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ analysis: result.analysis, model: result.model, complexity: INTENT_COMPLEXITY[intent as VisionIntent], ragStored }, null, 2),
        }],
      };
    }
  );
}
