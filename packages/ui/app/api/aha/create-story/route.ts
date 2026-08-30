import { createAhaStory, getAhaSprint } from '@/lib/aha';
import { emitAhaEventSafe } from '@story-agent/shared/aha-events';
import { estimateStoryGravity } from '@story-agent/shared';
import { parseAhaActor } from '@/lib/aha-parity';

/**
 * Worf-gated story creation (crew story-picker mission, RAG 38b41c47): POST without confirm:true
 * returns a dry-run preview — the mutation only fires on an explicit confirm, mirroring the
 * aha:create-feature MCP tool's gate.
 */
export async function POST(request: Request): Promise<Response> {
  let body: {
    releaseId?: string;
    name?: string;
    description?: string;
    storyPoints?: number;
    dependencyCount?: number;
    integrationSurfaceCount?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    uncertainty?: number;
    confirm?: boolean;
    actor?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const releaseId = String(body.releaseId ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!releaseId || !name) return json({ error: 'releaseId and name are required' }, 400);

  const estimate = estimateStoryGravity({
    name,
    description: body.description,
    dependencyCount: body.dependencyCount,
    integrationSurfaceCount: body.integrationSurfaceCount,
    riskLevel: body.riskLevel,
    uncertainty: body.uncertainty,
  });
  const finalStoryPoints = body.storyPoints ?? estimate.storyPoints;

  if (body.confirm !== true) {
    let sprintName: string | null = null;
    try {
      sprintName = (await getAhaSprint(releaseId)).name;
    } catch {
      /* preview still useful without the sprint name */
    }
    return json({
      dryRun: true,
      proposed: { releaseId, sprintName, name, description: body.description ?? '', score: finalStoryPoints },
      estimation: {
        model: estimate.model,
        suggestedStoryPoints: estimate.storyPoints,
        appliedStoryPoints: finalStoryPoints,
        gravityWeight: estimate.gravityWeight,
        effectiveVelocityLoad: estimate.effectiveVelocityLoad,
        rationale: estimate.rationale,
      },
      note: 'Set confirm:true to apply (Worf-gated write).',
    });
  }

  try {
    const story = await createAhaStory(releaseId, {
      name,
      description: body.description,
      storyPoints: finalStoryPoints,
      dependencyCount: body.dependencyCount,
      integrationSurfaceCount: body.integrationSurfaceCount,
      riskLevel: body.riskLevel,
      uncertainty: body.uncertainty,
    });
    // Sync ledger: emit AFTER the Aha write succeeds; emit failure never fails the create (Worf ruling).
    await emitAhaEventSafe({
      resourceType: 'story',
      resourceId: story.referenceNum,
      operation: 'created',
      actor: parseAhaActor(body.actor),
      meta: { sprint_id: releaseId },
    });
    return json({
      dryRun: false,
      story,
      estimation: {
        model: estimate.model,
        suggestedStoryPoints: estimate.storyPoints,
        appliedStoryPoints: finalStoryPoints,
        gravityWeight: estimate.gravityWeight,
        effectiveVelocityLoad: estimate.effectiveVelocityLoad,
      },
    });
  } catch (e) {
    return json({ error: 'aha create-story failed', details: e instanceof Error ? e.message : String(e) }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
