import { linkAhaStoryToPR } from '@/lib/aha';
import { emitAhaEventSafe } from '@story-agent/shared/aha-events';
import { parseAhaActor } from '@/lib/aha-parity';

/**
 * Worf-gated PR linking (crew ruling AHA-SYNC-TIERS): POST without confirm:true returns a dry-run
 * preview — the mutation only fires on an explicit confirm, mirroring the create-story route's gate.
 */
export async function POST(request: Request): Promise<Response> {
  let body: { featureId?: string; prUrl?: string; prTitle?: string; confirm?: boolean; actor?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const featureId = String(body.featureId ?? '').trim();
  const prUrl = String(body.prUrl ?? '').trim();
  const prTitle = String(body.prTitle ?? '').trim();
  if (!featureId || !prUrl || !prTitle) return json({ error: 'featureId, prUrl, and prTitle are required' }, 400);

  if (body.confirm !== true) {
    return json({
      dryRun: true,
      proposed: { featureId, prUrl, prTitle },
      note: 'Set confirm:true to apply (Worf-gated write).',
    });
  }

  try {
    await linkAhaStoryToPR(featureId, prUrl, prTitle);
    // Sync ledger: emit AFTER the Aha write succeeds; emit failure never fails the link (Worf ruling).
    await emitAhaEventSafe({
      resourceType: 'story',
      resourceId: featureId,
      operation: 'linked',
      actor: parseAhaActor(body.actor),
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'aha link-pr failed', details: e instanceof Error ? e.message : String(e) }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
