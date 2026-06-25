/** Self-learning proxy — recent agent-run feedback cards from the crew brain (/learnings). */
export const runtime = 'nodejs';

export async function GET() {
  const base = (process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103').replace(/\/$/, '');
  try {
    const r = await fetch(`${base}/learnings`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return Response.json({ error: `agent /learnings HTTP ${r.status}` }, { status: 502 });
    return Response.json(await r.json());
  } catch {
    return Response.json({ error: `agent brain unreachable at ${base}` }, { status: 503 });
  }
}
