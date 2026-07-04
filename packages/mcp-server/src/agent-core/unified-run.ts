/**
 * Unified run record — the connective tissue of the Commodore fabric (RAG+MCP unification, phase 1).
 *
 * The crew HYPOTHESIZES (runMissionPipeline → mission plan) and EXECUTES (agent-core loop → AgentRunResult)
 * as two engines. This module links them into ONE recallable RAG record — {plan → execution → outcome} —
 * so plan_then_execute can RECALL prior runs before planning and STORE the linked outcome after. That single
 * record is the unification: hypothesize → execute → remember becomes one loop over the shared RAG.
 */
import { storeObservationMemory, getRelevantObservationMemories } from '@story-agent/shared/db';
import type { ObservationDebateResult } from '@story-agent/shared';

export interface UnifiedRunRecord {
  missionId: string;
  clientId: string | null;
  task: string;
  missionPlan: string;
  topModel: string;
  planCostUSD: number;
  outcome: {
    iterations: number;
    toolCalls: number;
    escalated: boolean;
    stalled: boolean;
    totalCostUSD: number;
    finalText: string;
  };
  totalCostUSD: number;
  timestamp: string;
}

/** PURE: assemble the linked record from a mission plan + an agent run. Never throws. */
export function buildUnifiedRunRecord(args: {
  missionId: string;
  clientId?: string | null;
  task: string;
  plan: { missionPlan: string; topModel: string; costUSD: number };
  run: { iterations: number; toolCalls: unknown[]; escalated: boolean; stalled: boolean; totalCostUSD: number; finalText: string };
  timestamp: string;
}): UnifiedRunRecord {
  const planCostUSD = Number(args.plan?.costUSD ?? 0) || 0;
  const runCostUSD = Number(args.run?.totalCostUSD ?? 0) || 0;
  return {
    missionId: args.missionId,
    clientId: args.clientId ?? null,
    task: args.task,
    missionPlan: args.plan?.missionPlan ?? '',
    topModel: args.plan?.topModel ?? '',
    planCostUSD,
    outcome: {
      iterations: args.run?.iterations ?? 0,
      toolCalls: Array.isArray(args.run?.toolCalls) ? args.run.toolCalls.length : 0,
      escalated: !!args.run?.escalated,
      stalled: !!args.run?.stalled,
      totalCostUSD: runCostUSD,
      finalText: (args.run?.finalText ?? '').slice(0, 2000),
    },
    totalCostUSD: Number((planCostUSD + runCostUSD).toFixed(6)),
    timestamp: args.timestamp,
  };
}

/** Wrap the record in the RAG's ObservationDebateResult shape so it stores + recalls uniformly. */
function toTranscript(rec: UnifiedRunRecord): ObservationDebateResult {
  return {
    rounds: [{
      title: `Unified run: ${rec.task}`.slice(0, 200),
      entries: [{ speakerId: 'commodore', position: 'support', statement: JSON.stringify(rec), evidence: [] }],
    }],
    consensusSummary: `${rec.task} — ${rec.outcome.iterations} iters, ${rec.outcome.toolCalls} tool calls, escalated=${rec.outcome.escalated}, stalled=${rec.outcome.stalled}, $${rec.totalCostUSD} (model ${rec.topModel})`,
    unresolvedRisks: rec.outcome.stalled ? ['run stalled — no tools executed'] : [],
    finalDecision: rec.outcome.stalled ? 'revise' : 'approved',
    actionItems: [],
  };
}

/** STORE-after: persist the linked run to shared RAG. Best-effort — never breaks a run. */
export async function storeUnifiedRun(rec: UnifiedRunRecord): Promise<void> {
  try {
    await storeObservationMemory({
      storyId: rec.missionId,
      clientId: rec.clientId,
      source: 'mcp',
      transcript: toTranscript(rec),
      tags: ['unified-run', rec.clientId ?? 'no-client'],
    });
  } catch { /* telemetry is best-effort; a storage failure must not fail the mission */ }
}

/** RECALL-before: short summaries of prior unified runs relevant to a task. Best-effort — returns [] on error. */
export async function recallUnifiedRuns(queryText: string, clientId: string | null, limit = 5): Promise<string[]> {
  try {
    const mems = await getRelevantObservationMemories({ queryText, clientId, limit: limit * 3 });
    return mems
      .filter(m => (m.tags ?? []).includes('unified-run'))
      .slice(0, limit)
      .map(m => m.transcript?.consensusSummary ?? m.storyId);
  } catch {
    return [];
  }
}
