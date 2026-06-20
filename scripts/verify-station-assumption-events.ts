import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to check the sa_observation_memories table for
 * 'station-assumption' events, recorded when a crew member energizes their
 * console in the VS Code IDE.
 */
async function verifyStationAssumptionEvents() {
  console.log('🔍 [BRIDGE] Auditing sa_observation_memories for "station-assumption" events...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('id, created_at, tags, transcript')
    .contains('tags', ['station-assumption'])
    .order('created_at', { ascending: false })
    .limit(10); // Look at recent entries

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('📭 [BRIDGE] No recent "station-assumption" events found.');
    console.log('   Ensure the VS Code extension is installed and the "Assume Station" command has been executed.');
    return;
  }

  console.log(`✅ [BRIDGE] Found ${data.length} recent "station-assumption" events:`);
  console.table(data.map(record => ({
    'Memory ID': record.id,
    'Timestamp': record.created_at.slice(0, 19).replace('T', ' '),
    'Crew ID': (record.transcript as any)?.crewId || 'N/A',
    'Console Name': (record.transcript as any)?.content?.match(/assumed the (.*)\./)?.[1] || 'N/A',
    'Tags': record.tags?.join(', ') || 'N/A'
  })));
}

verifyStationAssumptionEvents().catch(console.error);