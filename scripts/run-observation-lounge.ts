/**
 * Activate the MCP crew and convene the Observation Lounge.
 *
 * Imports the real crew-lounge orchestrator from the mcp-server package and
 * runs a full self-reflection session. No Supabase required — the lounge path
 * is in-memory and falls back to each crew member's authored voice when no LLM
 * endpoint is configured.
 */
import {
  runObservationLoungeSession,
  formatLoungeSessionAsMarkdown,
} from '../packages/mcp-server/src/lib/crew-lounge.js';
import { getPromptEngineConnectivityDiagnostics } from '../packages/mcp-server/src/lib/prompt-engine.js';
import { writeFileSync, mkdirSync } from 'node:fs';

async function main() {
  const diag = getPromptEngineConnectivityDiagnostics();
  console.log(`\n[ACTIVATION] LLM provider: ${diag.provider} | configured: ${diag.configured} | ${diag.detail}\n`);

  const session = await runObservationLoungeSession({
    sessionLabel: 'Project Status & Next Steps — Owner Briefing',
  });

  const md = formatLoungeSessionAsMarkdown(session);
  mkdirSync('docs/observation-lounge', { recursive: true });
  const path = `docs/observation-lounge/${session.sessionId}.md`;
  writeFileSync(path, md);
  console.log(`\n📄 Session transcript written to ${path}`);
}

main().catch((err) => {
  console.error('Observation Lounge failed:', err);
  process.exit(1);
});
