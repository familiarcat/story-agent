import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Strategic script to review the crew's debate on the scaffolding strategy
 * for the VS Code CLI mission (VSCODE-CLI-001).
 */
async function reviewDebate() {
  const storyId = 'VSCODE-CLI-001';
  console.log(`🖖 [BRIDGE] Retrieving Observation Lounge debate for Mission: ${storyId}...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_observation_memories')
    .select('transcript')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Error retrieving memories:', error.message);
    process.exit(1);
  }

  if (!data || !data.transcript) {
    console.log(`❌ [BRIDGE] No debate found for mission ${storyId}. Ensure the mission has been launched.`);
    return;
  }

  const debate = data.transcript;
  console.log(`✅ [BRIDGE] Consensus Summary: ${debate.consensusSummary}`);
  
  debate.rounds.forEach((round: any) => {
    console.log(`\n--- ${round.title} ---`);
    round.entries.forEach((entry: any) => {
      console.log(`[${entry.speakerId.toUpperCase()}] (${entry.position}): ${entry.statement}`);
    });
  });
}

reviewDebate().catch(console.error);