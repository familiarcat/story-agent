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

export interface PlanThenExecuteResult {
  task: string;
  plan: { missionPlan: string; costUSD: number; topModel: string };
  run: AgentRunResult;
}

export async function planThenExecute(
  task: string,
  opts: { workspace?: string; clientId?: string | null; maxIterations?: number; tier?: number } = {},
): Promise<PlanThenExecuteResult> {
  // Step 1 — crew deliberates a plan (frugal by default).
  const mission = await runMissionPipeline(task);

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

  return {
    task,
    plan: { missionPlan: mission.missionPlan, costUSD: mission.efficiency.totalCostUSD, topModel: mission.topModel },
    run,
  };
}
