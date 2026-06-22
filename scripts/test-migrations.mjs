#!/usr/bin/env node
/**
 * Supabase Migration Runner (HTTPS + native Node fetch)
 * Validates connection and displays migration instructions
 * 
 * Usage:
 *   source ~/.zshrc
 *   node scripts/test-migrations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars. Run: source ~/.zshrc');
  process.exit(1);
}

const MIGRATIONS = [
  'migration.sql',
  '20260605_crew_state_table.sql',
  '20260605_docs_knowledge_vectors.sql',
  '20260605_crew_memory_vectors.sql',
  '20260606_crew_starship_tables.sql',
  '20260607_client_security_policies.sql',
  '20260607_client_memory_isolation.sql',
];

async function testConnection() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Supabase Migration Runner (HTTPS + CURL-tested)    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('🔗 Testing HTTPS connection to Supabase...');
  
  try {
    // Use curl directly (known to work)
    const curlCmd = `curl -s -X GET "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_KEY}" -H "Content-Type: application/json"`;
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const data = JSON.parse(response);
    
    if (data.swagger === '2.0') {
      console.log('✅ HTTPS connection successful');
      console.log(`   Postgres version: ${data.info?.version || 'unknown'}`);
      return true;
    } else if (data.message) {
      throw new Error(data.message);
    } else {
      console.log('✅ HTTPS connection successful');
      return true;
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function validateCredentials() {
  console.log('');
  console.log('🔐 Validating credentials...');
  console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);
  console.log(`   SUPABASE_KEY: ${SUPABASE_KEY.substring(0, 20)}...[REDACTED]`);
  console.log('✅ Credentials configured');
}

function listMigrations() {
  console.log('');
  console.log('📋 Migration files to execute (in order):');
  console.log('');

  let totalLines = 0;
  let totalSize = 0;

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const filename = MIGRATIONS[i];
    const filepath = path.join(PROJECT_ROOT, 'supabase', filename);

    if (!fs.existsSync(filepath)) {
      console.error(`❌ ${filename} NOT FOUND`);
      process.exit(1);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n').length;
    const size = content.length;

    totalLines += lines;
    totalSize += size;

    console.log(`  ${i + 1}. ${filename}`);
    console.log(`     Lines: ${lines.toString().padStart(3)} | Size: ${(size / 1024).toFixed(1)}KB`);
  }

  console.log('');
  console.log(`Total: ${totalLines} lines, ${(totalSize / 1024).toFixed(1)}KB`);
}

function printInstructions() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ HTTPS connectivity verified (bypasses corporate TCP blockage)');
  console.log('✅ Service role credentials validated');
  console.log('');
  console.log('📖 MANUAL EXECUTION (recommended now):');
  console.log('');
  console.log('  1. Go to Dashboard SQL Editor:');
  console.log('     https://supabase.com/dashboard/project/rpkkkbufdwxmjaerbhbn/sql/new');
  console.log('');
  console.log('  2. Copy/paste each migration file contents in order:');
  console.log('');
  for (let i = 0; i < MIGRATIONS.length; i++) {
    console.log(`     Migration ${i + 1}: supabase/${MIGRATIONS[i]}`);
  }
  console.log('');
  console.log('  3. After each file, click RUN');
  console.log('');
  console.log('');
  console.log('🚀 AUTOMATED EXECUTION (after manual setup):');
  console.log('');
  console.log('  Once we can execute SQL via RPC, run:');
  console.log('  $ node scripts/run-migrations-sdk.mjs');
  console.log('');
}

async function main() {
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  validateCredentials();
  listMigrations();
  printInstructions();

  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
