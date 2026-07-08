import { readAsyncState, formatAsyncSnapshot } from '../packages/shared/src/async-status.js';

/**
 * `pnpm status` — print a snapshot of all in-flight async work (crew missions, agent-core runs,
 * background jobs) from .claude/async-status.jsonl. Sibling to `pnpm lanes`.
 *
 *   pnpm status            one-shot snapshot
 *   pnpm status --watch    refresh every 2s until Ctrl-C
 *   pnpm status --json     machine-readable
 */
const argv = process.argv.slice(2);
const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const json = argv.includes('--json');
const watch = argv.includes('--watch');

function print() {
  const now = Date.now();
  const entries = readAsyncState(dir, now);
  if (json) { console.log(JSON.stringify(entries, null, 2)); return; }
  const snap = formatAsyncSnapshot(entries, now, { max: 30 });
  if (watch) process.stdout.write('\x1b[2J\x1b[H'); // clear screen
  console.log(snap || '🖖 async status — idle (no in-flight or recent work)');
}

if (watch) {
  print();
  const t = setInterval(print, 2000);
  process.on('SIGINT', () => { clearInterval(t); process.exit(0); });
} else {
  print();
}
