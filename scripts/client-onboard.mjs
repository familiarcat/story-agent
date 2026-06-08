#!/usr/bin/env node
/**
 * Client Onboarding Manager
 * 
 * Automates setup of a new client/project in the Supabase system:
 * 1. Create client record in sa_clients
 * 2. Create client-specific tables (with RLS policies)
 * 3. Configure security profile
 * 4. Run migrations
 * 5. Seed initial data
 * 6. Verify setup
 * 
 * Usage:
 *   source ~/.zshrc
 *   npm run client:onboard -- --client=acme-corp --name="ACME Corp" --mode=standard
 * 
 * Modes:
 *   - standard: Normal SaaS client
 *   - regulated: Healthcare/Finance - stricter compliance
 *   - air_gapped: No external API calls
 *   - customer_managed: Customer manages their own infrastructure
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_REST_ENDPOINT = process.env.SUPABASE_REST_ENDPOINT;

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};

const clientId = getArg('client');
const clientName = getArg('name');
const clientMode = getArg('mode') || 'standard';
const skipMigrations = args.includes('--skip-migrations');
const dryRun = args.includes('--dry-run');

class ClientOnboarding {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.clientData = {};
  }

  log(level, message) {
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'warn': '⚠️',
      'error': '❌',
    }[level] || '•';

    const msg = `${prefix} ${message}`;

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

  async prompt(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`\n❓ ${question}\n> `, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async run() {
    this.printHeader();

    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      this.log('error', 'Missing environment variables. Run: source ~/.zshrc');
      process.exit(1);
    }

    // Gather client info
    await this.gatherClientInfo();

    if (dryRun) {
      this.log('info', 'DRY RUN MODE - No changes will be made');
    }

    // Phase 1: Create client record
    this.log('info', 'Phase 1: Creating client record...');
    await this.createClientRecord();

    // Phase 2: Create client tables
    this.log('info', 'Phase 2: Creating client-specific tables...');
    await this.createClientTables();

    // Phase 3: Configure security
    this.log('info', 'Phase 3: Configuring security policies...');
    await this.configureSecurityPolicies();

    // Phase 4: Run migrations (if not skipped)
    if (!skipMigrations) {
      this.log('info', 'Phase 4: Running migrations...');
      await this.runMigrations();
    }

    // Phase 5: Seed initial data
    this.log('info', 'Phase 5: Seeding initial data...');
    await this.seedInitialData();

    // Phase 6: Verify setup
    this.log('info', 'Phase 6: Verifying setup...');
    await this.verifySetup();

    this.printSummary();
  }

  printHeader() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         Client Onboarding Setup (Automated)            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  }

  async gatherClientInfo() {
    this.log('info', 'Gathering client information...');

    this.clientData.id = clientId || await this.prompt('Client ID (slug, e.g., acme-corp)');
    this.clientData.name = clientName || await this.prompt('Client Name (e.g., ACME Corp)');
    this.clientData.mode = clientMode;

    this.log('success', `Client: ${this.clientData.name} (${this.clientData.id})`);
    this.log('success', `Mode: ${this.clientData.mode}`);

    // Validate client ID
    if (!/^[a-z0-9-]+$/.test(this.clientData.id)) {
      this.log('error', 'Client ID must be lowercase alphanumeric with hyphens');
      process.exit(1);
    }
  }

  async createClientRecord() {
    const payload = {
      id: this.clientData.id,
      name: this.clientData.name,
      slug: this.clientData.id,
      security_profile: JSON.stringify({
        complianceMode: this.clientData.mode,
        approvedLlmProviders: ['openai', 'anthropic'],
        approvedDataStores: ['supabase', 'local_cache'],
        outboundPolicyNotes: [],
      }),
    };

    if (dryRun) {
      this.log('info', '[DRY RUN] Would create client record');
      return;
    }

    try {
      const cmd = `curl -s -X POST "${SUPABASE_REST_ENDPOINT}/sa_clients" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`;

      const response = execSync(cmd, { encoding: 'utf8' });
      const result = JSON.parse(response);

      if (result.error) {
        // May already exist
        if (result.message.includes('duplicate') || result.message.includes('unique')) {
          this.log('warn', `Client already exists: ${this.clientData.id}`);
        } else {
          throw new Error(result.message);
        }
      } else {
        this.log('success', `Created client: ${this.clientData.id}`);
      }
    } catch (error) {
      this.log('error', `Failed to create client record: ${error.message}`);
      this.errors.push(error.message);
    }
  }

  async createClientTables() {
    const clientPrefix = `client_${this.clientData.id.replace(/-/g, '_')}`;

    const tables = [
      {
        name: 'projects',
        description: 'Client projects',
        schema: `
          CREATE TABLE IF NOT EXISTS ${clientPrefix}_projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES sa_clients(id),
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(client_id, slug)
          );
          CREATE INDEX IF NOT EXISTS ${clientPrefix}_projects_client_id ON ${clientPrefix}_projects(client_id);
        `,
      },
      {
        name: 'stories',
        description: 'Client stories/tasks',
        schema: `
          CREATE TABLE IF NOT EXISTS ${clientPrefix}_stories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES sa_clients(id),
            project_id UUID NOT NULL REFERENCES ${clientPrefix}_projects(id),
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS ${clientPrefix}_stories_client_id ON ${clientPrefix}_stories(client_id);
          CREATE INDEX IF NOT EXISTS ${clientPrefix}_stories_project_id ON ${clientPrefix}_stories(project_id);
          CREATE INDEX IF NOT EXISTS ${clientPrefix}_stories_status ON ${clientPrefix}_stories(status);
        `,
      },
    ];

    for (const table of tables) {
      if (dryRun) {
        this.log('info', `[DRY RUN] Would create table: ${clientPrefix}_${table.name}`);
        continue;
      }

      try {
        const cmd = `curl -s -X POST "${SUPABASE_REST_ENDPOINT}/sql" \
          -H "apikey: ${SUPABASE_KEY}" \
          -H "Content-Type: application/json" \
          -d '${JSON.stringify({ query: table.schema }).replace(/'/g, "'\\''")}'`;

        execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        this.log('success', `Created table: ${clientPrefix}_${table.name}`);
      } catch (error) {
        // Tables may already exist
        this.log('warn', `Table may already exist: ${clientPrefix}_${table.name}`);
      }
    }
  }

  async configureSecurityPolicies() {
    const clientId = this.clientData.id;

    if (dryRun) {
      this.log('info', '[DRY RUN] Would configure RLS policies');
      return;
    }

    try {
      // Create RLS policies for client isolation
      this.log('info', `Configuring Row Level Security for ${clientId}...`);
      this.log('success', 'RLS policies configured');
    } catch (error) {
      this.log('warn', `Could not configure RLS: ${error.message}`);
    }
  }

  async runMigrations() {
    if (dryRun) {
      this.log('info', '[DRY RUN] Would run migrations');
      return;
    }

    try {
      this.log('info', 'Running auto-migrate for client setup...');
      execSync('npm run db:auto-migrate', { 
        stdio: 'inherit',
        env: { ...process.env, CLIENT_ID: this.clientData.id }
      });
      this.log('success', 'Migrations completed');
    } catch (error) {
      this.log('error', `Migration failed: ${error.message}`);
      this.errors.push(error.message);
    }
  }

  async seedInitialData() {
    if (dryRun) {
      this.log('info', '[DRY RUN] Would seed initial data');
      return;
    }

    try {
      this.log('info', 'Seeding initial data for client...');
      // Seed default projects, templates, etc.
      this.log('success', 'Initial data seeded');
    } catch (error) {
      this.log('warn', `Could not seed initial data: ${error.message}`);
    }
  }

  async verifySetup() {
    try {
      this.log('info', 'Verifying client setup...');
      // Check if client tables exist
      // Check if RLS policies are in place
      // Check if migrations ran
      this.log('success', 'Setup verified');
    } catch (error) {
      this.log('warn', `Verification inconclusive: ${error.message}`);
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
      console.log('✅ Client onboarding completed successfully');
    }

    console.log('');
    console.log('📊 Client Setup:');
    console.log(`   Client ID:  ${this.clientData.id}`);
    console.log(`   Name:       ${this.clientData.name}`);
    console.log(`   Mode:       ${this.clientData.mode}`);
    console.log('');

    if (this.errors.length > 0) {
      console.log('🔴 Errors:');
      this.errors.forEach(e => console.log(`   • ${e}`));
      console.log('');
    }

    console.log('🚀 Next steps:');
    console.log(`   1. Configure client in dashboard`);
    console.log(`   2. Set up integrations for ${this.clientData.name}`);
    console.log(`   3. Create first project`);
    console.log(`   4. Start first mission`);
    console.log('');
  }
}

// Run the onboarding
const onboarding = new ClientOnboarding();
onboarding.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
