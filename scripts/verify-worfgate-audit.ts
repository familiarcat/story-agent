import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to check if WorfGate recorded the delivery
 * of the PCTMS-001 mission in the sa_security_audit table.
 */
async function verifyWorfGateAudit() {
  const operation = 'engage_sovereign_factory_delivery';
  const target = 'github';
  const clientId = process.env.TARGET_CLIENT_ID || 'bayer-int';

  console.log(`🔍 Searching 'sa_security_audit' for WorfGate entry:`);
  console.log(`   Operation: ${operation}`);
  console.log(`   Target:    ${target}`);
  console.log(`   Client ID: ${clientId}`);

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_security_audit')
    .select('*')
    .eq('operation', operation)
    .eq('target', target)
    .eq('client_id', clientId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    const record = data[0];
    console.log('✅ Success! WorfGate audit entry found in Supabase.');
    console.log('--------------------------------------------------------');
    console.log(`Audit ID:     ${record.id}`);
    console.log(`Timestamp:    ${record.timestamp}`);
    console.log(`Allowed:      ${record.allowed ? 'YES' : 'NO'}`);
    console.log(`Client ID:    ${record.client_id || 'GLOBAL'}`);
    console.log(`Sensitivity:  ${record.security_sensitivity_score}/100`);
    console.log(`Payload Hash: ${record.payload_hash}`);
    console.log(`Reasons:      ${record.reasons?.join(', ')}`);
    console.log(`Detected:     ${record.detected_markers?.join(', ')}`);
    console.log('--------------------------------------------------------');
  } else {
    console.log(`❌ No WorfGate audit entry found for operation '${operation}'.`);
    console.log('   Ensure the engage-sovereign-factory.ts script ran successfully and the audit table exists.');
  }
}

verifyWorfGateAudit().catch(console.error);