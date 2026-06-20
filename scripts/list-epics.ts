import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Utility script to list all epics and verify the tiered hierarchy
 * (Global -> Client -> Project -> Epic -> Story)
 */
async function main() {
  console.log('🔍 Querying epics table and resolving hierarchy...');
  
  const db = await getDbClient();
  
  // Query epics with joined client and project names for verification
  const { data, error } = await db
    .from('epics')
    .select(`
      id,
      name,
      status,
      clients ( name ),
      projects ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching epics:', error.message);
    process.exit(1);
  }

  console.log('✅ Epics found in database:');
  const displayData = (data || []).map(epic => ({
    ID: epic.id,
    Epic: epic.name,
    Project: (epic.projects as any)?.name || 'Unknown',
    Client: (epic.clients as any)?.name || 'Unknown',
    Status: epic.status
  }));

  console.table(displayData);
}

main().catch(console.error);