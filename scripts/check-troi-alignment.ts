import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Strategic script to check if Counselor Troi has completed 
 * the UI alignment analysis for Mission VSCODE-CLI-003.
 */
async function checkTroiAlignment() {
  const storyId = 'VSCODE-CLI-003';
  console.log(`🔍 [BRIDGE] Checking UI alignment status for Mission: ${storyId}...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('transcript')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const transcript = data?.transcript as any;
  const troiEntry = transcript?.rounds?.flatMap((r: any) => r.entries).find((e: any) => e.speakerId === 'troi');

  if (troiEntry) {
    console.log(`✅ [BRIDGE] Counselor Troi's Analysis Found:`);
    console.log(`Statement: ${troiEntry.statement}`);
    console.log(`Evidence: ${troiEntry.evidence?.join(', ')}`);
  } else {
    console.log(`📭 [BRIDGE] Mission log found for ${storyId}, but Counselor Troi has not yet submitted her formal alignment read.`);
  }
}

checkTroiAlignment().catch(console.error);