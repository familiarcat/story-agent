import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to check the sa_security_audit table for recent entries
 * that include structural markers like 'TS_ANY_USAGE' or 'TS_UNDEFINED_USAGE'.
 */
async function verifyWorfGateStructuralMarkers() {
  console.log('🔍 [BRIDGE] Auditing sa_security_audit for structural markers (TS_ANY_USAGE, TS_UNDEFINED_USAGE)...');

  const db = await getDbClient();
  // Query recent audits
  const { data, error } = await db
    .from('sa_security_audit')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const structuralEntries = (data || []).filter(record => 
    record.detected_markers?.some((m: string) => ['TS_ANY_USAGE', 'TS_UNDEFINED_USAGE'].includes(m))
  );

  if (structuralEntries.length === 0) {
    console.log('📭 [BRIDGE] No recent audit entries found with structural markers. Ensure WorfGate is active.');
    return;
  }

  console.log(`✅ [BRIDGE] Found ${structuralEntries.length} audit entries with structural markers:`);
  console.table(structuralEntries.map(record => ({
    'Timestamp': record.timestamp.slice(11, 19),
    'Operation': record.operation,
    'Allowed': record.allowed ? '✅' : '❌',
    'Markers': record.detected_markers?.join(', '),
    'Score': record.security_sensitivity_score
  })));
}

verifyWorfGateStructuralMarkers().catch(console.error);