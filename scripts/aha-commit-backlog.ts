/**
 * Commit a crew-derived backlog into Aha! via the governed loop (agree→RAG → Aha create → result→RAG).
 *
 * USER-RUN (your terminal = your identity, no per-write blocking). Each story:
 *   - stores the crew's agreement to RAG memory,
 *   - identity-verified + confirm-gated Aha! create-feature in the target release,
 *   - stores the execution result (Aha! ref) back to RAG.
 *
 * Usage:
 *   zsh -ic 'npx tsx scripts/aha-commit-backlog.ts <releaseId> [--dry-run] [--executor=riker] [--client=familiarcat]'
 *
 * Stories: edit BACKLOG below, or pipe from `pnpm run aha:derive-backlog`. Defaults to a small
 * curated set so nothing unreviewed lands in your PM system by accident.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { executeAhaStoryWithMemory } from '../packages/mcp-server/src/lib/crew-aha-mission.js';

// Self-load the crew secrets (AHA_*, CREW_LLM_*, SUPABASE_*) so this runs without a `zsh -i`
// wrapper — keeps the allowlisted command stable. Only fills vars not already in the env.
function loadSecrets(): void {
  try {
    const raw = readFileSync(join(process.env.HOME || '', '.alexai-secrets/api-keys.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*export\s+([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      if (!/^(AHA_|CREW_LLM_|SUPABASE_|REDIS_)/.test(key)) continue;
      if (process.env[key]) continue;
      let val = m[2].trim().replace(/^["']|["']$/g, '');
      // Resolve a single level of $VAR references (e.g. SUPABASE_KEY="$SUPABASE_SERVICE_ROLE_KEY").
      val = val.replace(/^\$(\w+)$/, (_s, v) => process.env[v] ?? '');
      process.env[key] = val;
    }
  } catch { /* env may already be populated by the shell; ignore */ }
}
loadSecrets();

const args = process.argv.slice(2);
const releaseId = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const executor = (args.find(a => a.startsWith('--executor=')) ?? '--executor=riker').split('=')[1];
const clientId = (args.find(a => a.startsWith('--client=')) ?? '--client=').split('=')[1] || null;

// Curated default backlog (review/replace before committing to a real workspace).
const BACKLOG: Array<{ name: string; description: string }> = [
  { name: 'Crew Member Skill Registry & Dispatch', description: 'Skill manifest per crew member + dispatcher routing tasks by skill match/availability.' },
  { name: 'Crew Memory Isolation & Sync', description: 'Per-crew-member RAG memory buckets + sync so members query their own context during execution.' },
];

async function main() {
  if (!releaseId) {
    console.error('Usage: aha-commit-backlog.ts <releaseId> [--dry-run] [--executor=riker] [--client=familiarcat]');
    process.exit(1);
  }
  console.log(`Committing ${BACKLOG.length} stories → release ${releaseId} as ${executor}${dryRun ? ' (DRY-RUN)' : ' (LIVE)'}\n`);
  for (const story of BACKLOG) {
    const r = await executeAhaStoryWithMemory({ executor, releaseId, story, clientId, confirm: !dryRun });
    console.log(`• ${story.name}`);
    for (const line of r.audit) console.log(`    ${line}`);
    if (r.ahaRef) console.log(`    → Aha! ${r.ahaRef}`);
  }
  console.log('\n✅ Done. Agreements + results stored in RAG; recall later via the aha:recall tool.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
