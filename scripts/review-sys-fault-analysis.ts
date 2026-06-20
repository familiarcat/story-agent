import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';
import type { ObservationDebateResult } from '../packages/shared/src/index.js';

/**
 * Strategic script to review the crew's analysis of the SYS-FAULT-001 mission,
 * focusing on O'Brien's (and other relevant crew's) findings regarding
 * mispointed libraries and dependency errors.
 */
async function reviewSysFaultAnalysis() {
  const storyId = 'SYS-FAULT-001';
  console.log(`🔍 [BRIDGE] Retrieving Observation Lounge analysis for Mission: ${storyId}...`);

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

  if (!data || !data.transcript) {
    console.log(`❌ [BRIDGE] No analysis found for mission ${storyId}. Ensure the mission has been launched.`);
    return;
  }

  const debate = data.transcript as ObservationDebateResult;
  console.log(`✅ [BRIDGE] Consensus Summary for SYS-FAULT-001: ${debate.consensusSummary}`);
  
  console.log('\n--- Relevant Crew Statements ---');
  const relevantCrew = ['obrien', 'geordi', 'data']; // O'Brien for ops, Geordi for build, Data for architecture
  
  debate.rounds.forEach(round => {
    round.entries.forEach(entry => {
      if (relevantCrew.includes(entry.speakerId)) {
        console.log(`\n[${entry.speakerId.toUpperCase()}] (${entry.position}):`);
        console.log(`  Statement: ${entry.statement}`);
        if (entry.evidence && entry.evidence.length > 0) {
          console.log(`  Evidence: ${entry.evidence.join('; ')}`);
        }
      }
    });
  });

  console.log('\n--- Collective Action Items ---');
  debate.actionItems.forEach((item: string, i: number) => {
    console.log(`${i + 1}. ${item}`);
  });
}

reviewSysFaultAnalysis().catch(console.error);