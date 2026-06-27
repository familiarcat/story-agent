import 'dotenv/config';
import { getRecentObservationMemories } from '@story-agent/shared/db';
import { syncCrewResultToAha } from '../src/lib/crew-aha-sync.js';

const RELEASE = '7653544791955635770'; // PROD (Story Agent) / Parking lot
(async () => {
  const mems = await getRecentObservationMemories(1, 'crew-autonomy', null);
  if (!mems.length) { console.log('no crew-autonomy RAG memory'); process.exit(1); }
  const m = mems[0];
  const contributions = (m.transcript?.rounds?.[0]?.entries ?? []).map((e: any) => ({ crewId: e.speakerId }));
  const result = { goals: m.transcript?.rounds?.[0]?.title ?? 'crew-autonomy', missionPlan: m.transcript?.consensusSummary ?? '', contributions, storyId: 'crew-autonomy' };

  console.log('=== DRY RUN (no write) ===');
  const dry = await syncCrewResultToAha(result, { releaseId: RELEASE, executor: 'riker', confirm: false, titlePrefix: '[Crew]' });
  console.log(JSON.stringify(dry, null, 2).slice(0, 700));

  console.log('\n=== CONFIRMED WRITE (live Aha create) ===');
  const live = await syncCrewResultToAha(result, { releaseId: RELEASE, executor: 'riker', confirm: true, titlePrefix: '[Crew]' });
  console.log(JSON.stringify(live, null, 2).slice(0, 1100));
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
