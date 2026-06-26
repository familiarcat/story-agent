/**
 * Approval back-channel — forwards an operator's approve/deny decision for a pending WorfGate gate
 * to the crew brain's POST /agent/approve, which resolves the paused tool call in the agent loop.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const base = (process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103').replace(/\/$/, '');
  const token = process.env.AGENT_SERVICE_TOKEN;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* empty */ }
  const id = String(body.id ?? '');
  const decision = body.decision === 'approve' ? 'approve' : 'deny';
  if (!id) return Response.json({ error: 'id_required' }, { status: 400 });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const r = await fetch(`${base}/agent/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id, decision }),
      signal: AbortSignal.timeout(8000),
    });
    return Response.json(await r.json().catch(() => ({})), { status: r.status });
  } catch {
    return Response.json({ error: `agent brain unreachable at ${base}` }, { status: 503 });
  }
}
