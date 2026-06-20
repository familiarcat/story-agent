import 'dotenv/config';
import { getDbClient, storeObservationMemory } from '../packages/shared/src/db.js';

/**
 * Strategic script to formalize Counselor Troi's recommendation 
 * for a standardized Bridge Console UI kit.
 * 
 * This updates the crew's organizational memory and Troi's skill manifest
 * with the new UI standards for future mission consoles.
 */
async function updateUiKitBaseline() {
  console.log('🖖 [BRIDGE] Formalizing Bridge Console UI Kit standards...');

  const uiKitSpec = {
    version: '1.0.0',
    name: 'Sovereign Bridge UI Standard',
    specifications: [
      'Layout: Modular card-based interfaces for high-density mission data.',
      'Contrast: Explicit Red Alert / Yellow Alert visual cues for story status.',
      'Interaction: Every console must feature an "Assume Station" direct-action button.',
      'Hierarchy: Primary domain tasks prioritized above support tasks.',
      'Consistency: Standardized telemetry widgets for health (Crusher) and security (Worf).'
    ],
    rationale: "Counselor Troi notes that standardizing the 'Bridge Console' reduces cognitive load for agents and human operators alike, accelerating the 'Consensus Resonance' effect."
  };

  const db = await getDbClient();

  // 1. Store as a permanent Baseline Memory in sa_observation_memories
  const memory = await storeObservationMemory({
    storyId: 'UI-KIT-BASELINE-V1',
    clientId: 'global',
    source: 'troi-ux-analysis',
    transcript: {
      consensusSummary: "Crew has formalized the Bridge Console UI Kit to standardize autonomous interfaces.",
      actionItems: uiKitSpec.specifications,
      uiKitSpec
    } as any,
    tags: ['baseline-memory', 'ui-kit', 'ux-standard', 'troi-recommendation']
  });

  console.log(`✅ [BRIDGE] UI Kit Baseline persisted to global memory (ID: ${memory.id})`);

  // 2. Update Troi's personal skill manifest so she "remembers" to enforce this
  const { data: latestManifest } = await db
    .from('sa_crew_skills')
    .select('*')
    .eq('crew_id', 'troi')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latestManifest) {
    const newNotes = [
      ...((latestManifest.self_improvement_notes as string[]) || []),
      `[UI-KIT-BASELINE] Enforce Sovereign Bridge UI Standard v1.0: ${uiKitSpec.specifications.join('; ')}`
    ];

    // Simple version increment (patch)
    const parts = latestManifest.version.split('.').map(Number);
    const newVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;

    await db.from('sa_crew_skills').insert({
      ...latestManifest,
      id: undefined, // Let DB generate new UUID
      version: newVersion,
      self_improvement_notes: newNotes,
      improvement_source: 'human_review',
      last_improved_at: new Date().toISOString(),
      created_at: undefined // Let DB set timestamp
    });

    console.log(`✅ [BRIDGE] Counselor Troi's skill manifest updated to v${newVersion} with UI standards.`);
  }

  console.log('🖖 [BRIDGE] All systems synchronized. The Bridge Console standard is now part of the fleet baseline.');
}

updateUiKitBaseline().catch(console.error);