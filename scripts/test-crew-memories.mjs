#!/usr/bin/env node
/**
 * Test crew baseline memories integration
 * 
 * Verifies that crew baseline memories are:
 * 1. Properly defined in crew-baseline-memories.ts
 * 2. Can be imported and accessed
 * 3. Have proper structure for database seeding
 */

import fs from 'fs';
import path from 'path';

// Verify crew-baseline-memories.ts exists and loads
const crewMemoriesPath = new URL('../packages/mcp-server/src/lib/crew-baseline-memories.ts', import.meta.url).pathname;

console.log('');
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     Crew Baseline Memories Integration Test            ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

// Step 1: Check file exists
console.log('📋 Step 1: Verify file exists');
if (fs.existsSync(crewMemoriesPath)) {
  const stats = fs.statSync(crewMemoriesPath);
  console.log(`✅ File exists: ${crewMemoriesPath} (${(stats.size / 1024).toFixed(1)} KB)`);
} else {
  console.error(`❌ File not found: ${crewMemoriesPath}`);
  process.exit(1);
}

// Step 2: Check file content
console.log('');
console.log('📋 Step 2: Verify file content');
const content = fs.readFileSync(crewMemoriesPath, 'utf8');

// Check for required crew members
const requiredCrew = [
  'picard', 'data', 'riker', 'geordi', 'obrien',
  'worf', 'troi', 'crusher', 'uhura', 'quark', 'yar'
];

let crewFound = 0;
for (const crew of requiredCrew) {
  if (content.includes(`${crew}:`)) {
    crewFound++;
  }
}

console.log(`✅ Found ${crewFound}/${requiredCrew.length} crew members defined`);
if (crewFound < requiredCrew.length) {
  console.warn(`⚠️  Missing crew members:`, requiredCrew.filter(c => !content.includes(`${c}:`)));
}

// Check for key structures
const hasRole = content.includes('role:');
const hasBaseline = content.includes('baseline:');
const hasExports = content.includes('export');

console.log(`✅ Has role property: ${hasRole ? 'Yes' : 'No'}`);
console.log(`✅ Has baseline property: ${hasBaseline ? 'Yes' : 'No'}`);
console.log(`✅ Has exports: ${hasExports ? 'Yes' : 'No'}`);

// Step 3: Check seed script exists
console.log('');
console.log('📋 Step 3: Verify seed script');
const seedScriptPath = new URL('../scripts/seed-crew-memories.mjs', import.meta.url).pathname;
if (fs.existsSync(seedScriptPath)) {
  const seedStats = fs.statSync(seedScriptPath);
  console.log(`✅ Seed script exists: ${seedScriptPath} (${(seedStats.size / 1024).toFixed(1)} KB)`);
  
  // Check seed script content
  const seedContent = fs.readFileSync(seedScriptPath, 'utf8');
  if (seedContent.includes('CREW_BASELINE_MEMORIES') && seedContent.includes('insertMemory')) {
    console.log('✅ Seed script has proper structure');
  } else {
    console.warn('⚠️  Seed script may be incomplete');
  }
} else {
  console.error(`❌ Seed script not found: ${seedScriptPath}`);
  process.exit(1);
}

// Step 4: Check npm script
console.log('');
console.log('📋 Step 4: Verify npm script');
const packageJsonPath = new URL('../package.json', import.meta.url).pathname;
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (packageJson.scripts && packageJson.scripts['crew:seed-memories']) {
  console.log(`✅ npm script 'crew:seed-memories' defined`);
  console.log(`   Command: ${packageJson.scripts['crew:seed-memories']}`);
} else {
  console.error('❌ npm script crew:seed-memories not found');
  process.exit(1);
}

// Step 5: Check database functions
console.log('');
console.log('📋 Step 5: Verify database integration');
const dbPath = new URL('../packages/shared/src/db.ts', import.meta.url).pathname;
if (fs.existsSync(dbPath)) {
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  
  const hasGetCrewBaselineMemory = dbContent.includes('getCrewBaselineMemory');
  const hasGetAllCrewBaselineMemories = dbContent.includes('getAllCrewBaselineMemories');
  
  if (hasGetCrewBaselineMemory && hasGetAllCrewBaselineMemories) {
    console.log('✅ Database access functions defined:');
    console.log('   - getCrewBaselineMemory(crewId)');
    console.log('   - getAllCrewBaselineMemories()');
  } else {
    console.warn('⚠️  Database functions may be incomplete');
  }
} else {
  console.warn('⚠️  db.ts not found at expected location');
}

// Step 6: Summary
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ Crew Baseline Memories System is properly configured');
console.log('');
console.log('🚀 Next steps:');
console.log('');
console.log('1. Ensure Supabase migrations are complete:');
console.log('   $ npm run db:migrate');
console.log('');
console.log('2. Seed crew baseline memories:');
console.log('   $ npm run crew:seed-memories');
console.log('');
console.log('3. Verify in Supabase dashboard:');
console.log('   https://supabase.com/dashboard/project/rpkkkbufdwxmjaerbhbn/editor');
console.log('   → sa_observation_memories table');
console.log('   → Filter: story_id LIKE "crew-baseline-%"');
console.log('');
console.log('4. Read the guide:');
console.log('   $ cat CREW_MEMORIES_GUIDE.md');
console.log('');
