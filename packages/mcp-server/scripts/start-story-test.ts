import 'dotenv/config';
import { startStoryWithBranch } from '../src/lib/crew-story-lifecycle.js';
const RELEASE = '7653544791955635770'; // PROD (Story Agent) / Parking lot
(async () => {
  const r = await startStoryWithBranch({
    name: 'Git↔Aha branch lifecycle automation',
    description: 'crew_start_story: create an Aha story + its matching git branch in sync (story/<REF>-<slug>, from main, never force). End-to-end test of the Aha integration.',
    releaseId: RELEASE, executor: 'riker', confirm: true, push: true, cwd: process.cwd(),
  });
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
