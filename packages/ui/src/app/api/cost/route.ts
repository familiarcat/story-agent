/**
 * Cost Observatory proxy — fetches the agent-core /cost ledger (Quark spend + savings vs an
 * Anthropic-frontier baseline) from the deployed or local crew brain.
 */
export const runtime = 'nodejs';

export async function GET() {
  const base = (process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}/cost`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return Response.json({ error: `agent /cost HTTP ${r.status}` }, { status: 502 });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: `agent brain unreachable at ${base}` }, { status: 503 });
  }
}
