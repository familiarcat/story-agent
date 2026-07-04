import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ImageInputSchema, checkImageSize, runVisionAnalysis, type ImageInput } from '@story-agent/shared';
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';

/**
 * crew_analyze_image — the crew assesses an image's TEXT CONTENT together. Two governed steps, reusing
 * existing pieces (no new machinery):
 *   1. runVisionAnalysis(extract_text|describe) — a vision model reads the image's content.
 *   2. runMissionPipeline(extracted content) — the full crew deliberates it together (Observation Lounge,
 *      auto-stored to RAG).
 *
 * SECURITY (Worf): step 1 EGRESSES the image to a 3rd-party vision provider — non-controlled UI/content
 * only, never sa_/client/secret data or personal media the operator hasn't cleared. Base64 size-capped.
 */
export interface CrewImageAnalysis {
  extractedText: string;
  visionModel: string;
  crew: { missionPlan: string; costUSD: number; topModel: string };
}

export async function crewAnalyzeImage(args: {
  image: ImageInput; question?: string; extractIntent?: 'extract_text' | 'describe';
}): Promise<CrewImageAnalysis> {
  const sizeErr = checkImageSize(args.image);
  if (sizeErr) throw new Error(sizeErr);

  const vision = await runVisionAnalysis(args.image, { intent: args.extractIntent ?? 'extract_text' });
  const arena = [
    'The following content was extracted from an image via a vision model. Assess it TOGETHER.',
    args.question?.trim() || 'What are the key points, any risks or gaps, and the recommended next actions?',
    '',
    'EXTRACTED CONTENT:',
    vision.analysis,
  ].join('\n');
  const mission = await runMissionPipeline(arena); // full-crew deliberation, auto-stored to RAG

  return {
    extractedText: vision.analysis,
    visionModel: vision.model,
    crew: { missionPlan: mission.missionPlan, costUSD: mission.efficiency.totalCostUSD, topModel: mission.topModel },
  };
}

export function registerCrewAnalyzeImageTool(server: McpServer): void {
  server.tool(
    'crew_analyze_image',
    'The crew assesses an image\'s TEXT CONTENT together: a vision model extracts the text/content, then the full crew deliberates it (Observation Lounge, stored to RAG). Returns the extracted text + the crew mission plan. SECURITY: the image egresses to a 3rd-party vision provider — non-controlled content only, never sa_/client/secret data or personal media.',
    {
      image: ImageInputSchema,
      question: z.string().optional().describe('What the crew should focus on (default: key points, risks, next actions).'),
      extractIntent: z.enum(['extract_text', 'describe']).optional().describe('extract_text (OCR, default) or describe.'),
    },
    async ({ image, question, extractIntent }) => {
      try {
        const r = await crewAnalyzeImage({ image: image as ImageInput, question, extractIntent });
        return { content: [{ type: 'text' as const, text: JSON.stringify(r, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) }] };
      }
    }
  );
}
