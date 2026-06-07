/**
 * Crew Integrity System — No One Left Behind
 *
 * This module ensures all 11 crew members are initialized, accessible, and
 * present across all systems (Supabase, Redis, in-memory registry).
 *
 * The crew proactively checks on each other and pulls in missing members.
 *
 * "In this starship, we leave no one behind." — Captain Picard
 */

import { getDbClient } from '@story-agent/shared/db';
import {
  type CrewId,
  CREW_PERSONAS,
  CREW_MISSION_ORDER,
  buildPersonaSystemPrompt,
} from './crew-personas.js';
import { loadSkillManifest, buildEnrichedSystemPrompt } from './crew-skill-system.js';

export interface CrewMemberStatus {
  crewId: CrewId;
  fullName: string;
  status: 'present' | 'missing' | 'uninitialized';
  skillManifestExists: boolean;
  personaExists: boolean;
  lastCheckedAt: string;
  diagnostics: string[];
}

export interface CrewIntegrityReport {
  timestamp: string;
  totalCrew: number;
  presentCount: number;
  missingCount: number;
  crewStatuses: CrewMemberStatus[];
  allCrewPresent: boolean;
  recoveryActions: string[];
}

/**
 * Check if a crew member is properly initialized across all systems
 */
export async function checkCrewMemberStatus(crewId: CrewId): Promise<CrewMemberStatus> {
  const persona = CREW_PERSONAS[crewId];
  const diagnostics: string[] = [];

  try {
    const db = await getDbClient();

    // Check Supabase persona table
    const { data: personaData, error: personaError } = await db
      .from('sa_crew_personas')
      .select('crew_id')
      .eq('crew_id', crewId)
      .single();

    const personaExists = !personaError && !!personaData;
    if (personaError && personaError.code !== 'PGRST116') {
      diagnostics.push(`Persona table error: ${personaError.message}`);
    }
    if (!personaExists) {
      diagnostics.push('Persona not found in sa_crew_personas');
    }

    // Check Supabase skill manifest table
    const { data: skillData, error: skillError } = await db
      .from('sa_crew_skills')
      .select('crew_id, version')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const skillManifestExists = !skillError && !!skillData;
    if (skillError && skillError.code !== 'PGRST116') {
      diagnostics.push(`Skill manifest table error: ${skillError.message}`);
    }
    if (!skillManifestExists) {
      diagnostics.push('Skill manifest not found in sa_crew_skills');
    }

    // Determine overall status
    let status: 'present' | 'missing' | 'uninitialized' = 'present';
    if (!personaExists || !skillManifestExists) {
      status = 'uninitialized';
    }

    return {
      crewId,
      fullName: persona.fullName,
      status,
      skillManifestExists,
      personaExists,
      lastCheckedAt: new Date().toISOString(),
      diagnostics,
    };
  } catch (error) {
    return {
      crewId,
      fullName: persona.fullName,
      status: 'missing',
      skillManifestExists: false,
      personaExists: false,
      lastCheckedAt: new Date().toISOString(),
      diagnostics: [error instanceof Error ? error.message : 'Unknown error during check'],
    };
  }
}

/** * Recover crew member's personal memories and accumulated learnings.
 *
 * When a crew member is reactivated, we check if they have previous skill manifests
 * in the database. If found, we restore their self-improvement notes and learnings
 * so they don't start from a blank slate.
 *
 * This implements the principle: "We don't want crew members to completely start
 * from a blank slate if they have memories and actions that can be recalled."
 */
export async function recoverCrewMemberMemories(crewId: CrewId): Promise<{
  hasMemories: boolean;
  previousVersion?: string;
  recoveredImprovementNotes?: string[];
  lastImprovedAt?: string;
  diagnostics: string[];
}> {
  const diagnostics: string[] = [];

  try {
    const db = await getDbClient();

    // Query all previous skill manifests for this crew member, ordered by created_at descending
    const { data: allVersions, error } = await db
      .from('sa_crew_skills')
      .select('version, self_improvement_notes, last_improved_at')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(10); // Get up to 10 previous versions

    if (error) {
      diagnostics.push(`Error querying memories: ${error.message}`);
      return { hasMemories: false, diagnostics };
    }

    if (!allVersions || allVersions.length === 0) {
      diagnostics.push('No previous memories found for this crew member');
      return { hasMemories: false, diagnostics };
    }

    // Get the most recent version
    const mostRecent = allVersions[0];
    const recoveredNotes = (mostRecent.self_improvement_notes as string[]) ?? [];

    if (recoveredNotes.length === 0) {
      diagnostics.push(`Found skill history (v${mostRecent.version}) but no improvement notes to recover`);
      return {
        hasMemories: false,
        previousVersion: mostRecent.version,
        diagnostics,
      };
    }

    diagnostics.push(
      `Recovered ${recoveredNotes.length} improvement notes from v${mostRecent.version}`,
      `Last improved: ${mostRecent.last_improved_at}`
    );

    return {
      hasMemories: true,
      previousVersion: mostRecent.version,
      recoveredImprovementNotes: recoveredNotes,
      lastImprovedAt: mostRecent.last_improved_at,
      diagnostics,
    };
  } catch (error) {
    diagnostics.push(`Exception during memory recovery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { hasMemories: false, diagnostics };
  }
}

/** * Generate integrity report for all 11 crew members
 */
export async function generateCrewIntegrityReport(): Promise<CrewIntegrityReport> {
  const timestamp = new Date().toISOString();
  const crewStatuses: CrewMemberStatus[] = [];
  const recoveryActions: string[] = [];

  // Check all crew members
  for (const crewId of CREW_MISSION_ORDER) {
    const status = await checkCrewMemberStatus(crewId);
    crewStatuses.push(status);

    // If missing, plan recovery action
    if (status.status === 'missing' || status.status === 'uninitialized') {
      recoveryActions.push(`Initialize ${status.fullName} (${crewId})`);
    }
  }

  const presentCount = crewStatuses.filter(s => s.status === 'present').length;
  const missingCount = crewStatuses.filter(s => s.status !== 'present').length;

  return {
    timestamp,
    totalCrew: CREW_MISSION_ORDER.length,
    presentCount,
    missingCount,
    crewStatuses,
    allCrewPresent: missingCount === 0,
    recoveryActions,
  };
}

/**
 * Initialize a missing crew member across all systems
 */
export async function initializeMissingCrewMember(crewId: CrewId): Promise<{
  success: boolean;
  crewId: CrewId;
  personaInitialized: boolean;
  skillManifestInitialized: boolean;
  message: string;
}> {
  const persona = CREW_PERSONAS[crewId];
  let personaInitialized = false;
  let skillManifestInitialized = false;

  try {
    const db = await getDbClient();

    // Initialize persona if missing
    try {
      const { data: existing } = await db
        .from('sa_crew_personas')
        .select('crew_id')
        .eq('crew_id', crewId)
        .single();

      if (!existing) {
        const { error: insertError } = await db.from('sa_crew_personas').insert({
          crew_id: crewId,
          full_name: persona.fullName,
          rank: persona.rank,
          ship_role: persona.shipRole,
          engineering_role: persona.engineeringRole,
          tagline: persona.tagline,
          memory_alpha_url: persona.memoryAlphaUrl,
          personality_traits: persona.personalityTraits,
          domain_specialties: persona.specializations,
          defining_moments: persona.definingMoments,
          canonical_quotes: persona.canonicalQuotes,
          growth_areas: persona.growthAreas,
          collaborative_context: persona.keyRelationships,
          source_url: persona.memoryAlphaUrl,
          last_scraped_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error(`[crew-integrity] Error initializing persona for ${crewId}:`, insertError);
        } else {
          personaInitialized = true;
        }
      } else {
        personaInitialized = true; // Already exists
      }
    } catch (error) {
      console.error(`[crew-integrity] Persona initialization error:`, error);
    }

    // Initialize skill manifest if missing
    try {
      const { data: existing } = await db
        .from('sa_crew_skills')
        .select('crew_id')
        .eq('crew_id', crewId)
        .single();

      if (!existing) {
        const basePrompt = buildPersonaSystemPrompt(crewId);
        const now = new Date().toISOString();

        // Attempt to recover crew member's previous memories and learnings
        const memoryRecovery = await recoverCrewMemberMemories(crewId);
        let improvementNotes: string[] = [];
        let recoveryMessage = `[CREW_INTEGRITY] Initialized from crew integrity recovery`;

        if (memoryRecovery.hasMemories && memoryRecovery.recoveredImprovementNotes) {
          // Restore previous learnings
          improvementNotes = [
            `[CREW_INTEGRITY] Memories recovered from v${memoryRecovery.previousVersion}`,
            `[CREW_INTEGRITY] Restoring ${memoryRecovery.recoveredImprovementNotes.length} previous learnings`,
            ...memoryRecovery.recoveredImprovementNotes,
          ];
          recoveryMessage = `Crew member reactivated with restored memories from previous version`;
          console.log(
            `[crew-integrity] ${persona.fullName} reactivated with recovered memories (${memoryRecovery.recoveredImprovementNotes.length} learning notes)`
          );
        } else {
          improvementNotes = [recoveryMessage];
          console.log(`[crew-integrity] ${persona.fullName} initialized fresh (no previous memories found)`);
        }

        const { error: insertError } = await db.from('sa_crew_skills').insert({
          crew_id: crewId,
          version: '1.0.0',
          canonical_persona_hash: 'initial_seed',
          base_system_prompt: basePrompt,
          domain_system_prompt: `[Domain specialization for ${persona.engineeringRole}]`,
          mission_context_template: '{{mission_ref}}: {{story_description}}',
          tool_usage_examples: [],
          self_improvement_notes: improvementNotes,
          improvement_source: 'initial_seed',
          last_improved_at: now,
          created_at: now,
        });

        if (insertError) {
          console.error(`[crew-integrity] Error initializing skill manifest for ${crewId}:`, insertError);
        } else {
          skillManifestInitialized = true;
        }
      } else {
        skillManifestInitialized = true; // Already exists
      }
    } catch (error) {
      console.error(`[crew-integrity] Skill manifest initialization error:`, error);
    }

    const success = personaInitialized && skillManifestInitialized;
    return {
      success,
      crewId,
      personaInitialized,
      skillManifestInitialized,
      message: success
        ? `${persona.fullName} has rejoined the crew and is fully initialized`
        : `Partial initialization of ${persona.fullName} — some records may need manual intervention`,
    };
  } catch (error) {
    return {
      success: false,
      crewId,
      personaInitialized,
      skillManifestInitialized,
      message: `Failed to initialize ${persona.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Recover all missing crew members autonomously
 */
export async function recoverAllMissingCrewMembers(): Promise<{
  totalAttempted: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  recoveredCrew: CrewId[];
  report: CrewIntegrityReport;
}> {
  // First, generate integrity report to see who's missing
  const report = await generateCrewIntegrityReport();

  const missingCrewIds = report.crewStatuses
    .filter(s => s.status !== 'present')
    .map(s => s.crewId as CrewId);

  let successfulRecoveries = 0;
  const recoveredCrew: CrewId[] = [];

  // Attempt to recover each missing crew member
  for (const crewId of missingCrewIds) {
    const result = await initializeMissingCrewMember(crewId);
    if (result.success) {
      successfulRecoveries++;
      recoveredCrew.push(crewId);
    }
  }

  return {
    totalAttempted: missingCrewIds.length,
    successfulRecoveries,
    failedRecoveries: missingCrewIds.length - successfulRecoveries,
    recoveredCrew,
    report,
  };
}

/**
 * Get summary of crew integrity status
 */
export async function getCrewIntegritySummary(): Promise<string> {
  const report = await generateCrewIntegrityReport();

  let summary = `**Crew Integrity Report**\n\n`;
  summary += `Timestamp: ${report.timestamp}\n`;
  summary += `Total Crew: ${report.totalCrew}\n`;
  summary += `Present: ${report.presentCount}\n`;
  summary += `Missing: ${report.missingCount}\n`;
  summary += `Status: ${report.allCrewPresent ? '✅ ALL CREW PRESENT' : '⚠️ CREW MEMBERS MISSING'}\n\n`;

  if (!report.allCrewPresent) {
    summary += `**Missing Crew Members:**\n`;
    for (const status of report.crewStatuses) {
      if (status.status !== 'present') {
        summary += `- ${status.fullName} (${status.crewId}): ${status.status}\n`;
        if (status.diagnostics.length > 0) {
          summary += `  Diagnostics: ${status.diagnostics.join('; ')}\n`;
        }
      }
    }
  }

  return summary;
}
