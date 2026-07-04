import { describe, it, expect, vi } from 'vitest';

vi.mock('@story-agent/shared', async (orig) => ({ ...(await (orig() as any)), runVisionAnalysis: vi.fn(async () => ({ analysis: 'EXTRACTED_TEXT_XYZ', model: 'openai/gpt-4o-mini' })) }));
let arena: string | undefined;
vi.mock('../lib/crew-mission-pipeline.js', () => ({ runMissionPipeline: vi.fn(async (a: string) => { arena = a; return { missionPlan: 'CREW_PLAN', efficiency: { totalCostUSD: 0.002 }, topModel: 'deepseek' }; }) }));

import { crewAnalyzeImage } from './crew-analyze-image.js';

describe('crewAnalyzeImage (vision extract → crew deliberation)', () => {
  it('extracts the image text, then feeds it to the crew to analyze together', async () => {
    const r = await crewAnalyzeImage({ image: { type: 'base64', data: 'AAAA', mimeType: 'image/png' } });
    expect(r.extractedText).toBe('EXTRACTED_TEXT_XYZ');
    expect(r.visionModel).toBe('openai/gpt-4o-mini');
    expect(arena).toContain('EXTRACTED_TEXT_XYZ');   // extracted content handed to the crew
    expect(r.crew.missionPlan).toBe('CREW_PLAN');
  });
  it('rejects oversized base64 BEFORE egress', async () => {
    await expect(crewAnalyzeImage({ image: { type: 'base64', data: 'a'.repeat(9 * 1024 * 1024), mimeType: 'image/png' } })).rejects.toThrow(/exceeds/);
  });
});
