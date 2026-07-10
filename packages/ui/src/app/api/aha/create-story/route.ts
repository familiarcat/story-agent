import { createAhaStory, getAhaSprint } from '@/lib/aha';

/**
 * Worf-gated story creation (crew story-picker mission, RAG 38b41c47): POST without confirm:true
 * returns a dry-run preview — the mutation only fires on an explicit confirm, mirroring the
 * aha:create-feature MCP tool's gate.
 */
export async function POST(request: Request): Promise<Response> {
  let body: { releaseId?: string; name?: string; description?: string; confirm?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const releaseId = String(body.releaseId ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!releaseId || !name) return json({ error: 'releaseId and name are required' }, 400);

  if (body.confirm !== true) {
    let sprintName: string | null = null;
    try {
      sprintName = (await getAhaSprint(releaseId)).name;
    } catch {
      /* preview still useful without the sprint name */
    }
    return json({
      dryRun: true,
      proposed: { releaseId, sprintName, name, description: body.description ?? '' },
      note: 'Set confirm:true to apply (Worf-gated write).',
    });
  }

  try {
    const story = await createAhaStory(releaseId, { name, description: body.description });
    return json({ dryRun: false, story });
  } catch (e) {
    return json({ error: 'aha create-story failed', details: e instanceof Error ? e.message : String(e) }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
