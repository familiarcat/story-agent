#!/usr/bin/env node
/**
 * Supabase Migration Runner (HTTPS-based, bypasses corporate TCP blockage)
 * Executes SQL migrations via REST API using Authorization header
 * Usage: node run-migrations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Config from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_REST_ENDPOINT = process.env.SUPABASE_REST_ENDPOINT;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing credentials. Set SUPABASE_URL and SUPABASE_KEY in ~/.zshrc');
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

/**
 * Execute SQL via Supabase REST API
 */
async function executeSql(sql) {
  const endpoint = new URL(`${SUPABASE_REST_ENDPOINT}/rpc/execute_sql`);
  
  try {
    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REST API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }
}

/**
 * Run all migrations in sequence
 */
async function runMigrations() {
  console.log('=== Supabase Migration Runner (HTTPS) ===');
  console.log(`Project: ${SUPABASE_URL}`);
  console.log(`Migrations: ${MIGRATIONS.length}`);
  console.log('');

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const filename = MIGRATIONS[i];
    const num = i + 1;
    const filepath = path.join(PROJECT_ROOT, 'supabase', filename);

    // Read migration file
    if (!fs.existsSync(filepath)) {
      console.error(`❌ Migration ${num}/${MIGRATIONS.length}: ${filename} NOT FOUND`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filepath, 'utf8');

    console.log(`▶️  Running migration ${num}/${MIGRATIONS.length}: ${filename}`);

    try {
      const result = await executeSql(sql);
      console.log(`✅ Migration ${num}/${MIGRATIONS.length} complete`);
    } catch (error) {
      console.error(`❌ Migration ${num} failed:`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log('');
  console.log('✅ All migrations completed successfully');
}

// Run
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
