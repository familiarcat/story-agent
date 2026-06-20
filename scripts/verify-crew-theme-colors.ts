import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';

/**
 * Verification script to ensure all crew members in sa_crew_personas
 * have a correctly populated ui_theme_color.
 */
async function verifyCrewThemeColors() {
  console.log('🔍 [BRIDGE] Scanning crew manifest for LCARS station colors...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_crew_personas')
    .select('crew_id, full_name, ui_theme_color')
    .order('crew_id');

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log(`✅ [BRIDGE] Found ${data.length} crew members with assigned colors:`);
    console.table(data.map(p => ({
      'Crew ID': p.crew_id,
      'Full Name': p.full_name,
      'LCARS Color': p.ui_theme_color?.toUpperCase() || '⚠️ UNASSIGNED'
    })));
  } else {
    console.log('❌ [BRIDGE] No crew records found. Run the seed-crew-personas script.');
  }
}

verifyCrewThemeColors().catch(console.error);