import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to check the sa_crew_personas table
 * for the presence and population of the console_name column.
 */
async function verifyPersonaConsoles() {
  console.log('🔍 [BRIDGE] Scanning crew manifest for console assignments...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_crew_personas')
    .select('crew_id, full_name, console_name')
    .order('crew_id');

  if (error) {
    console.error('❌ [BRIDGE] Error querying crew personas:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log(`✅ [BRIDGE] Found ${data.length} crew members with console data:`);
    console.table(data.map(p => ({
      'Crew ID': p.crew_id,
      'Full Name': p.full_name,
      'Console Station': p.console_name || '⚠️ UNASSIGNED'
    })));
  } else {
    console.log('❌ [BRIDGE] No crew records found. Ensure the crew initialization has run.');
  }
}

verifyPersonaConsoles().catch(console.error);