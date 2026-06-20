import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to confirm that Counselor Troi's skill manifest
 * has been updated with the Sovereign Bridge UI Standard v1.0 instructions.
 */
async function verifyTroiUiManifest() {
  console.log('🔍 [BRIDGE] Auditing Counselor Troi\'s manifest for UI Kit standards...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_crew_skills')
    .select('version, self_improvement_notes')
    .eq('crew_id', 'troi')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const notes = (data.self_improvement_notes as string[]) || [];
  const hasUiKit = notes.some(n => n.includes('[UI-KIT-BASELINE]'));

  console.log(`Troi Manifest Version: v${data.version}`);
  console.log(hasUiKit ? "✅ [BRIDGE] Signal Verified: Troi's manifest includes UI Kit Baseline standards." : "❌ [BRIDGE] Signal Misrouted: UI Kit standards missing from manifest.");
}

verifyTroiUiManifest().catch(console.error);