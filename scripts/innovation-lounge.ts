import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runInnovationLounge, formatInnovationLoungeAsMarkdown } from '../packages/mcp-server/src/lib/innovation-lounge.js';
import { storeCrewPersonalMemory, storeObservationMemory } from '../packages/shared/src/db.js';

/**
 * Innovation Lounge runner — the crew creatively jams, debates, and resolves a portfolio.
 *
 *   npx tsx scripts/innovation-lounge.ts ["optional theme / arena"]
 *
 * Each of the 11 crew members pitches an original project in their canonical persona, every member
 * debates the slate, and Picard resolves what the firm pursues. Pitches + synthesis store to RAG;
 * a documented markdown artifact lands in docs/observation-lounge/.
 */
(async () => {
  const theme = process.argv.slice(2).join(' ').trim() || undefined;
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`INNOVATION LOUNGE — CREW CREATIVE JAM`);
  if (theme) console.log(`Arena: ${theme}`);
  console.log(`${'═'.repeat(80)}\n`);

  const result = await runInnovationLounge({ theme, deps: { storeCrewPersonalMemory, storeObservationMemory } });

  for (const p of result.pitches) {
    console.log(`💡 ${p.fullName} → "${p.projectName}" [${p.model}]`);
    console.log(`   ${p.elevatorPitch.replace(/\n/g, ' ').slice(0, 160)}`);
  }
  console.log(`\n${'─'.repeat(80)}\n[PICARD — RESOLUTION]\n${result.synthesis}\n`);
  console.log(`Pursue now: ${result.portfolio.pursueNow.join(' | ') || '(none named)'}`);
  console.log(`Cost: $${result.efficiency.totalCostUSD.toFixed(4)} · ${result.efficiency.totalTokens} tokens · obs=${result.observationMemoryId ?? 'n/a'}`);

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const path = `docs/observation-lounge/innovation-lounge-${stamp}.md`;
  writeFileSync(path, formatInnovationLoungeAsMarkdown(result));
  console.log(`\n📄 ${path}`);
  process.exit(0);
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
