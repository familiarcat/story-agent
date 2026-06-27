/**
 * Crew status feed → Aha! auto-maintained stories (crew-aha-feedback design, RAG MEM 54). Turns a
 * crew mission/status RESULT into an Aha! story DRAFT, then commits it through the EXISTING governed
 * path (executeAhaStoryWithMemory: RAG agreement → identity-verified, confirm-gated, audited Aha
 * write → RAG result). Default is a dry-run draft (no write) — Worf's floor: the crew proposes, a
 * human confirms. This is how the crew auto-maintains its own backlog under firm→client→project→story.
 */
import { executeAhaStoryWithMemory } from './crew-aha-mission.js';

export interface CrewResultLike {
  goals?: string;
  missionPlan: string;
  topModel?: string;
  efficiency?: { totalCostUSD?: number };
  contributions?: Array<{ crewId: string }>;
  storyId?: string;
}

export interface AhaStoryDraft {
  name: string;
  description: string;
}

/** Map a crew mission/status result → an Aha! story draft (pure — unit-testable, no write). */
export function crewResultToAhaDraft(r: CrewResultLike, opts: { titlePrefix?: string } = {}): AhaStoryDraft {
  const firstGoal = (r.goals ?? '')
    .split('\n')
    .map((s) => s.replace(/^[\s\d.)*-]+/, '').trim())
    .filter((s) => s.length > 3 && !/:$/.test(s) && !/^goals?$/i.test(s)) // skip "GOALS:" headers/labels
    [0]
    ?? r.storyId ?? 'Crew mission';
  const name = `${opts.titlePrefix ?? '[Crew]'} ${firstGoal}`.slice(0, 120);
  const officers = (r.contributions ?? []).map((c) => c.crewId).join(', ');
  const cost = r.efficiency?.totalCostUSD;
  const description = [
    (r.missionPlan ?? '').slice(0, 1500),
    '',
    `— Crew: ${officers || 'n/a'}${r.topModel ? ` · top model: ${r.topModel}` : ''}${cost != null ? ` · cost ~$${cost}` : ''}`,
    `(auto-drafted by the crew status feed; the Aha write is WorfGate-gated — dry-run unless confirmed)`,
  ].join('\n');
  return { name, description };
}

/**
 * Sync a crew result to Aha! as a story. DRY-RUN unless confirm:true (reuses the governed
 * executeAhaStoryWithMemory — identity-verified executor, audited, RAG-remembered).
 */
export async function syncCrewResultToAha(
  r: CrewResultLike,
  opts: { releaseId: string; executor?: string; clientId?: string | null; confirm?: boolean; titlePrefix?: string },
) {
  const draft = crewResultToAhaDraft(r, { titlePrefix: opts.titlePrefix });
  const executor = opts.executor ?? 'riker'; // Riker owns story creation (under Worf's gate)
  // TRUE dry-run: when not confirmed, return the draft WITHOUT touching the write path. (The governed
  // executeAhaStoryWithMemory honors WorfGate auto-mode, which can auto-approve a low-risk create even
  // with confirm=false — so a real preview must short-circuit BEFORE calling it.)
  if (opts.confirm !== true) {
    return { dryRun: true, draft, releaseId: opts.releaseId, executor, note: 'No write performed. Re-call with confirm:true to create in Aha (then subject to WorfGate auto-mode).' };
  }
  return executeAhaStoryWithMemory({
    story: draft,
    executor,
    releaseId: opts.releaseId,
    clientId: opts.clientId ?? null,
    confirm: true,
  });
}
