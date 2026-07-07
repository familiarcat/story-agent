import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cost Observatory proxy — fetches the agent-core /cost ledger (Quark spend + savings vs an
 * Anthropic-frontier baseline) from the deployed or local crew brain.
 * If the crew brain is unavailable, it falls back to the local control-lane status marker.
 */
export const runtime = 'nodejs';

export async function GET() {
  const base = (process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103').replace(/\/$/, '');
  const cachePath = join(process.cwd(), '..', '..', '.claude', 'control-lane-status.json');
  let liveError = '';

  try {
    const r = await fetch(`${base}/cost`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) return Response.json(await r.json());
    liveError = `agent /cost HTTP ${r.status}`;
  } catch (e) {
    liveError = `agent brain unreachable at ${base}`;
  }

  if (existsSync(cachePath)) {
    try {
      const offlineMarker = JSON.parse(readFileSync(cachePath, 'utf8'));
      return Response.json({ source: 'cache', offlineMarker, note: 'Using cached lane status from .claude/control-lane-status.json because the live crew brain cost endpoint was unavailable.' });
    } catch (e) {
      return Response.json({ error: `failed to parse cached lane status at ${cachePath}` }, { status: 500 });
    }
  }

  return Response.json({ error: liveError }, { status: 503 });
}
