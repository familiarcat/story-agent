import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Strategic script to review the retrospective summary for 
 * the VS Code Transport mission (VSCODE-CLI-002).
 */
async function reviewTransportRetrospective() {
  const storyId = 'VSCODE-CLI-002';
  console.log(`🖖 [BRIDGE] Retrieving retrospective for Mission: ${storyId}...`);

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
    console.log(`❌ [BRIDGE] No retrospective found for ${storyId}.`);
    return;
  }

  const debate = data.transcript;
  console.log(`✅ [BRIDGE] Retrospective Summary: ${debate.consensusSummary}`);
  
  console.log('\n--- Action Items for Next Phase ---');
  debate.actionItems.forEach((item: string, i: number) => {
    console.log(`${i + 1}. ${item}`);
  });
}

reviewTransportRetrospective().catch(console.error);