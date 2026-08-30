/**
 * Agent Workspace proxy — pipes the crew brain's /agent SSE loop (agent-core: the Claude-Code-grade
 * agentic tool-calling loop on a Quark-selected OpenRouter model) straight through to the browser.
 *
 * Thin by design (Quark): no buffering, no re-framing — the upstream `data: {type,...}` events
 * (model · text · tool_call · gate · tool_result · cost · escalation · done · error) flow as-is, so
 * the UI sees exactly what the CLI sees. Forwards the optional AGENT_SERVICE_TOKEN when configured.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const base = (process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103').replace(/\/$/, '');
  const token = process.env.AGENT_SERVICE_TOKEN;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* empty body */ }
  const input = String(body.input ?? body.prompt ?? '').trim();
  if (!input) return Response.json({ error: 'input_required' }, { status: 400 });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(`${base}/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input,
        workspace: body.workspace,
        clientId: body.clientId ?? null,
        tier: body.tier,
      }),
    });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: `agent brain HTTP ${upstream.status}` }, { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return Response.json({ error: `agent brain unreachable at ${base}` }, { status: 503 });
  }
}
