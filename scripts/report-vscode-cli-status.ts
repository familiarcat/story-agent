import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Campaign Status Report: VSCODE-CLI
 * 
 * Queries the organizational memory for all missions in the VSCODE-CLI campaign
 * and aggregates their status into a unified report.
 */
async function reportCampaignStatus() {
  const prefix = 'VSCODE-CLI-';
  console.log(`🖖 [BRIDGE] Aggregating collective status for campaign: ${prefix}`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('story_id, transcript')
    .ilike('story_id', `${prefix}%`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(`📭 [BRIDGE] No active mission logs found for prefix ${prefix}.`);
    return;
  }

  console.log(`✅ [BRIDGE] Campaign Summary: ${data.length} missions recorded.\n`);
  
  const summary = data.map(d => ({
    'Mission ID': d.story_id,
    'Consensus Result': (d.transcript as any).consensusSummary || 'Analysis complete',
    'Action Items': (d.transcript as any).actionItems?.length || 0
  }));

  console.table(summary);
}

reportCampaignStatus().catch(console.error);