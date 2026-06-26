import 'dotenv/config';
import { getRelevantObservationMemories, embeddingSource } from '../packages/shared/src/db.js';

/** Confirm the agent-core self-learning feedback cards are landing in cloud RAG. */
(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'agent run worfgate tier unclassified tool feedback card',
    clientId: null,
    limit: 8,
  });
  const cards = mems.filter(m => m.missionReference === 'agent-run' || m.storyId === 'agent-run');
  console.log(`emb=${embeddingSource()} recalled=${mems.length} agent-run-cards=${cards.length}`);
  for (const c of cards.slice(0, 3)) {
    console.log(`  • [${c.missionReference ?? c.storyId}] ${(c.transcript?.consensusSummary ?? '').slice(0, 140)}`);
  }
})().catch(e => { console.error('FATAL', e?.message || e); process.exit(1); });
