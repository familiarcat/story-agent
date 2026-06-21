/**
 * Crew Aha! mission loop — Aha! as the PM system, cloud RAG as the crew's execution memory.
 *
 * Automates the full governed cycle the moment the crew agrees to a story:
 *   1. AGREE   → store the agreed story (+ debate consensus) to the RAG memory (sa_observation_memories).
 *   2. EXECUTE → identity-verified, confirm-gated, audited Aha! write (create the story/feature).
 *   3. RESULT  → store the execution outcome (Aha! ref + status) back to the RAG memory.
 *
 * Both memory writes are durable cloud RAG (Redis-first + sync). The Aha! write is governed by
 * authorizeAhaWrite (agent identity) + confirm. So every story the crew commits to is remembered
 * before AND after execution, and the crew can recall its own track record on later missions.
 */
import { storeObservationMemory } from '@story-agent/shared/db';
import type { ObservationDebateResult } from '@story-agent/shared';
import { resolveAhaCredentials } from '@story-agent/shared/aha-credentials';
import { authorizeAhaWrite, getCrewAhaRole } from './crew-aha-roles.js';
import { gateAhaWrite } from './crew-aha-automode.js';

export interface AhaStory { name: string; description?: string; }

export interface AhaMissionResult {
  storyId: string;
  agreementMemoryId: string;
  resultMemoryId: string;
  executed: boolean;
  ahaRef: string | null;
  audit: string[];
}

async function ahaCreateFeature(releaseId: string, name: string, description?: string): Promise<any> {
  const { domain, apiKey } = await resolveAhaCredentials();
  const resp = await fetch(`https://${domain}/api/v1/releases/${releaseId}/features`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature: { name, description } }),
  });
  if (!resp.ok) throw new Error(`Aha! ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return ((await resp.json()) as any)?.feature;
}

function memory(storyRef: string, summary: string, participants: string[], consensus: string, decisions: string[]): ObservationDebateResult {
  return { storyRef, summary, participants, rounds: [], consensus, decisions } as unknown as ObservationDebateResult;
}

/**
 * Run one agreed story through the governed Aha! + RAG loop.
 * - confirm=false → dry-run the Aha! write (still records agreement + a "planned" result to RAG).
 * - confirm=true  → live Aha! write via the identity-verified executor.
 */
export async function executeAhaStoryWithMemory(input: {
  story: AhaStory;
  executor: string;           // crew member acting (identity-verified)
  releaseId: string;          // Aha! release (sprint) to create the story in
  clientId?: string | null;
  confirm?: boolean;
}): Promise<AhaMissionResult> {
  const audit: string[] = [];
  const storyId = `aha-mission-${input.executor}-${Date.now()}`;
  const role = getCrewAhaRole(input.executor);

  // 1. AGREE → RAG
  const agreement = await storeObservationMemory({
    storyId, clientId: input.clientId ?? null, source: 'mcp',
    transcript: memory(storyId, `Crew agreed to execute: ${input.story.name}`,
      ['picard', 'data', 'riker', 'worf'],
      input.story.description ?? input.story.name,
      [`execute via ${input.executor} (${role?.tier ?? 'crew'})`]),
    tags: ['aha', 'story-agreed', input.executor],
  });
  audit.push(`AGREE → RAG memory ${agreement.id}`);

  // 2. EXECUTE (governed: identity + auto-mode classification + confirm)
  const authz = authorizeAhaWrite(input.executor, 'aha:create-feature');
  const clientTier = (input.clientId ?? '').toLowerCase().includes('bayer') ? 'regulated' : 'enterprise';
  const { proceed, classification } = gateAhaWrite(
    { verb: 'create', resource: 'feature', publishedState: 'draft', agentId: input.executor, clientTier },
    input.confirm,
  );
  let ahaRef: string | null = null;
  let executed = false;
  if (!authz.authorized) {
    audit.push(`EXECUTE ⛔ identity: ${authz.reason}`);
  } else if (classification.decision === 'block') {
    audit.push(`EXECUTE ⛔ auto-mode BLOCK [${classification.rule}]: ${classification.reason}`);
  } else if (!proceed) {
    audit.push(`EXECUTE dry-run (auto-mode=${classification.decision} [${classification.rule}], identity ✅) — needs confirm:true`);
  } else {
    const f = await ahaCreateFeature(input.releaseId, input.story.name, input.story.description);
    ahaRef = f?.reference_num ?? null;
    executed = true;
    audit.push(`EXECUTE ✅ auto-mode=${classification.decision} [AHA-AUDIT] create-feature by ${input.executor} → ${ahaRef}`);
  }

  // 3. RESULT → RAG
  const result = await storeObservationMemory({
    storyId, clientId: input.clientId ?? null, source: 'mcp',
    transcript: memory(storyId, `Execution result: ${input.story.name}`,
      [input.executor],
      executed ? `Created Aha! feature ${ahaRef} (auto-mode ${classification.decision})` : (authz.authorized ? `Not committed (auto-mode ${classification.decision}: ${classification.reason})` : 'Rejected by WorfGate identity check'),
      [executed ? `aha:${ahaRef}` : 'pending', `auto-mode:${classification.decision}:${classification.rule}`]),
    tags: ['aha', 'story-executed', executed ? 'committed' : 'pending', `automode-${classification.decision}`, input.executor],
  });
  audit.push(`RESULT → RAG memory ${result.id}`);

  return { storyId, agreementMemoryId: agreement.id, resultMemoryId: result.id, executed, ahaRef, audit };
}
