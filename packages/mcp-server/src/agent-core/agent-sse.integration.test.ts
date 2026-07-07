import { describe, it, expect } from 'vitest';

/**
 * Crew infra-integration #3 (e2e slice) — prove the deployed HTTP→SSE contract the front end consumes:
 * browser/proxy -> ALB -> mcp /agent -> streamed AgentEvents -> terminal `done`. This is the boundary
 * documented in docs/agent-sse-contract.md.
 *
 * Runs only when STORY_AGENT_AGENT_URL points at a reachable crew server (local `pnpm run mcp` or the
 * cloud ALB); skips cleanly otherwise so it never fails a Redis/server-less suite. Attaches the bearer
 * token when AGENT_SERVICE_TOKEN is set.
 */
const BASE = process.env.STORY_AGENT_AGENT_URL?.replace(/\/$/, '');
const TOKEN = process.env.AGENT_SERVICE_TOKEN;

describe.skipIf(!BASE)('agent /agent SSE contract (live server)', () => {
  it('GET /agent/health is ok', async () => {
    const res = await fetch(`${BASE}/agent/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('POST /agent streams a model event and a terminal done', async () => {
    const res = await fetch(`${BASE}/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify({ input: 'List the files in the current directory. Do not edit anything.' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    // Drain the stream, collecting the event types we see (bounded so the test can't hang).
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const types = new Set<string>();
    let sawDone = false;
    let buf = '';
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      if (/^event: done/m.test(buf)) sawDone = true;
      for (const m of buf.matchAll(/data: (\{.*\})/g)) {
        try { const ev = JSON.parse(m[1]); if (ev.type) types.add(ev.type); } catch { /* partial frame */ }
      }
      if (sawDone) break;
    }
    reader.cancel().catch(() => {});

    expect(types.has('model')).toBe(true); // Quark picked a model
    expect(sawDone).toBe(true);            // stream terminated cleanly
  }, 70_000);
});
