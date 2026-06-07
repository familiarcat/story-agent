/**
 * Crew Database Access Layer — Bridge Between MCP Server and UI
 *
 * This module exposes crew data functions that the UI layer can call
 * without importing the MCP server. All functions use shared getDbClient()
 * to access Supabase directly.
 *
 * Provides:
 * - Crew skill manifest retrieval with versioning
 * - Crew persona canonical data
 * - Tool registry queries with Worf veto tracking
 * - Mission debrief history
 * - Redis-backed fast paths
 *
 * "Each member of the crew brings their own perspective..." — Captain Picard
 */

import { getDbClient } from './db.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types (re-exported for UI convenience)
export type CrewId = 'picard' | 'data' | 'riker' | 'geordi' | 'obrien' | 'worf' | 'yar' | 'troi' | 'crusher' | 'uhura' | 'quark';

export interface SkillManifest {
  id?: string;
  crewId: CrewId;
  version: string;
  canonicalPersonaHash: string;
  baseSystemPrompt: string;
  domainSystemPrompt: string;
  missionContextTemplate: string;
  toolUsageExamples: Array<{
    toolName: string;
    scenario: string;
    invocationExample: string;
    outcomeNotes: string;
  }>;
  selfImprovementNotes: string[];
  improvementSource: 'mission_debrief' | 'human_review' | 'peer_feedback' | 'initial_seed';
  lastImprovedAt?: string;
  createdAt?: string;
}

export interface CanonicalPersona {
  id: CrewId;
  fullName: string;
  rank: string;
  shipRole: string;
  engineeringRole: string;
  tagline: string;
  memoryAlphaUrl: string;
  personalityTraits: string[];
  specializations: string[];
  definingMoments: string[];
  canonicalQuotes: string[];
  growthAreas: string[];
  keyRelationships: Partial<Record<CrewId, string>>;
}

export interface ToolRecord {
  name: string;
  category: string;
  capabilities: string[];
  endpoint?: string;
  sourceReference?: string;
  qualityScore: number;
  costProfile: 'free' | 'paid' | 'self-hosted';
  securityClearance: 'approved' | 'review' | 'blocked';
  status: 'proposed' | 'under_evaluation' | 'approved' | 'rejected' | 'deprecated';
  worfVeto: boolean;
  worfVetoReason?: string;
  crewVotes?: Record<CrewId, 'approve' | 'reject' | 'abstain'>;
  crewEvaluationNotes?: Record<CrewId, string>;
  lastEvaluatedAt?: string;
  createdAt?: string;
}

export interface MissionDebrief {
  missionId: string;
  crewId: CrewId;
  findings: Array<{
    finding: string;
    proposedImprovement: string;
    confidence: number;
  }>;
  approvedImprovements: string[];
  worfReviewed: boolean;
  dataValidated: boolean;
  appliedAt?: string;
  createdAt?: string;
}

// ============================================================================
// CREW SKILL MANIFEST FUNCTIONS
// ============================================================================

/**
 * Get a single crew member's skill manifest by crew ID
 */
export async function getCrewSkillManifest(
  crewId: CrewId,
  options?: { includeEnrichedPrompt?: boolean; missionContext?: string }
): Promise<SkillManifest | null> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_crew_skills')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // no rows
      throw error;
    }

    const manifest: SkillManifest = {
      id: data.id,
      crewId: data.crew_id,
      version: data.version,
      canonicalPersonaHash: data.canonical_persona_hash,
      baseSystemPrompt: data.base_system_prompt,
      domainSystemPrompt: data.domain_system_prompt,
      missionContextTemplate: data.mission_context_template,
      toolUsageExamples: data.tool_usage_examples || [],
      selfImprovementNotes: data.self_improvement_notes || [],
      improvementSource: data.improvement_source,
      lastImprovedAt: data.last_improved_at,
      createdAt: data.created_at,
    };

    return manifest;
  } catch (error) {
    console.error(`[crew-db] Error loading skill manifest for ${crewId}:`, error);
    return null;
  }
}

/**
 * Get all crew skill manifests (current versions only)
 */
export async function getAllCrewSkillManifests(): Promise<SkillManifest[]> {
  try {
    const db = await getDbClient();

    // Get latest version for each crew member
    const { data, error } = await db
      .from('sa_crew_skills')
      .select('*')
      .order('crew_id, created_at DESC')
      .then(result => {
        if (result.error) return result;
        // Group by crew_id and take first (latest)
        const manifests = result.data as any[];
        const latest = new Map<string, any>();
        manifests.forEach(m => {
          if (!latest.has(m.crew_id)) latest.set(m.crew_id, m);
        });
        return { data: Array.from(latest.values()), error: null };
      });

    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      crewId: d.crew_id,
      version: d.version,
      canonicalPersonaHash: d.canonical_persona_hash,
      baseSystemPrompt: d.base_system_prompt,
      domainSystemPrompt: d.domain_system_prompt,
      missionContextTemplate: d.mission_context_template,
      toolUsageExamples: d.tool_usage_examples || [],
      selfImprovementNotes: d.self_improvement_notes || [],
      improvementSource: d.improvement_source,
      lastImprovedAt: d.last_improved_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error('[crew-db] Error loading all skill manifests:', error);
    return [];
  }
}

/**
 * Get skill manifest history for a crew member (all versions)
 */
export async function getCrewSkillManifestHistory(
  crewId: CrewId,
  limit: number = 10
): Promise<SkillManifest[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_crew_skills')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      crewId: d.crew_id,
      version: d.version,
      canonicalPersonaHash: d.canonical_persona_hash,
      baseSystemPrompt: d.base_system_prompt,
      domainSystemPrompt: d.domain_system_prompt,
      missionContextTemplate: d.mission_context_template,
      toolUsageExamples: d.tool_usage_examples || [],
      selfImprovementNotes: d.self_improvement_notes || [],
      improvementSource: d.improvement_source,
      lastImprovedAt: d.last_improved_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error(`[crew-db] Error loading skill history for ${crewId}:`, error);
    return [];
  }
}

// ============================================================================
// CREW PERSONA FUNCTIONS
// ============================================================================

/**
 * Get canonical persona for a crew member
 */
export async function getCrewPersona(crewId: CrewId): Promise<CanonicalPersona | null> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_crew_personas')
      .select('*')
      .eq('crew_id', crewId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.crew_id,
      fullName: data.full_name,
      rank: data.rank,
      shipRole: data.ship_role,
      engineeringRole: data.engineering_role,
      tagline: data.tagline,
      memoryAlphaUrl: data.memory_alpha_url,
      personalityTraits: data.personality_traits || [],
      specializations: data.domain_specialties || [],
      definingMoments: data.defining_moments || [],
      canonicalQuotes: data.canonical_quotes || [],
      growthAreas: data.growth_areas || [],
      keyRelationships: data.collaborative_context || {},
    };
  } catch (error) {
    console.error(`[crew-db] Error loading persona for ${crewId}:`, error);
    return null;
  }
}

/**
 * Get all crew personas
 */
export async function getAllCrewPersonas(): Promise<CanonicalPersona[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_crew_personas')
      .select('*')
      .order('crew_id');

    if (error) throw error;

    return (data || []).map(d => ({
      id: d.crew_id,
      fullName: d.full_name,
      rank: d.rank,
      shipRole: d.ship_role,
      engineeringRole: d.engineering_role,
      tagline: d.tagline,
      memoryAlphaUrl: d.memory_alpha_url,
      personalityTraits: d.personality_traits || [],
      specializations: d.domain_specialties || [],
      definingMoments: d.defining_moments || [],
      canonicalQuotes: d.canonical_quotes || [],
      growthAreas: d.growth_areas || [],
      keyRelationships: d.collaborative_context || {},
    }));
  } catch (error) {
    console.error('[crew-db] Error loading all personas:', error);
    return [];
  }
}

// ============================================================================
// TOOL REGISTRY FUNCTIONS
// ============================================================================

/**
 * Get complete tool registry with filters
 */
export async function getToolRegistry(filters?: {
  status?: string;
  category?: string;
  securityClearance?: string;
}): Promise<ToolRecord[]> {
  try {
    const db = await getDbClient();
    let query = db.from('sa_tool_registry').select('*');

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.securityClearance) query = query.eq('security_clearance', filters.securityClearance);

    const { data, error } = await query.order('last_evaluated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(d => ({
      name: d.name,
      category: d.category,
      capabilities: d.capabilities || [],
      endpoint: d.endpoint,
      sourceReference: d.source_reference,
      qualityScore: d.quality_score,
      costProfile: d.cost_profile,
      securityClearance: d.security_clearance,
      status: d.status,
      worfVeto: d.worf_veto,
      worfVetoReason: d.worf_veto_reason,
      crewVotes: d.crew_votes,
      crewEvaluationNotes: d.crew_evaluation_notes,
      lastEvaluatedAt: d.last_evaluated_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error('[crew-db] Error loading tool registry:', error);
    return [];
  }
}

/**
 * Get approved tools only
 */
export async function getApprovedTools(): Promise<ToolRecord[]> {
  return getToolRegistry({
    status: 'approved',
    securityClearance: 'approved',
  });
}

/**
 * Get tools blocked by Worf
 */
export async function getWorfVetoedTools(): Promise<ToolRecord[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_tool_registry')
      .select('*')
      .eq('worf_veto', true)
      .order('last_evaluated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(d => ({
      name: d.name,
      category: d.category,
      capabilities: d.capabilities || [],
      endpoint: d.endpoint,
      sourceReference: d.source_reference,
      qualityScore: d.quality_score,
      costProfile: d.cost_profile,
      securityClearance: d.security_clearance,
      status: d.status,
      worfVeto: d.worf_veto,
      worfVetoReason: d.worf_veto_reason,
      crewVotes: d.crew_votes,
      crewEvaluationNotes: d.crew_evaluation_notes,
      lastEvaluatedAt: d.last_evaluated_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error('[crew-db] Error loading Worf-vetoed tools:', error);
    return [];
  }
}

// ============================================================================
// MISSION DEBRIEF FUNCTIONS
// ============================================================================

/**
 * Get mission debriefs for a specific mission
 */
export async function getMissionDebriefs(missionId: string): Promise<MissionDebrief[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_mission_debriefs')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(d => ({
      missionId: d.mission_id,
      crewId: d.crew_id,
      findings: d.findings || [],
      approvedImprovements: d.approved_improvements || [],
      worfReviewed: d.worf_reviewed,
      dataValidated: d.data_validated,
      appliedAt: d.applied_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error(`[crew-db] Error loading debriefs for mission ${missionId}:`, error);
    return [];
  }
}

/**
 * Get all recent mission debriefs
 */
export async function getRecentMissionDebriefs(limit: number = 50): Promise<MissionDebrief[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_mission_debriefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(d => ({
      missionId: d.mission_id,
      crewId: d.crew_id,
      findings: d.findings || [],
      approvedImprovements: d.approved_improvements || [],
      worfReviewed: d.worf_reviewed,
      dataValidated: d.data_validated,
      appliedAt: d.applied_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error('[crew-db] Error loading recent debriefs:', error);
    return [];
  }
}

// ============================================================================
// CREW ROSTER & STATISTICS
// ============================================================================

/**
 * Get complete crew roster with skill versions and improvement counts
 */
export async function getCrewRosterWithStats(): Promise<
  Array<{
    crewId: CrewId;
    fullName: string;
    rank: string;
    role: string;
    skillVersion: string;
    improvementCount: number;
    lastImprovedAt: string | null;
  }>
> {
  try {
    const personas = await getAllCrewPersonas();
    const manifests = await getAllCrewSkillManifests();

    return personas.map(persona => {
      const manifest = manifests.find(m => m.crewId === persona.id);
      return {
        crewId: persona.id,
        fullName: persona.fullName,
        rank: persona.rank,
        role: persona.shipRole,
        skillVersion: manifest?.version || '1.0.0',
        improvementCount: manifest?.selfImprovementNotes.length || 0,
        lastImprovedAt: manifest?.lastImprovedAt || null,
      };
    });
  } catch (error) {
    console.error('[crew-db] Error building crew roster:', error);
    return [];
  }
}

/**
 * Get starship system status — comprehensive health report
 */
export async function getStarshipStatus(): Promise<{
  crew: {
    total: number;
    roster: Awaited<ReturnType<typeof getCrewRosterWithStats>>;
  };
  skills: {
    totalManifests: number;
    averageVersion: string;
    totalImprovements: number;
  };
  tools: {
    total: number;
    approved: number;
    worfVetoed: number;
    pending: number;
  };
  missions: {
    recentDebriefs: number;
    totalDebriefs: number;
  };
}> {
  try {
    const roster = await getCrewRosterWithStats();
    const allTools = await getToolRegistry();
    const recentDebriefs = await getRecentMissionDebriefs(100);

    const toolStats = {
      total: allTools.length,
      approved: allTools.filter(t => t.status === 'approved' && !t.worfVeto).length,
      worfVetoed: allTools.filter(t => t.worfVeto).length,
      pending: allTools.filter(t => t.status === 'proposed' || t.status === 'under_evaluation').length,
    };

    const totalImprovements = roster.reduce((sum, member) => sum + member.improvementCount, 0);
    const avgVersion = roster.length > 0 ? '1.0.' + Math.floor(totalImprovements / roster.length) : '1.0.0';

    return {
      crew: {
        total: roster.length,
        roster,
      },
      skills: {
        totalManifests: roster.length,
        averageVersion: avgVersion,
        totalImprovements,
      },
      tools: toolStats,
      missions: {
        recentDebriefs: recentDebriefs.length,
        totalDebriefs: recentDebriefs.length,
      },
    };
  } catch (error) {
    console.error('[crew-db] Error building starship status:', error);
    return {
      crew: { total: 0, roster: [] },
      skills: { totalManifests: 0, averageVersion: '1.0.0', totalImprovements: 0 },
      tools: { total: 0, approved: 0, worfVetoed: 0, pending: 0 },
      missions: { recentDebriefs: 0, totalDebriefs: 0 },
    };
  }
}
