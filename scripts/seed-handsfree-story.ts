import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';
import { createHash } from 'crypto';

/**
 * Script to seed the HANDSFREE-001 test story.
 * This mission is designed to be picked up autonomously by the CrewAutonomyManager.
 */
async function seedHandsfreeStory() {
  const db = await getDbClient();
  const storyId = 'HANDSFREE-001';
  const repoFullName = 'familiarcat/story-agent';
  const clientId = 'internal';

  console.log(`🌱 [BRIDGE] Seeding Hands-Free Test Story: ${storyId}`);

  const deterministicId = createHash('sha256')
    .update(`${repoFullName}:${storyId}`)
    .digest('hex')
    .substring(0, 36);

  const { error } = await db.from('stories').upsert({
    id: deterministicId,
    story_id: storyId,
    client_id: clientId,
    story_title: 'Verify Hands-Free Autonomous Mission Triggering',
    status: 'discovery',
    repo_full_name: repoFullName,
    branch: 'handsfree-verification',
    base_branch: 'main',
    phase: 1,
    notes: 'Testing the autonomous pickup of stories from the backlog. #infrastructure:automation',
    tags: ['infrastructure:automation'],
    acceptance_criteria: '1. Story is picked up by Autonomy Manager\n2. Mission plan is generated autonomously\n3. Observation lounge debate occurs without human intervention'
  }, { onConflict: 'story_id' });

  if (error) {
    console.error('❌ [BRIDGE] Failed to seed hands-free mission:', error.message);
  } else {
    console.log('✅ [BRIDGE] Story HANDSFREE-001 seeded successfully.');
    console.log('🖖 [AUTONOMY] Standing by for autonomous pickup. Ensure the MCP server or Autonomy Manager is running.');
  }
}

seedHandsfreeStory().catch(console.error);