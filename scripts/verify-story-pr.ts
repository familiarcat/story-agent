import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to check if the PCTMS-001 story record 
 * has been updated with its GitHub Pull Request details.
 */
async function verifyStoryPR() {
  const storyRef = 'PCTMS-001';
  const clientId = process.env.TARGET_CLIENT_ID || 'bayer-int'; // Use TARGET_CLIENT_ID
  console.log(`🔍 Querying 'stories' table for mission: ${storyRef}...`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('stories')
    .select('*')
    .eq('story_id', storyRef)
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (data) {
    console.log('✅ Success! Story record found in Supabase.');
    console.log('--------------------------------------------------------');
    console.log(`Story ID:    ${data.story_id}`);
    console.log(`Title:       ${data.story_title}`);
    console.log(`Status:      ${data.status}`);
    console.log(`PR Number:   ${data.pr_number || '⚠️ NOT SET'}`);
    console.log(`PR URL:      ${data.pr_url || '⚠️ NOT SET'}`);
    console.log(`Branch:      ${data.branch}`);
    console.log('--------------------------------------------------------');
  } else {
    console.log(`❌ No record found in 'stories' table for story_id: ${storyRef}.`);
  }
}

verifyStoryPR().catch(console.error);