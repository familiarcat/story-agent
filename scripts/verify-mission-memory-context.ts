import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';
import type { ObservationMemoryRecord } from '../packages/shared/src/index.js';

/**
 * Verification script to check if a mission's execution plan
 * included shared memories from previous missions.
 */
async function verifyMissionMemoryContext(
  missionRef: string,
  clientId: string,
  expectedMemoryRef?: string
) {
  console.log(`🔍 Searching sa_observation_memories for mission: ${missionRef} (Client: ${clientId})...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('*')
    .eq('mission_reference', missionRef)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(`❌ No observation memory found for mission: ${missionRef}.`);
    console.log('   Ensure the engage-sovereign-factory.ts script ran successfully for this mission.');
    process.exit(1);
  }

  const record: ObservationMemoryRecord = data[0] as any;
  console.log(`✅ Observation memory found for ${missionRef} (ID: ${record.id}).`);
  console.log('--------------------------------------------------------');

  if (record.missionPlan && record.missionPlan.sharedMemoryContext) {
    console.log(`📊 Mission Plan includes ${record.missionPlan.sharedMemoryContext.length} shared memories.`);
    const referencedMemories = record.missionPlan.sharedMemoryContext.map(mem => mem.storyId);
    console.log(`   Referenced Story IDs: ${referencedMemories.join(', ')}`);

    if (expectedMemoryRef) {
      if (referencedMemories.includes(expectedMemoryRef)) {
        console.log(`✅ Confirmed: Memories from ${expectedMemoryRef} were referenced during ${missionRef}.`);
      } else {
        console.log(`❌ Warning: Memories from ${expectedMemoryRef} were NOT found in ${missionRef}'s context.`);
      }
    }
  } else {
    console.log('❌ Mission Plan or sharedMemoryContext not found in the record.');
  }
  console.log('--------------------------------------------------------');
}

// Example usage: Verify PCTMS-002 referenced PCTMS-001
verifyMissionMemoryContext('PCTMS-002', process.env.TARGET_CLIENT_ID || 'bayer-int', process.env.TARGET_REPO_FULL_NAME || 'bayer-int/sovereign-todo', 'PCTMS-001').catch(console.error);