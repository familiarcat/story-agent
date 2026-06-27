#!/usr/bin/env node
/**
 * story-agent CLI — the terminal surface over agent-core.
 *
 * Usage:
 *   story-agent "fix the failing test in foo.ts"   # one-shot
 *   story-agent                                     # interactive REPL
 *   echo "..." | story-agent -                      # read task from stdin
 *   story-agent --json "..."                        # NDJSON event stream (live orchestrator feedback)
 *
 * Env: CREW_LLM_APPROVED_KEY/URL (OpenRouter). Runs in the current directory as the workspace.
 *      STORY_AGENT_EVENTS_JSON=1 is equivalent to passing --json.
 */
import 'dotenv/config';
import readline from 'readline';
import { runAgentLoop, type AgentEvent } from './loop.js';
import { buildBridges } from './bridges.js';

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const tierColor = (t?: string) => (t === 'green' ? C.green : t === 'yellow' ? C.yellow : C.red)(t ?? '?');

/**
 * NDJSON event mode (`--json` / STORY_AGENT_EVENTS_JSON=1): emit ONE parseable line per event to
 * stdout so an orchestrator (Claude Code, or any supervisor) gets LIVE crew feedback by tailing the
 * stream — instead of a silent buffer that only surfaces on exit. Each line is a self-contained
 * AgentEvent; the run ends with a final {type:'summary',...} line. This is the fix for "the loop
 * does not give feedback from the OpenRouter crew to the orchestrator."
 */
const JSON_EVENTS = process.env.STORY_AGENT_EVENTS_JSON === '1' || process.argv.includes('--json');

function emitJsonLine(obj: unknown) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function printEvent(e: AgentEvent) {
  if (JSON_EVENTS) { emitJsonLine(e); return; }
  switch (e.type) {
    case 'model': process.stderr.write(C.dim(`◇ model: ${e.model}\n`)); break;
    case 'tool_call': process.stderr.write(C.cyan(`→ ${e.tool} `) + C.dim(JSON.stringify(e.args).slice(0, 120) + '\n')); break;
    case 'gate': process.stderr.write(C.dim(`  ⛨ WorfGate ${tierColor(e.tier)}`) + (e.remediations?.length ? C.yellow(` [${e.remediations.join('; ')}]`) : '') + '\n'); break;
    case 'tool_result': process.stderr.write(C.dim(`  ✓ ${e.tool}\n`)); break;
    case 'escalation': process.stderr.write(C.red(`  ⚑ escalation: ${e.text}\n`)); break;
    case 'stall': process.stderr.write(C.yellow(`  ↻ ${e.text}\n`)); break;
    case 'text': if (e.text?.trim()) process.stdout.write(e.text + '\n'); break;
  }
}

async function runOnce(task: string, clientId: string | null) {
  const bridges = buildBridges(clientId);
  const res = await runAgentLoop(task, { workspace: process.cwd(), clientId, onEvent: printEvent, ...bridges });
  if (JSON_EVENTS) {
    emitJsonLine({
      type: 'summary', model: res.model, iterations: res.iterations, tools: res.toolCalls.length,
      costUSD: res.totalCostUSD, tokens: res.totalTokens, escalated: res.escalated,
      budgetExceeded: res.budgetExceeded, stalled: res.stalled,
    });
  } else {
    process.stderr.write(
      C.dim(`\n── ${res.model} · ${res.iterations} turns · ${res.toolCalls.length} tools · ` +
        `$${res.totalCostUSD.toFixed(5)} · ${res.totalTokens} tok` +
        (res.escalated ? ' · escalated' : '') + (res.budgetExceeded ? ' · budget-capped' : '') + '\n'),
    );
  }
  return res;
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--json');
  const clientId = process.env.STORY_AGENT_CLIENT_ID || null;

  // stdin mode
  if (args[0] === '-') {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    await runOnce(Buffer.concat(chunks).toString('utf8').trim(), clientId);
    return;
  }

  // one-shot
  if (args.length) {
    await runOnce(args.join(' '), clientId);
    return;
  }

  // interactive REPL
  process.stderr.write(C.bold('Story Agent') + C.dim(` — autonomous coding assistant (OpenRouter crew). Workspace: ${process.cwd()}\n`));
  process.stderr.write(C.dim('Type a task, or /exit to quit.\n\n'));
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr, prompt: C.cyan('story-agent› ') });
  rl.prompt();
  for await (const line of rl) {
    const task = line.trim();
    if (!task) { rl.prompt(); continue; }
    if (task === '/exit' || task === '/quit') break;
    try { await runOnce(task, clientId); }
    catch (e: any) { process.stderr.write(C.red(`error: ${e?.message || e}\n`)); }
    rl.prompt();
  }
  rl.close();
}

main().catch(e => { process.stderr.write(`fatal: ${e?.message || e}\n`); process.exit(1); });
