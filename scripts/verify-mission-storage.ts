import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to check if PCTMS-001 mission findings 
 * were successfully stored in the sa_observation_memories table.
 */
async function verifyMissionStorage() {
  const storyRef = 'PCTMS-001';
  const clientId = process.env.TARGET_CLIENT_ID || 'bayer-int';
  console.log(`🔍 Searching sa_observation_memories for mission: ${storyRef}...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('*')
    .eq('story_id', storyRef)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    const record = data[0];
    console.log('✅ Success! Mission findings found in Supabase.');
    console.log('--------------------------------------------------------');
    console.log(`Memory ID:    ${record.id}`);
    console.log(`Stored At:    ${record.created_at}`);
    console.log(`Client ID:    ${record.client_id}`);
    console.log(`Source:       ${record.source}`);
    console.log(`Tags:         ${record.tags?.join(', ')}`);
    console.log(`Has Plan:     ${record.mission_plan ? 'Yes' : 'No'}`);
    console.log(`Has Debate:   ${record.transcript ? 'Yes' : 'No'}`);
    console.log('--------------------------------------------------------');
  } else {
    console.log(`❌ No records found for story_id: ${storyRef}. Verify the mission script ran successfully.`);
  }
}

verifyMissionStorage().catch(console.error);