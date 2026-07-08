/**
 * Claude Code UserPromptSubmit hook — automatic delegation steer.
 *
 * Wired in .claude/settings.json. On every prompt the user submits, this reads the prompt from
 * stdin, runs the pure {@link scoreDelegation} algorithm (no network, instant), and — when the
 * prompt scores DELEGATE — prints a steer to stdout. Claude Code injects a UserPromptSubmit hook's
 * stdout into the session as context, so the orchestrator is reminded, per the dogfooding mandate,
 * to route the substantive work to the cheap OpenRouter crew instead of reasoning natively.
 *
 * It never makes a network call and never blocks meaningfully, so it adds no per-prompt cost or
 * latency. For NATIVE prompts it stays silent (no context noise). Every decision is appended to a
 * local audit log WITHOUT the prompt text (Worf: no prompt leakage) for verified-savings tracking.
 */
import { appendFileSync } from 'node:fs';
import { scoreDelegation } from './delegation-router.js';
import { readLedger, summarizeLanes, writeStatusMarker } from './control-lane.js';
import { readAsyncState, formatAsyncSnapshot, pruneAsyncLog } from './async-status.js';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    // If nothing is piped, don't hang the prompt.
    setTimeout(() => resolve(data), 250).unref?.();
  });
}

async function main() {
  const raw = await readStdin();
  let prompt = '';
  try {
    const j = JSON.parse(raw);
    prompt = j.prompt ?? j.user_prompt ?? j.message ?? '';
  } catch {
    prompt = raw; // tolerate plain-text stdin
  }
  if (!prompt.trim()) process.exit(0);

  const d = scoreDelegation(prompt);

  // Audit (no prompt content) — best-effort, never throws into the prompt path.
  try {
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    appendFileSync(
      `${dir}/.claude/delegation-audit.jsonl`,
      JSON.stringify({
        route: d.route, mode: d.mode, tier: d.tier, complexity: d.complexity,
        confidence: d.confidence, savingsUSD: d.savingsUSD, tokens: d.signals.estTokens,
      }) + '\n'
    );
    // Refresh the control-lane marker so any AI tool/UI can show the current lane + cost split.
    writeStatusMarker(dir, summarizeLanes(readLedger(dir)), new Date().toISOString());
  } catch { /* ignore */ }

  // Async status: on EVERY prompt, surface a compact progress report of all in-flight async work
  // (crew missions, agent-core runs, background jobs) so "update responses" are visible as they
  // execute. Silent when nothing is in-flight/recent, so quiet sessions stay quiet. Best-effort.
  try {
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const now = Date.now();
    pruneAsyncLog(dir, now);
    const snapshot = formatAsyncSnapshot(readAsyncState(dir, now), now);
    if (snapshot) process.stdout.write(snapshot + '\n');
  } catch { /* ignore */ }

  if (d.route === 'delegate') {
    const tool = d.mode === 'agent'
      ? 'the agent-core loop (story-agent CLI or the /agent SSE endpoint)'
      : 'runMissionPipeline / run_crew_mission_pipeline (a frugal crew deliberation)';
    process.stdout.write(
      `[delegation-router] This prompt scored DELEGATE — complexity ${d.complexity}, tier ${d.tier}, ` +
      `est. savings $${d.savingsUSD.toFixed(4)} vs native (confidence ${d.confidence}). ` +
      `Per the dogfooding mandate, route the substantive work to the OpenRouter crew via ${tool}, ` +
      `act as the THIN orchestrator (dispatch + verify), and store the result to RAG. ` +
      `Reason: ${d.reason}\n`
    );
  }
  // NATIVE ⇒ silent.
  process.exit(0);
}

main().then(() => process.exit(0)).catch(() => process.exit(0)); // never block the prompt on a hook error
