import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Strategic script to aggregate all improvement notes (action items)
 * from the VSCODE-CLI campaign missions.
 */
async function listCampaignLearnings() {
  console.log('🖖 [BRIDGE] Aggregating VSCODE-CLI Campaign Learnings...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('story_id, transcript')
    .ilike('story_id', 'VSCODE-CLI-%')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('📭 [BRIDGE] No campaign memories found for VSCODE-CLI.');
    return;
  }

  console.log(`✅ [BRIDGE] Found ${data.length} mission memories. Extracting action items...`);

  data.forEach(record => {
    const debate = record.transcript as any;
    console.log(`\n🚀 MISSION: ${record.story_id}`);
    console.log(`   Consensus: ${debate.consensusSummary}`);
    
    if (debate.actionItems && debate.actionItems.length > 0) {
      debate.actionItems.forEach((item: string, i: number) => {
        console.log(`     ${i + 1}. ${item}`);
      });
    }
  });
}

listCampaignLearnings().catch(console.error);