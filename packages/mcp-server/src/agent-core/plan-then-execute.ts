/**
 * plan_then_execute — the single autonomous loop: crew deliberates a plan, then the agent-core loop
 * executes it (file edits + run_shell), then the loop's own self-heal/verify/autoEscalate close the
 * quality gap. Reuses runMissionPipeline (crew plan, frugal via CREW_FRUGAL) + runAgentLoop (WorfGate-
 * governed tool loop) — no new machinery.
 *
 * Plan injection: runAgentLoop has no systemContext param, so the crew's missionPlan is PREPENDED to
 * the agent input (crew ruling). The agent then performs the plan with tools.
 */
import { runMissionPipeline } from '../lib/crew-mission-pipeline.js';
import { runAgentLoop, type AgentRunResult } from './loop.js';
import { buildUnifiedRunRecord, storeUnifiedRun, recallUnifiedRuns, type UnifiedRunRecord } from './unified-run.js';
import { RunRegistry } from './run-registry.js';



export interface PlanThenExecuteResult {
  task: string;
  plan: { missionPlan: string; costUSD: number; topModel: string };
  run: AgentRunResult;
  /** The linked {plan → execution → outcome} record stored to shared RAG (Commodore fabric, phase 1). */
  unifiedRun: UnifiedRunRecord;
  /** Short summaries of prior related runs recalled before planning (connective tissue). */
  priorRuns: string[];
}

export async function planThenExecute(
  task: string,
  opts: { workspace?: string; clientId?: string | null; maxIterations?: number; tier?: number } = {},
): Promise<PlanThenExecuteResult> {
  const startedAt = Date.now();
  const missionId = `ptx-${new Date(startedAt).toISOString()}`;
  RunRegistry.register(missionId, opts.clientId ?? 'anonymous', startedAt);

  try {

  // Step 0 — RECALL prior unified runs (connective tissue: build on past work, don't repeat it).
  const priorRuns = await recallUnifiedRuns(task, opts.clientId ?? null, 5);
  const priorContext = priorRuns.length
    ? `PRIOR RELATED RUNS (from crew RAG — build on these, avoid repeating):\n${priorRuns.map(p => `- ${p}`).join('\n')}\n\n`
    : '';

  // Step 1 — crew deliberates a plan (frugal by default), informed by prior runs.
  const mission = await runMissionPipeline(`${priorContext}TASK: ${task}`, opts.clientId ?? null);

  // Step 2 — inject the plan as context by prepending it to the agent input.
  const input = [
    'CREW MISSION PLAN — execute this now using the available tools:',
    '- run_shell for build/test/install/git; read_file/write_file/edit_file/apply_patch for code.',
    '- Report DONE when finished, or explain what blocked you.',
    '',
    mission.missionPlan,
    '',
    `TASK: ${task}`,
  ].join('\n');

  // Step 3 — the agent-core loop executes the plan (WorfGate-governed, self-healing, verify+rollback).
  const run = await runAgentLoop(input, {
    workspace: opts.workspace,
    clientId: opts.clientId ?? null,
    tier: opts.tier ?? 3,
    maxIterations: opts.maxIterations ?? 20,
  });

  // Step 4 — STORE the linked {plan → execution → outcome} record to shared RAG (the unification).
  const timestamp = new Date(startedAt).toISOString();
  const unifiedRun = buildUnifiedRunRecord({
    missionId,
    clientId: opts.clientId ?? null,
    task,
    plan: { missionPlan: mission.missionPlan, topModel: mission.topModel, costUSD: mission.efficiency.totalCostUSD },
    run,
    timestamp,
  });
  await storeUnifiedRun(unifiedRun);

  return {
    task,
    plan: { missionPlan: mission.missionPlan, costUSD: mission.efficiency.totalCostUSD, topModel: mission.topModel },
    run,
    unifiedRun,
    priorRuns,
  };
} finally {
  RunRegistry.complete(missionId);
}
}
