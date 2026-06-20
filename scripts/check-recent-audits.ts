import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Script to check the sa_security_audit table for recent entries.
 * Used to verify data availability for testing compliance reports.
 */
async function checkRecentAudits() {
  console.log('🔍 Querying sa_security_audit for recent activity...');

  const db = await getDbClient();
  const { data, error, count } = await db
    .from('sa_security_audit')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  console.log(`📊 Total audit records in table: ${count ?? 0}`);
  console.log('--------------------------------------------------------');

  if (data && data.length > 0) {
    console.log(`✅ Found ${data.length} recent entries:`);
    data.forEach((record) => {
      console.log(`[${record.timestamp}] [${record.client_id || 'GLOBAL'}] ${record.operation} -> ${record.target} (${record.allowed ? 'ALLOWED' : 'BLOCKED'}) [Sensitivity: ${record.security_sensitivity_score ?? 0}/100]`);
      console.log(`   Repo: ${record.repo_full_name || 'N/A'}`);
      console.log(`   Hash: ${record.payload_hash ? record.payload_hash.substring(0, 16) + '...' : '⚠️ MISSING'}`);
    });
    console.log('--------------------------------------------------------');
    console.log('🚀 Data is available to test the worfgate:generate-compliance-report tool.');
  } else {
    console.log('❌ No audit records found.');
    console.log('💡 Run the engage-sovereign-factory.ts script to generate some security audit data.');
  }
}

checkRecentAudits().catch(console.error);