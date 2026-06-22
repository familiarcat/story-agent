import 'dotenv/config';
import { executeAutonomousCrewMission } from '../packages/mcp-server/src/lib/crew-coordinator.js';
import { storeObservationMemory, getRelevantObservationMemories, getStory } from '../packages/shared/src/db.js';

/**
 * PCTMS-001 Mission Execution Script
 * 
 * This script engages the autonomous crew to design the patient data schema.
 * It utilizes actual live MCP agents (Picard, Data, Worf, etc.) interacting 
 * through the coordinator.
 */
async function main() {
  console.log('🚀 [MISSION START] PCTMS-001: Patient Data Schema Design');
  console.log('========================================================');

  // Dynamically load the mission from the database
  const storyRef = 'PCTMS-001';
  const clientId = 'client-int';
  const repoFullName = 'client-int/sovereign-todo';

  console.log(`[PICARD] Retrieving mission context for ${storyRef} from database...`);
  const dbStoryRecord = await getStory(storyRef, clientId);

  if (!dbStoryRecord) {
    throw new Error(`Mission story ${storyRef} not found in database for client ${clientId}. Please seed the mission first.`);
  }

  const story = {
    id: dbStoryRecord.id,
    referenceNum: dbStoryRecord.story_id,
    name: dbStoryRecord.story_title,
    description: dbStoryRecord.notes || '',
    acceptanceCriteria: dbStoryRecord.acceptance_criteria || '',
    url: dbStoryRecord.story_url || '',
    workflowStatus: dbStoryRecord.status,
  };

  // Pre-load institutional knowledge for the agents
  const sharedMemories = await getRelevantObservationMemories({
    queryText: 'multi-tenant RLS schema todo application',
    clientId,
    limit: 5
  });

  console.log('📡 Engaging autonomous crew (Picard, Data, Worf, Geordi, O\'Brien)...');

  // Execute mission with live agents
  const { plan, debate } = await executeAutonomousCrewMission({
    story,
    repoFullName,
    targetBranch: 'main',
    executionMode: 'autonomous',
    clientId,
    sharedMemories,
    techStack: 'PostgreSQL, Node.js, TypeScript, Supabase',
    includeDebate: true,
  });

  console.log('✅ [MISSION SUCCESS] Storing findings in Observation Lounge Memories...');

  await storeObservationMemory({
    storyId: story.referenceNum,
    clientId,
    source: 'autonomous-crew-system',
    transcript: debate,
    missionPlan: plan,
    missionReference: story.referenceNum,
    tags: ['PCTMS-001', 'schema-design', 'autonomous-mission', 'consensus-achieved'],
  });

  console.log('✨ Mission complete. The crew has successfully designed the schema and persisted learnings.');
}

main().catch(err => {
  console.error('❌ Mission Failed:', err);
  process.exit(1);
});