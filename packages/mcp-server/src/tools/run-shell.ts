import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { gateLocalOp, isInsideWorkspace, type WorfTier } from '../agent-core/worfgate-local.js';
import { planThenExecute } from '../agent-core/plan-then-execute.js';
import { storeObservationMemory } from '@story-agent/shared/db';

const pexec = promisify(execFile);
const clip = (s: string, n = 8000) => (s.length > n ? s.slice(0, n) + `\n… [clipped ${s.length - n} chars]` : s);

export interface ShellResult {
  stdout: string; stderr: string; exitCode: number; durationMs: number;
  tier: WorfTier; blocked: boolean; reason?: string; remediations: string[];
}

/**
 * Governed shell execution (core — testable). Passes the command through the WorfGate local governor:
 * green → run, yellow → run BOUNDED (surface tier + remediations), red → BLOCK. cwd is clamped into the
 * workspace. On a non-zero exit, a failure summary is stored to RAG. Reuses gateLocalOp (no new governor).
 */
export async function runShellGoverned(args: {
  command: string; cwd?: string; timeoutMs?: number; reason: string; workspace?: string;
}): Promise<ShellResult> {
  const workspace = args.workspace || process.env.STORY_AGENT_WORKSPACE || process.cwd();
  const gate = gateLocalOp('run_shell', { command: args.command }, workspace);
  if (!gate.proceed) {
    return { stdout: '', stderr: '', exitCode: -1, durationMs: 0, tier: gate.tier, blocked: true, reason: `WorfGate ${gate.tier}: ${gate.reasons.join('; ')}`, remediations: gate.remediations };
  }
  let cwd = workspace;
  if (args.cwd) { const r = path.resolve(workspace, args.cwd); cwd = isInsideWorkspace(r, workspace) ? r : workspace; }

  const start = Date.now();
  try {
    const { stdout, stderr } = await pexec('bash', ['-lc', args.command], { cwd, timeout: args.timeoutMs ?? 30_000, maxBuffer: 16 * 1024 * 1024 });
    return { stdout: clip(stdout), stderr: clip(stderr), exitCode: 0, durationMs: Date.now() - start, tier: gate.tier, blocked: false, remediations: gate.remediations };
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const exitCode = typeof e?.code === 'number' ? e.code : 1;
    const stderr = clip(`${e?.stderr ?? ''}${e?.message ? `\n${e.message}` : ''}`);
    const res: ShellResult = { stdout: clip(e?.stdout ?? ''), stderr, exitCode, durationMs: Date.now() - start, tier: gate.tier, blocked: false, remediations: gate.remediations };
    try {
      await storeObservationMemory({
        storyId: 'RUN-SHELL', source: 'mcp',
        transcript: { rounds: [{ title: 'run_shell failure', entries: [] }], consensusSummary: `$ ${args.command}\nreason: ${args.reason}\nexit ${exitCode}\n${stderr.slice(0, 500)}`, unresolvedRisks: [`shell command failed (exit ${exitCode})`], finalDecision: 'revise', actionItems: [] },
        tags: ['run_shell', 'failure'],
      });
    } catch { /* failure-memory is best-effort */ }
    return res;
  }
}

export function registerRunShellTool(server: McpServer): void {
  server.tool(
    'run_shell',
    'Run a shell command in the workspace under the WorfGate governor (green=run, yellow=bounded, red=BLOCKED). Use for build/test/install/git. cwd is clamped to the workspace; a failing command records a RAG failure memory. Returns {stdout, stderr, exitCode, durationMs, tier}.',
    {
      command: z.string().describe('Shell command to run.'),
      cwd: z.string().optional().describe('Working dir (clamped into the workspace). Default: workspace root.'),
      timeoutMs: z.number().optional().describe('Timeout in ms (default 30000).'),
      reason: z.string().describe('Why this command runs — for the WorfGate audit.'),
    },
    async ({ command, cwd, timeoutMs, reason }) => {
      const r = await runShellGoverned({ command, cwd, timeoutMs, reason });
      return { isError: r.blocked, content: [{ type: 'text' as const, text: JSON.stringify(r, null, 2) }] };
    }
  );
}

export function registerPlanThenExecuteTool(server: McpServer): void {
  server.tool(
    'plan_then_execute',
    'Autonomous loop: the crew deliberates a plan (runMissionPipeline), then the agent-core loop EXECUTES it (file edits + run_shell), WorfGate-governed. Returns the plan + the AgentRunResult. Long-running (bounded by maxIterations). Use for multi-step coding tasks stated in natural language.',
    {
      task: z.string().describe('The natural-language task to plan + execute.'),
      maxIterations: z.number().optional().describe('Agent-loop iteration cap (default 12).'),
      clientId: z.string().optional(),
    },
    async ({ task, maxIterations, clientId }) => {
      const r = await planThenExecute(task, { maxIterations: maxIterations ?? 12, clientId: clientId ?? null });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          task: r.task,
          plan: r.plan,
          run: { finalText: r.run.finalText, iterations: r.run.iterations, toolCalls: r.run.toolCalls.map(t => ({ tool: t.tool, tier: t.tier, ok: t.ok })), model: r.run.model, totalCostUSD: r.run.totalCostUSD, escalated: r.run.escalated, stalled: r.run.stalled, verifyFailed: r.run.verifyFailed, rolledBack: r.run.rolledBack },
        }, null, 2) }],
      };
    }
  );
}
