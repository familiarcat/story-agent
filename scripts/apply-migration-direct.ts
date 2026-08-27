/**
 * scripts/apply-migration-direct.ts
 *
 * Direct migration application using Supabase client
 * Bypasses the CLI to apply the mission tables migration
 *
 * Run: npx tsx scripts/apply-migration-direct.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
  },
});

async function main() {
  console.log('🚀 Applying mission system migration...');

  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      'supabase/migrations/20260826000001_create_mission_tables.sql',
      'utf-8'
    );

    // Execute the migration (note: using service role key, so this is privileged)
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // exec_sql might not exist, try direct query execution instead
      console.log('ℹ️  exec_sql not available, trying direct execution...');

      // Split by GO or ;; and execute statements individually
      const statements = migrationSQL
        .split(/;\s*(?=--|\n|$)/)
        .filter((stmt) => stmt.trim() && !stmt.trim().startsWith('--'));

      for (const statement of statements) {
        if (!statement.trim()) continue;

        console.log(`\n📝 Executing: ${statement.substring(0, 60)}...`);

        const { error: execError } = await supabase.rpc('exec_query', {
          query: statement,
        });

        if (execError) {
          console.log(`⚠️  exec_query not available either`);
          // Migration must be done via CLI or dashboard
          throw new Error(
            'Cannot execute direct SQL via client. Use Supabase dashboard or CLI.'
          );
        }
      }
    }

    console.log('✅ Migration applied successfully!');

    // Verify tables were created
    const { data: tables, error: tableError } = await supabase.rpc(
      'get_table_list'
    );

    if (!tableError && tables) {
      const missionTables = (tables as any[]).filter((t: any) =>
        t.table_name.startsWith('sa_')
      );
      console.log(`\n📊 Mission tables created: ${missionTables.length}`);
      missionTables.forEach((t: any) => console.log(`   ✓ ${t.table_name}`));
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log(
      '\n💡 To apply the migration manually, use the Supabase dashboard:'
    );
    console.log(`1. Open: ${SUPABASE_URL}/project/_/sql`);
    console.log('2. Copy the SQL from supabase/migrations/20260826000001_create_mission_tables.sql');
    console.log('3. Paste into the SQL editor and click "Run"');
    process.exit(1);
  }
}

main();
