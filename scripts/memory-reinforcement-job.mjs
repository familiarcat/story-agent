#!/usr/bin/env node
import 'dotenv/config';
import pkg from '../packages/shared/dist/src/db.js';
const { getRecentObservationMemories, storeObservationMemory, updateObservationMemory } = pkg;

// Reinforcement job prototype
// Scans short-term memories (last 24h), counts occurrences by 'signature' (tag+content hash),
// and promotes to long-term when thresholds met. Supports --dry-run (preview) and --confirm (perform writes).

const dryRun = process.argv.includes('--dry-run');
const confirm = process.argv.includes('--confirm');

async function hashSignature(m) {
  // simple signature: tag + first 200 chars
  return `${(m.tags||[]).join(',')}|${(m.content||'').slice(0,200)}`;
}

async function main() {
  console.log('Memory reinforcement job starting (prototype)');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // listObservationMemories: we assume this helper exists in shared/db
  const recent = await getRecentObservationMemories(200);
  console.log(`Found ${recent.length} recent memories`);

  // Filter short-term-tagged
  const shortTerm = recent.filter((m) => (m.tags||[]).includes('short-term') || (m.tags||[]).includes('activation-analysis'));
  const map = new Map();
  for (const m of shortTerm) {
    const sig = `${(m.tags||[]).join(',')}|${(m.transcriptText||'').slice(0,200)}`;
    const v = map.get(sig) || { count: 0, mems: [] };
    v.count += 1;
    v.mems.push(m);
    map.set(sig, v);
  }

  const promotions = [];
  for (const [sig, v] of map.entries()) {
    // threshold: occurrences >= 3 or co-occurrence across 2+ crew members
    const sources = new Set(v.mems.map((x) => x.source || ''));
    const cooccurs = sources.size >= 2;
    if (v.count >= 3 || cooccurs) {
      promotions.push({ sig, count: v.count, mems: v.mems.map((m) => m.id), cooccurs });
    }
  }

  console.log(`Candidates for promotion: ${promotions.length}`);
  if (dryRun) {
    console.log('Dry-run promotions preview:', JSON.stringify(promotions.slice(0,10), null, 2));
    console.log('Run with --confirm to apply promotions.');
    return;
  }

  if (!confirm) {
    console.log('No --confirm flag; aborting without writes. Use --confirm to apply.');
    return;
  }

  for (const p of promotions) {
    // Simple promotion: create a consolidated long-term observation memory
    const title = `Promoted memory (${p.count} hits)`;
    const payload = { storyId: 'memory-promotion', source: 'reinforcement-job', transcript: { promoted: p }, tags: ['long-term', 'promoted'] };
    const res = await storeObservationMemory(payload);
    console.log(`Promoted cluster ${p.sig} -> observation ${res.id}`);
    // Optionally, update original memories with a pointer
    for (const mid of p.mems) {
      try {
        await updateObservationMemory(mid, { promoted_by: res.id });
      } catch (e) {
        console.warn('Failed to update memory', mid, e.message);
      }
    }
  }

  console.log('Reinforcement job complete');
}

main().catch((e) => { console.error(e); process.exit(1); });
