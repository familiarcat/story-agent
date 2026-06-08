#!/usr/bin/env node
/**
 * Seed Crew Baseline Memories into Supabase
 * 
 * Loads baseline knowledge for all 11 crew members into sa_observation_memories
 * so they can reference and build upon their own institutional memory during missions.
 * 
 * Usage:
 *   source ~/.zshrc
 *   npm run crew:seed-memories
 */

import { execSync } from 'child_process';
import { CREW_BASELINE_MEMORIES } from './src/lib/crew-baseline-memories.ts';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_REST_ENDPOINT = process.env.SUPABASE_REST_ENDPOINT;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars. Run: source ~/.zshrc');
  process.exit(1);
}

/**
 * Insert observation memory into Supabase via REST API
 */
function insertMemory(crewId, memoryData) {
  const payload = {
    story_id: `crew-baseline-${crewId}`,
    crew_id: crewId,
    content: memoryData.baseline,
    transcript: memoryData.baseline,
    summary: `${memoryData.role} baseline knowledge and principles`,
    client_id: null, // Global memory, accessible to all clients
    tags: ['baseline', 'crew-knowledge', crewId],
    embedding: null, // Will be computed by Supabase
  };

  const jsonPayload = JSON.stringify(payload);
  
  try {
    const curlCmd = `curl -s -X POST "${SUPABASE_REST_ENDPOINT}/observation_memories" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '${jsonPayload.replace(/'/g, "'\\''")}'`;
    
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const result = JSON.parse(response);
    
    return result;
  } catch (error) {
    throw new Error(`Failed to insert memory for ${crewId}: ${error.message}`);
  }
}

/**
 * Seed all crew baseline memories
 */
async function seedCrewMemories() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      Seeding Crew Baseline Memories → Supabase        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Project: ${SUPABASE_URL}`);
  console.log(`📊 Crew members: ${Object.keys(CREW_BASELINE_MEMORIES).length}`);
  console.log('');

  let successCount = 0;
  let failureCount = 0;

  for (const [crewId, memoryData] of Object.entries(CREW_BASELINE_MEMORIES)) {
    console.log(`▶️  Seeding ${crewId.toUpperCase()}: ${memoryData.role}`);

    try {
      const result = insertMemory(crewId, memoryData);
      
      if (Array.isArray(result) && result.length > 0) {
        console.log(`✅ Memory seeded (ID: ${result[0].id})`);
        successCount++;
      } else if (result.id) {
        console.log(`✅ Memory seeded (ID: ${result.id})`);
        successCount++;
      } else {
        console.warn(`⚠️  Seeded but response unclear:`, result);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      failureCount++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Seeding complete: ${successCount} succeeded, ${failureCount} failed`);
  console.log('');
  console.log('🎯 Next steps:');
  console.log('  1. Verify in dashboard: https://supabase.com/dashboard/project/sqachwmzyuuyyyxekdxp/editor');
  console.log('     → Table: sa_observation_memories');
  console.log('     → Filter: story_id LIKE "crew-baseline-%"');
  console.log('');
  console.log('  2. Check crew integrity:');
  console.log('     $ npm run crew:check');
  console.log('');
  console.log('  3. Run a mission to see crew reference their memories:');
  console.log('     $ CREW_LLM_PROVIDER=demo npm run crew:mission');
  console.log('');

  if (failureCount > 0) {
    process.exit(1);
  }
}

seedCrewMemories().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
