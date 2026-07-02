/**
 * Control-lane reporter — `pnpm lanes`. Shows when the OpenRouter CREW is driving vs when ANTHROPIC
 * (Claude Code) is orchestrating, from the Worf-safe ledger (.claude/delegation-audit.jsonl).
 * Also refreshes the machine-readable marker (.claude/control-lane-status.json) any tool/UI can read.
 *
 *   pnpm lanes          → print the summary + headline
 *   pnpm lanes --json   → emit the status marker as JSON
 */
import { readLedger, summarizeLanes, laneBanner, buildStatusMarker, writeStatusMarker, statusPath } from '../packages/shared/src/control-lane.js';

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const now = new Date().toISOString();
const summary = summarizeLanes(readLedger(dir));
writeStatusMarker(dir, summary, now);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(buildStatusMarker(summary, now), null, 2) + '\n');
} else {
  console.log('');
  console.log('  ' + laneBanner(summary));
  console.log('  ' + '─'.repeat(72));
  console.log(`  🖖 CREW      decisions=${summary.crew.decisions}  actual-runs=${summary.crew.actualRuns}  actual=$${summary.crew.actualCostUSD.toFixed(4)}  est-saved=$${summary.cumulativeSavingsUSD.toFixed(4)}`);
  console.log(`  🅰️  ANTHROPIC decisions=${summary.anthropic.decisions}  (native orchestration turns)`);
  console.log(`  📊 delegation rate: ${summary.delegationRatePct}%   ·   current lane: ${summary.currentLane ?? '—'}`);
  console.log('  ' + '─'.repeat(72));
  console.log(`  marker: ${statusPath(dir)}`);
  console.log('');
}
