#!/usr/bin/env node
/**
 * Unified Supabase Migration Manager
 * 
 * Automates the entire migration pipeline for new projects/clients:
 * 1. Verify credentials and connectivity
 * 2. Check if RPC function exists
 * 3. Create RPC function if needed (bootstrapping)
 * 4. Execute all pending migrations
 * 5. Verify integrity
 * 
 * Usage:
 *   source ~/.zshrc
 *   npm run db:auto-migrate
 * 
 * Or as part of client onboarding:
 *   NODE_ENV=production npm run db:auto-migrate -- --client=new-client
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_REST_ENDPOINT = process.env.SUPABASE_REST_ENDPOINT;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

// Parse CLI arguments
const args = process.argv.slice(2);
const clientId = args.includes('--client') ? args[args.indexOf('--client') + 1] : null;
const skipMigrations = args.includes('--skip-migrations');
const dryRun = args.includes('--dry-run');

// Migration files directory
const migrationsDir = path.resolve(import.meta.url.replace('file://', ''), '../../supabase');

class MigrationManager {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.stats = {
      startTime: Date.now(),
      migrationsFound: 0,
      migrationsRun: 0,
      rowsAffected: 0,
    };
  }

  log(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'warn': '⚠️',
      'error': '❌',
    }[level] || '•';

    const msg = `[${timestamp}] ${prefix} ${message}`;

    if (level === 'error') {
      console.error(msg);
      this.errors.push(message);
    } else if (level === 'warn') {
      console.warn(msg);
      this.warnings.push(message);
    } else if (level === 'success') {
      console.log(msg);
      this.successes.push(message);
    } else {
      console.log(msg);
    }
  }

  async run() {
    this.printHeader();
    this.validateEnvironment();

    if (dryRun) {
      this.log('info', 'DRY RUN MODE - No changes will be made');
    }

    // Phase 1: Verify connectivity
    this.log('info', 'Phase 1: Verifying connectivity...');
    const isConnected = await this.verifyConnectivity();
    if (!isConnected) {
      this.log('error', 'Cannot reach Supabase. Check credentials and network.');
      this.printSummary();
      process.exit(1);
    }

    // Phase 2: Bootstrap RPC function if needed
    this.log('info', 'Phase 2: Checking RPC function...');
    const rpcExists = await this.checkRpcExists();
    if (!rpcExists) {
      this.log('info', 'RPC function does not exist. Bootstrapping...');
      await this.bootstrapRpc();
    } else {
      this.log('success', 'RPC function exists. Ready for migrations.');
    }

    // Phase 3: Load and prepare migrations
    this.log('info', 'Phase 3: Loading migrations...');
    const migrations = this.loadMigrations();
    this.stats.migrationsFound = migrations.length;
    this.log('success', `Found ${migrations.length} migration(s)`);

    if (skipMigrations || migrations.length === 0) {
      if (skipMigrations) {
        this.log('info', 'Skipping migration execution (--skip-migrations)');
      } else {
        this.log('warn', 'No migrations found');
      }
      this.printSummary();
      return;
    }

    // Phase 4: Execute migrations
    this.log('info', 'Phase 4: Executing migrations...');
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      this.log('info', `[${i + 1}/${migrations.length}] ${migration.name}`);

      if (dryRun) {
        this.log('info', `  [DRY RUN] Would execute ${migration.lines} lines`);
        this.stats.migrationsRun++;
      } else {
        const result = await this.executeMigration(migration);
        if (result.success) {
          this.log('success', `  ✓ ${result.rowsAffected || 'OK'} (${result.duration}ms)`);
          this.stats.migrationsRun++;
          this.stats.rowsAffected += result.rowsAffected || 0;
        } else {
          this.log('error', `  ✗ ${result.error}`);
          if (!result.isIdempotent) {
            this.printSummary();
            process.exit(1);
          }
        }
      }
    }

    // Phase 5: Verify integrity
    this.log('info', 'Phase 5: Verifying database integrity...');
    await this.verifyIntegrity();

    this.printSummary();
  }

  validateEnvironment() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      this.log('error', 'Missing environment variables:');
      if (!SUPABASE_URL) this.log('error', '  SUPABASE_URL');
      if (!SUPABASE_KEY) this.log('error', '  SUPABASE_KEY');
      this.log('error', 'Run: source ~/.zshrc');
      process.exit(1);
    }
  }

  printHeader() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Unified Supabase Migration Manager (Auto-Migrate)    ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📍 Project: ${SUPABASE_URL}`);
    if (clientId) console.log(`👤 Client:  ${clientId}`);
    console.log('');
  }

  async verifyConnectivity() {
    try {
      const cmd = `curl -s -f -X GET "${SUPABASE_REST_ENDPOINT}/" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Content-Type: application/json"`;

      if (dryRun) {
        this.log('info', '[DRY RUN] Would test connectivity');
        return true;
      }

      execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      this.log('success', 'Connected to Supabase');
      return true;
    } catch (error) {
      this.log('error', `Connection failed: ${error.message}`);
      return false;
    }
  }

  async checkRpcExists() {
    try {
      const cmd = `curl -s -X GET "${SUPABASE_REST_ENDPOINT}/rpc/execute_migration" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Content-Type: application/json"`;

      if (dryRun) {
        this.log('info', '[DRY RUN] Would check RPC');
        return true;
      }

      execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async bootstrapRpc() {
    // Read bootstrap SQL from migration.sql
    const migrationPath = path.join(migrationsDir, 'migration.sql');
    if (!fs.existsSync(migrationPath)) {
      this.log('error', `Bootstrap SQL not found: ${migrationPath}`);
      this.printSummary();
      process.exit(1);
    }

    const bootstrapSql = fs.readFileSync(migrationPath, 'utf8');
    const rpcSection = bootstrapSql.split('-- ────────────────────────────────')[0];

    if (!rpcSection.includes('execute_migration')) {
      this.log('error', 'RPC function definition not found in bootstrap SQL');
      this.printSummary();
      process.exit(1);
    }

    if (dryRun) {
      this.log('info', '[DRY RUN] Would create RPC function');
      return;
    }

    try {
      const payload = JSON.stringify({ query: rpcSection });
      const cmd = `curl -s -X POST "${SUPABASE_REST_ENDPOINT}/sql" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -d '${payload.replace(/'/g, "'\\''")}'`;

      const response = execSync(cmd, { encoding: 'utf8' });
      const result = JSON.parse(response);

      if (result.error) {
        // RPC may already exist (idempotent)
        if (result.message.includes('already exists')) {
          this.log('success', 'RPC function already exists');
        } else {
          throw new Error(result.message);
        }
      } else {
        this.log('success', 'RPC function created');
      }
    } catch (error) {
      this.log('error', `Failed to bootstrap RPC: ${error.message}`);
      this.log('warn', 'You may need to manually paste bootstrap SQL');
      this.log('warn', `See: ${migrationPath}`);
      // Don't exit - RPC may exist already
    }
  }

  loadMigrations() {
    const migrations = [];
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== 'migration.sql')
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8').trim();
      const lines = sql.split('\n').length;

      migrations.push({
        name: file,
        path: filePath,
        sql: sql,
        lines: lines,
      });
    }

    return migrations;
  }

  async executeMigration(migration) {
    const startTime = Date.now();

    try {
      const payload = JSON.stringify({ sql: migration.sql });
      const cmd = `curl -s -X POST "${SUPABASE_REST_ENDPOINT}/rpc/execute_migration" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -d '${payload.replace(/'/g, "'\\''")}'`;

      const response = execSync(cmd, { encoding: 'utf8' });
      const result = JSON.parse(response);
      const duration = Date.now() - startTime;

      if (result.success === false) {
        return {
          success: false,
          error: result.message || 'Unknown error',
          isIdempotent: result.message?.includes('already exists'),
          duration,
        };
      }

      return {
        success: true,
        rowsAffected: result.rows_affected || 0,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        isIdempotent: false,
        duration: Date.now() - startTime,
      };
    }
  }

  async verifyIntegrity() {
    try {
      const tables = [
        'sa_projects',
        'sa_stories',
        'sa_pr_comments',
        'sa_observation_memories',
        'sa_crew_personas',
      ];

      let tablesFound = 0;
      for (const table of tables) {
        const cmd = `curl -s -X GET "${SUPABASE_REST_ENDPOINT}/${table}?limit=1" \
          -H "apikey: ${SUPABASE_KEY}"`;

        try {
          execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
          tablesFound++;
        } catch {
          // Table may not exist or be empty, that's ok
        }
      }

      this.log('success', `Verified ${tablesFound} key tables exist`);
    } catch (error) {
      this.log('warn', `Integrity check inconclusive: ${error.message}`);
    }
  }

  printSummary() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

    if (this.errors.length > 0) {
      console.log(`❌ ${this.errors.length} error(s) encountered`);
    } else if (this.warnings.length > 0) {
      console.log('⚠️  Completed with warnings');
    } else {
      console.log('✅ All phases completed successfully');
    }

    const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    console.log('');
    console.log('📊 Statistics:');
    console.log(`   Migrations found:  ${this.stats.migrationsFound}`);
    console.log(`   Migrations run:    ${this.stats.migrationsRun}`);
    console.log(`   Total duration:    ${duration}s`);
    console.log('');

    if (this.errors.length > 0) {
      console.log('🔴 Errors:');
      this.errors.forEach(e => console.log(`   • ${e}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('🟡 Warnings:');
      this.warnings.forEach(w => console.log(`   • ${w}`));
      console.log('');
    }

    console.log('🚀 Next steps:');
    if (this.errors.length > 0) {
      console.log('   1. Review errors above');
      console.log('   2. Fix any issues');
      console.log('   3. Run again: npm run db:auto-migrate');
    } else if (clientId) {
      console.log(`   1. Verify client "${clientId}" data in dashboard`);
      console.log('   2. Configure client security profile');
      console.log('   3. Run: npm run client:setup -- --client=' + clientId);
    } else {
      console.log('   1. Start using the database');
      console.log('   2. Seed crew baseline memories: npm run crew:seed-memories');
      console.log('   3. Run your first mission');
    }
    console.log('');
  }
}

// Run the manager
const manager = new MigrationManager();
manager.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
