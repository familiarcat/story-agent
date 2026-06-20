import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Utility script to list all clients in the Sovereign Factory.
 */
async function main() {
  console.log('🔍 Querying clients table...');
  
  const db = await getDbClient();
  const { data, error } = await db
    .from('clients')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching clients:', error.message);
    process.exit(1);
  }

  console.log('✅ Clients found:');
  console.table(data || []);
}

main().catch(console.error);