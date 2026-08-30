import { NextResponse } from 'next/server';
import { ImageInputSchema, checkImageSize, runVisionAnalysis, type VisionIntent } from '@story-agent/shared';

export const dynamic = 'force-dynamic';

const INTENTS = ['describe', 'screenshot_to_story', 'ui_review', 'diagram_to_tasks', 'extract_text', 'custom'];

/**
 * UI vision endpoint — reuses the SAME shared runVisionAnalysis as the MCP analyze_image tool (single
 * source). SECURITY: images egress to a 3rd-party vision provider — the UI warns; send non-controlled
 * UI only. Image data is never logged.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ImageInputSchema.safeParse(body?.image);
    if (!parsed.success) return NextResponse.json({ error: 'invalid image input (need base64+mimeType or url)' }, { status: 400 });
    const intent: VisionIntent = INTENTS.includes(body?.intent) ? body.intent : 'describe';
    const sizeErr = checkImageSize(parsed.data);
    if (sizeErr) return NextResponse.json({ error: sizeErr }, { status: 413 });

    const result = await runVisionAnalysis(parsed.data, { intent, customPrompt: body?.customPrompt });
    return NextResponse.json({ analysis: result.analysis, model: result.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'vision analysis failed' }, { status: 500 });
  }
}
