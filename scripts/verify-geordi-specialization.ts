import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';

/**
 * Verification script to ensure Geordi's metadata in the database 
 * includes the 'infrastructure:scaffolding' specialization.
 */
async function verifyGeordiSpecialization() {
  console.log('🔍 [BRIDGE] Auditing Geordi\'s engineering manifest...');

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_crew_personas')
    .select('full_name, domain_specialties')
    .eq('crew_id', 'geordi')
    .single();

  if (error) {
    console.error('❌ [BRIDGE] Sensor Failure:', error.message);
    process.exit(1);
  }

  const specialties = data.domain_specialties || [];
  // We check for the explicit domain tag or the descriptive name assigned in crew-personas.ts
  const hasSpecialization = specialties.some((s: string) => 
    s.toLowerCase().includes('scaffolding')
  );

  console.log(`Crew Member: ${data.full_name}`);
  console.log(`Domain Specialties: [${specialties.join(', ')}]`);
  console.log(hasSpecialization ? "✅ [BRIDGE] Signal Verified: Geordi's manifest is optimized for VS Code scaffolding." : "❌ [BRIDGE] Signal Misrouted: Geordi is missing scaffolding specializations.");
}

verifyGeordiSpecialization().catch(console.error);