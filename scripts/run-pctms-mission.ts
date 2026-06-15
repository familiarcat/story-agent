import 'dotenv/config';
import { executeAutonomousCrewMission } from '../packages/mcp-server/src/lib/crew-coordinator.js';
import { storeObservationMemory, getRelevantObservationMemories } from '../packages/shared/src/db.js';

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

  const story = {
    id: 'pctms-001-story-id',
    referenceNum: 'PCTMS-001',
    name: 'Design patient data table schema',
    description: 'Design the core patient_records table for the Patient-Centric Trial Management System. Must include PII/PHI protections, multi-tenant isolation via org_id, and audit fields.',
    acceptanceCriteria: '1. Schema supports org_id isolation. 2. PII fields identified for encryption. 3. Audit fields (created_at, updated_at, created_by) included.',
    workflowStatus: 'discovery'
  };

  // Pre-load institutional knowledge for the agents
  const sharedMemories = await getRelevantObservationMemories({
    queryText: 'multi-tenant RLS schema design PHI',
    clientId: 'bayer-int',
    limit: 5
  });

  console.log('📡 Engaging autonomous crew (Picard, Data, Worf, Geordi, O\'Brien)...');

  // Execute mission with live agents
  const { plan, debate } = await executeAutonomousCrewMission({
    story,
    repoFullName: 'bayer-int/pctms-core',
    targetBranch: 'main',
    executionMode: 'autonomous',
    clientId: 'bayer-int',
    sharedMemories,
    techStack: 'PostgreSQL, Node.js, TypeScript, Supabase',
    includeDebate: true,
  });

  console.log('✅ [MISSION SUCCESS] Storing findings in Observation Lounge Memories...');

  await storeObservationMemory({
    storyId: story.referenceNum,
    clientId: 'bayer-int',
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