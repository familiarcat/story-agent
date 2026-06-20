import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';
import type { ObservationDebateResult } from '@story-agent/shared';

/**
 * Strategic script to review the crew's debate on the LCARS layout pattern
 * for the BRIDGE-UI-001 mission (Build Master Viewscreen).
 */
async function reviewBridgeUiDebate() {
  const storyId = 'BRIDGE-UI-001';
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

  const debate = data.transcript as ObservationDebateResult;
  console.log(`✅ [BRIDGE] Consensus Summary for ${storyId}: ${debate.consensusSummary}`);
  
  debate.rounds.forEach(round => {
    console.log(`\n--- ${round.title} ---`);
    round.entries.forEach(entry => {
      console.log(`[${entry.speakerId.toUpperCase()}] (${entry.position}): ${entry.statement}`);
      if (entry.evidence && entry.evidence.length > 0) {
        console.log(`  Evidence: ${entry.evidence.join('; ')}`);
      }
    });
  });

  if (debate.actionItems && debate.actionItems.length > 0) {
    console.log('\n--- Collective Action Items ---');
    debate.actionItems.forEach((item: string, i: number) => {
      console.log(`${i + 1}. ${item}`);
    });
  }
}

reviewBridgeUiDebate().catch(console.error);