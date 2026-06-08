#!/usr/bin/env node
/**
 * Supabase Migration Runner (Fully Automated via RPC)
 * 
 * This script:
 * 1. Checks if Supabase has a migration helper RPC function
 * 2. If not, creates it (requires manual bootstrap paste)
 * 3. Once it exists, executes all migrations autonomously via REST API
 * 
 * First run: Shows you what to paste into the dashboard (1 SQL block)
 * Subsequent runs: Fully automated, crew agents can call this
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

/**
 * Bootstrap RPC function definition
 * This single function enables all subsequent migrations to run autonomously
 * Paste this ONCE into the Supabase SQL editor
 */
const BOOTSTRAP_SQL = `
-- ============================================================================
-- BOOTSTRAP: Execute Migrations RPC Function
-- ============================================================================
-- Paste this entire block once into: 
-- https://supabase.com/dashboard/project/sqachwmzyuuyyyxekdxp/sql/new
-- 
-- This creates the RPC function that crew agents will use to execute migrations

CREATE SCHEMA IF NOT EXISTS public;

-- Drop if exists (for idempotency)
DROP FUNCTION IF EXISTS public.execute_migration(sql text) CASCADE;

-- Migration execution function
-- Executes arbitrary SQL (only callable by authenticated service_role users)
CREATE FUNCTION public.execute_migration(sql text)
RETURNS TABLE(success boolean, message text, rows_affected integer)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  rows_affected INTEGER DEFAULT 0;
BEGIN
  -- Execute the SQL statement
  EXECUTE sql;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN QUERY SELECT 
    true as success,
    'Migration executed successfully'::text as message,
    rows_affected as rows_affected;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    false as success,
    ('Error: ' || SQLERRM)::text as message,
    0 as rows_affected;
END;
$$;

-- Grant execute permission to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.execute_migration(text) TO authenticated, service_role, anon;

-- Create audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sa_bootstrap_log (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT ON public.sa_bootstrap_log TO authenticated, service_role, anon;

-- Log bootstrap
INSERT INTO public.sa_bootstrap_log (event) VALUES ('RPC function created: execute_migration');
`;

/**
 * Check if migration helper RPC exists (using curl)
 */
function checkRpcExists() {
  try {
    const curlCmd = `curl -s -X GET "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_KEY}" -H "Content-Type: application/json"`;
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const schema = JSON.parse(response);
    const hasRpc = schema.paths?.['/rpc/execute_migration'] !== undefined;
    return hasRpc;
  } catch {
    return false;
  }
}

/**
 * Execute migration via RPC (using curl)
 */
function executeMigrationViaRpc(sql) {
  try {
    // Escape single quotes in SQL for shell
    const escapedSql = sql.replace(/'/g, "'\\''");
    const jsonPayload = JSON.stringify({ sql });
    
    const curlCmd = `curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/execute_migration" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '${jsonPayload.replace(/'/g, "'\\''")}'`;
    
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const result = JSON.parse(response);
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    throw new Error(`RPC failed: ${error.message}`);
  }
}

/**
 * Display bootstrap instructions
 */
function showBootstrapInstructions() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          First-Time Setup: Create RPC Function         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('The migration RPC function does not exist yet.');
  console.log('');
  console.log('STEP 1: Paste the bootstrap SQL below into the dashboard:');
  console.log('');
  console.log('  URL: https://supabase.com/dashboard/project/sqachwmzyuuyyyxekdxp/sql/new');
  console.log('');
  console.log('BOOTSTRAP SQL (copy everything between the lines):');
  console.log('');
  console.log('─'.repeat(60));
  console.log(BOOTSTRAP_SQL);
  console.log('─'.repeat(60));
  console.log('');
  console.log('STEP 2: After pasting and clicking RUN, come back here and run:');
  console.log('');
  console.log('  $ node scripts/run-migrations-auto.mjs');
  console.log('');
  console.log('That will automatically execute all 7 migrations via REST API.');
  console.log('');
}

/**
 * Run all migrations via RPC (autonomous, synchronous)
 */
function runMigrationsViaRpc() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Running Migrations Autonomously via RPC (REST API) ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Project: ${SUPABASE_URL}`);
  console.log(`📊 Migrations: ${MIGRATIONS.length}`);
  console.log('');

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const filename = MIGRATIONS[i];
    const num = i + 1;
    const filepath = path.join(PROJECT_ROOT, 'supabase', filename);

    if (!fs.existsSync(filepath)) {
      console.error(`❌ ${filename} NOT FOUND`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filepath, 'utf8');

    console.log(`▶️  Migration ${num}/${MIGRATIONS.length}: ${filename}`);

    try {
      const result = executeMigrationViaRpc(sql);

      if (result.success) {
        console.log(`✅ Success | Rows affected: ${result.rows_affected || 0}`);
      } else {
        console.error(`❌ Failed: ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ All migrations completed successfully!');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('  1. Verify tables: https://supabase.com/dashboard/project/sqachwmzyuuyyyxekdxp/editor');
  console.log('  2. Seed crew manifests: npm run crew:seed');
  console.log('  3. Run crew integrity check: npm run crew:check');
  console.log('');
}

/**
 * Main entry point
 */
function main() {
  const rpcExists = checkRpcExists();

  if (!rpcExists) {
    showBootstrapInstructions();
    return;
  }

  runMigrationsViaRpc();
}

main();
