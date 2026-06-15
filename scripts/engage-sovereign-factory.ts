import 'dotenv/config';
import { executeFullMissionLifecycle } from '../packages/mcp-server/src/lib/crew-coordinator.js';
import { crewAutonomyManager } from '../packages/mcp-server/src/lib/crew-autonomy-manager.js';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Sovereign Factory - Master Execution Script
 * 
 * This script engages the 11-member crew to autonomously move a story
 * from discovery through architecture and into implementation generation.
 */
async function engage() {
  console.log('🛸 [SOVEREIGN FACTORY] ENERGIZING ALL PHASES...');
  console.log('========================================================');

  // 1. Start the passive autonomy monitor
  crewAutonomyManager.start();

  // 2. Define the first mission in the PCTMS Sprint
  const story = {
    id: 'pctms-001',
    referenceNum: 'PCTMS-001',
    name: 'Patient Data RLS Infrastructure',
    description: 'Establish the core database schema for patient records with row-level security enforced by org_id.',
    acceptanceCriteria: '1. Schema supports org_id. 2. RLS policies block cross-tenant access. 3. Audit fields included.',
    workflowStatus: 'discovery'
  };

  console.log(`[PICARD] Launching mission ${story.referenceNum}: ${story.name}`);
  console.log(`[DATA]   Calibrating architectural sensors...`);
  console.log(`[WORF]   Security perimeter at maximum readiness...`);

  // 3. Run the full autonomous loop
  const result = await executeFullMissionLifecycle({
    story,
    repoFullName: 'bayer-int/pctms-core',
    targetBranch: 'main',
    executionMode: 'autonomous',
    clientId: 'bayer-int',
    techStack: 'PostgreSQL, Supabase, TypeScript',
  });

  console.log('--------------------------------------------------------');
  console.log(`📡 MISSION STATUS: ${result.status.toUpperCase()}`);
  console.log(`💡 CONSENSUS: ${result.debate.consensusSummary}`);
  console.log(`📝 ACTION ITEMS: ${result.debate.actionItems.length} tasks identified.`);
  
  if (result.implementation) {
    console.log(`🛠️  IMPLEMENTATION: ${result.implementation.files.length} file(s) scaffolded.`);
    console.log(`✅ [OBRIEN] Transporter buffers locked. Ready for delivery_mission_output.`);
  }

  console.log('========================================================');
  console.log('✨ Mission Phase Complete. The crew remains on station.');

  // Keep process alive briefly for any background audit logging to finish
  setTimeout(() => {
    crewAutonomyManager.stop();
    process.exit(0);
  }, 2000);
}

engage().catch(err => {
  console.error('❌ CRITICAL SYSTEM FAILURE:', err);
  process.exit(1);
});