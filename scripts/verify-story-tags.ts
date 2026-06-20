import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to ensure PCTMS-001 is correctly tagged
 * for the Operations Console (database:schema).
 */
async function verifyStoryTags() {
  const storyId = 'PCTMS-001';
  console.log(`🔍 Auditing tags for Mission: ${storyId}...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('stories')
    .select('story_id, tags')
    .eq('story_id', storyId)
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const tags = (data.tags as string[]) || [];
  const isCorrect = tags.includes('database:schema');

  console.log(`Mission Tags: [${tags.join(', ')}]`);
  console.log(isCorrect ? "✅ [BRIDGE] Signal Verified: PCTMS-001 is correctly assigned to the Operations Console." : "❌ [BRIDGE] Signal Misrouted: PCTMS-001 is missing the 'database:schema' tag.");
}

verifyStoryTags().catch(console.error);