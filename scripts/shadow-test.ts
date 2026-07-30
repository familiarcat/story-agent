/**
 * Shadow test — is Story Agent (OpenRouter agent-core) ready to be the PRIMARY code assistant?
 *
 * Runs the SAME agent-core loop on the SAME task twice, changing only the model:
 *   Lane A — Story Agent candidate  → Quark tier-3 (deepseek, OpenRouter)
 *   Lane B — control (to retire)    → tier-4 (anthropic/* via the pool)
 *
 * Drives the loop through the already-built, running `/agent` SSE endpoint (default :3103) rather
 * than importing runAgentLoop under tsx — the loop's transitive `@story-agent/shared/*` package
 * imports only resolve from built dist, so HTTP is the correct harness. Each run happens in an
 * isolated git WORKTREE (never touches the working tree), with the pnpm node_modules symlinked in
 * so the loop's scoped `tsc` verify works. The `done` SSE event carries the full AgentRunResult;
 * we classify outcome (clean / self-corrected / rolled-back), aggregate a delta table, apply the
 * documented GO/NO-GO rule, and store the verdict to RAG.
 *
 * Spec: docs/crew/shadow-test-primary.md.
 * Prereq: `pnpm run mcp` (agent on :3103).  Run: `npx tsx scripts/shadow-test.ts [--tasks N]`
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storeObservationMemory } from '../packages/shared/src/db.js';

const REPO = process.cwd();
const AGENT = process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103';
const git = (args: string[], cwd = REPO) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** Multi-file stressor corpus (safe: each runs in a throwaway worktree). Ordered simplest-first. */
const CORPUS: Array<{ id: string; prompt: string }> = [
  {
    id: 'doc-comment',
    prompt:
      'In packages/mcp-server/src/agent-core/tools.ts, add a one-line JSDoc `/** ... */` comment above the `list_dir` tool describing what it does. Then run `pnpm --filter @story-agent/mcp-server run build` and report DONE only if it compiles.',
  },
  {
    id: 'thread-option',
    prompt:
      'Add an optional boolean field `verbose?: boolean` (with a JSDoc comment) to the RunAgentOptions interface in packages/mcp-server/src/agent-core/loop.ts, without using it yet. Keep the diff minimal, then run `pnpm --filter @story-agent/mcp-server run build` and report DONE only if it compiles.',
  },
  {
    id: 'cross-file-const',
    prompt:
      'In packages/shared/src/ui-tokens.ts add and export a new constant `export const SHADOW_TEST_MARKER = "shadow" as const;`. Then run `pnpm --filter @story-agent/shared run build` and report DONE only if it compiles.',
  },
];

const LANES = [
  { lane: 'A', label: 'Story Agent (tier-3)', tier: 3 },
  { lane: 'B', label: 'control (tier-4)', tier: 4 },
] as const;

type Outcome = 'clean' | 'self-corrected' | 'rolled-back' | 'error';
interface AgentResult { model?: string; iterations?: number; stalled?: boolean; escalated?: boolean; totalCostUSD?: number; verifyFailed?: boolean; rolledBack?: boolean; }
interface Row {
  taskId: string; lane: string; model: string; outcome: Outcome;
  autoRecovered: boolean; iterations: number; stalled: boolean; escalated: boolean;
  costUSD: number; wallMs: number;
}

function classify(r: AgentResult): Outcome {
  if (r.rolledBack) return 'rolled-back';
  if (r.verifyFailed) return 'self-corrected';
  return 'clean';
}

/** Create an isolated worktree at HEAD with node_modules symlinked so the loop's tsc verify works. */
function makeWorktree(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `shadow-${tag}-`));
  git(['worktree', 'add', '--detach', dir, 'HEAD']);
  const linkNM = (rel: string) => {
    const src = join(REPO, rel, 'node_modules');
    const dst = join(dir, rel, 'node_modules');
    if (existsSync(src) && !existsSync(dst)) { try { symlinkSync(src, dst, 'dir'); } catch {} }
  };
  linkNM('');
  for (const pkg of ['packages/shared', 'packages/mcp-server', 'packages/ui', 'packages/vscode-extension']) linkNM(pkg);
  return dir;
}
function removeWorktree(dir: string) {
  try { git(['worktree', 'remove', '--force', dir]); } catch { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
}

/** POST to /agent, read the SSE stream, return the payload of the final `done` event. */
async function dispatchAgent(input: string, workspace: string, tier: number): Promise<AgentResult> {
  const resp = await fetch(`${AGENT}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, workspace, tier, clientId: 'familiarcat', toolPolicy: 'full' }),
  });
  if (!resp.ok || !resp.body) throw new Error(`/agent HTTP ${resp.status}`);
  const text = await resp.text();
  // SSE blocks are "event: <type>\ndata: <json>\n\n". Find the last block whose payload looks final.
  let result: AgentResult | null = null;
  for (const block of text.split('\n\n')) {
    const isDone = /(^|\n)event:\s*done/.test(block);
    const m = block.match(/(?:^|\n)data:\s*(\{[\s\S]*\})\s*$/);
    if (!m) continue;
    try {
      const obj = JSON.parse(m[1]);
      if (isDone || 'iterations' in obj || 'finalText' in obj) result = obj;
    } catch { /* skip non-JSON data lines */ }
  }
  if (!result) throw new Error('no done event in SSE stream');
  return result;
}

async function runLaneTask(taskId: string, prompt: string, lane: typeof LANES[number]): Promise<Row> {
  const dir = makeWorktree(`${taskId}-${lane.lane}`);
  const startedAt = Date.now();
  try {
    const r = await dispatchAgent(prompt, dir, lane.tier);
    return {
      taskId, lane: lane.lane, model: r.model ?? 'unknown', outcome: classify(r), autoRecovered: !r.rolledBack,
      iterations: r.iterations ?? 0, stalled: !!r.stalled, escalated: !!r.escalated,
      costUSD: Number((r.totalCostUSD ?? 0).toFixed(6)), wallMs: Date.now() - startedAt,
    };
  } catch {
    return { taskId, lane: lane.lane, model: 'error', outcome: 'error', autoRecovered: false,
      iterations: 0, stalled: true, escalated: false, costUSD: 0, wallMs: Date.now() - startedAt };
  } finally {
    removeWorktree(dir);
  }
}

function agg(rows: Row[], lane: string) {
  const r = rows.filter(x => x.lane === lane);
  const n = r.length || 1;
  const recovered = r.filter(x => x.autoRecovered && x.outcome !== 'error').length;
  const correct = r.filter(x => x.outcome === 'clean' || x.outcome === 'self-corrected').length;
  const cost = r.reduce((s, x) => s + x.costUSD, 0);
  return { n: r.length, autoRecovery: recovered / n, correctness: correct / n, totalCost: cost, avgCost: cost / n,
    avgTurns: r.reduce((s, x) => s + x.iterations, 0) / n };
}

async function main() {
  const flagVal = process.argv.find(a => a.startsWith('--tasks='))?.split('=')[1]
    ?? (process.argv.includes('--tasks') ? process.argv[process.argv.indexOf('--tasks') + 1] : undefined);
  const nTasks = Number(flagVal ?? CORPUS.length);
  const corpus = CORPUS.slice(0, Math.max(1, Math.min(nTasks, CORPUS.length)));
  const batchId = `shadow-${git(['rev-parse', '--short', 'HEAD'])}-${corpus.length}t`;
  console.log(`\n[shadow-test] batch ${batchId} - ${corpus.length} task(s) x 2 lanes via ${AGENT}/agent\n`);

  const rows: Row[] = [];
  for (const task of corpus) {
    for (const lane of LANES) {
      process.stdout.write(`  ${task.id} - lane ${lane.lane} (${lane.label})... `);
      const row = await runLaneTask(task.id, task.prompt, lane);
      rows.push(row);
      console.log(`${row.outcome} - ${row.model} - ${row.iterations} turns - $${row.costUSD}`);
    }
  }

  const A = agg(rows, 'A'), B = agg(rows, 'B');
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  console.log('\n=== DELTA TABLE ===');
  console.log(`Lane A (candidate): auto-recovery ${pct(A.autoRecovery)} - correctness ${pct(A.correctness)} - $${A.totalCost.toFixed(5)} (avg $${A.avgCost.toFixed(5)}) - ${A.avgTurns.toFixed(1)} turns`);
  console.log(`Lane B (control):   auto-recovery ${pct(B.autoRecovery)} - correctness ${pct(B.correctness)} - $${B.totalCost.toFixed(5)} (avg $${B.avgCost.toFixed(5)}) - ${B.avgTurns.toFixed(1)} turns`);

  const costRatio = B.avgCost > 0 ? A.avgCost / B.avgCost : 0;
  const go = A.autoRecovery >= 0.9 && A.correctness >= B.correctness && (B.avgCost === 0 || costRatio <= 0.8);
  const verdict = go ? 'GO' : 'NO-GO';
  console.log(`\n=== VERDICT: ${verdict} ===`);
  console.log(`- auto-recovery >=90%: ${A.autoRecovery >= 0.9 ? 'PASS' : 'FAIL'} (${pct(A.autoRecovery)})`);
  console.log(`- correctness >= control: ${A.correctness >= B.correctness ? 'PASS' : 'FAIL'} (A ${pct(A.correctness)} vs B ${pct(B.correctness)})`);
  console.log(`- cost <=80% of control: ${(B.avgCost === 0 || costRatio <= 0.8) ? 'PASS' : 'FAIL'} (${B.avgCost ? pct(costRatio) : 'n/a'})`);
  console.log(`\nNOTE: seed batch of ${corpus.length} task(s) - expand CORPUS toward ~10 real multi-file stories for a ratifying run.`);

  await storeObservationMemory({
    storyId: batchId, clientId: 'familiarcat', source: 'mcp',
    transcript: {
      rounds: [{ title: `Shadow test ${batchId}`, entries: rows.map(r => ({ speakerId: r.lane === 'A' ? 'story-agent' : 'control', position: 'support', statement: JSON.stringify(r), evidence: [] })) }],
      consensusSummary: `Shadow ${batchId}: A ${pct(A.autoRecovery)}/${pct(A.correctness)}/$${A.avgCost.toFixed(5)} vs B ${pct(B.autoRecovery)}/${pct(B.correctness)}/$${B.avgCost.toFixed(5)} -> ${verdict}`,
      unresolvedRisks: go ? [] : ['Lane A did not meet all GO criteria on this batch'],
      finalDecision: go ? 'approved' : 'revise',
      actionItems: [],
    },
    tags: ['shadow-test', batchId, 'familiarcat'],
  }).catch(() => {});
  console.log(`\nStored verdict to RAG (tags: shadow-test, ${batchId}).`);
}

main().catch((e) => { console.error('shadow-test failed:', e); process.exit(1); });
