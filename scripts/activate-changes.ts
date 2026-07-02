/**
 * `pnpm activate` — one-shot "make code changes live" sequence.
 *
 * Automates the recurring post-change ritual we did by hand all session: build the packages whose
 * dist the running services import, guard the token→CSS contract, refresh the control-lane marker,
 * then print the one step that MUST stay human — reconnecting the Claude Code MCP so it loads the
 * new dist (a live stdio connection can't restart itself from inside a tool call).
 *
 *   pnpm activate           # build shared + mcp-server, tokens:check, refresh lanes marker
 *   pnpm activate --full    # also build ui + vscode-extension
 *
 * Fail-fast: a failing build/check aborts (non-zero exit) so nothing "activates" on a broken tree.
 */
import { execSync } from 'node:child_process';

const full = process.argv.includes('--full');

const steps: Array<[string, string]> = [
  ['build @story-agent/shared', 'pnpm --filter @story-agent/shared build'],
  ['build @story-agent/mcp-server', 'pnpm --filter @story-agent/mcp-server build'],
  ...(full
    ? ([
        ['build @story-agent/ui', 'pnpm --filter @story-agent/ui build'],
        ['build story-agent-vscode', 'pnpm --filter story-agent-vscode build'],
      ] as Array<[string, string]>)
    : ([['typecheck @story-agent/ui', 'pnpm --filter @story-agent/ui typecheck']] as Array<[string, string]>)),
  ['tokens ↔ globals.css drift guard', 'pnpm tokens:check'],
  ['refresh control-lane marker', 'pnpm lanes'],
];

console.log(`\n⚙️  activate-changes — ${steps.length} steps${full ? ' (full)' : ''}\n`);
for (const [label, cmd] of steps) {
  console.log(`\n▶ ${label}\n  $ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`\n❌ step failed: ${label} — aborting activation (tree not changed-live).`);
    process.exit(1);
  }
}

console.log(`
✅ Build artifacts refreshed. Changes are compiled into dist/.

⚠️  ONE human step remains — reload the live MCP connection so it picks up the new dist:
   • Claude Code:   run  /mcp   → reconnect the "story-agent" server
   • Standalone:    restart  pnpm mcp   (or  pnpm dev  for the full stack)
   (A live stdio MCP connection can't restart itself from inside a tool call.)
`);
