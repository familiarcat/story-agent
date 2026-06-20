"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrewSkillManifest = getCrewSkillManifest;
exports.getAllCrewSkillManifests = getAllCrewSkillManifests;
exports.getCrewSkillManifestHistory = getCrewSkillManifestHistory;
exports.getCrewPersona = getCrewPersona;
exports.getAllCrewPersonas = getAllCrewPersonas;
exports.getToolRegistry = getToolRegistry;
exports.getApprovedTools = getApprovedTools;
exports.getWorfVetoedTools = getWorfVetoedTools;
exports.getMissionDebriefs = getMissionDebriefs;
exports.getRecentMissionDebriefs = getRecentMissionDebriefs;
exports.getCrewRosterWithStats = getCrewRosterWithStats;
exports.getStarshipStatus = getStarshipStatus;
exports.getEpicsForProject = getEpicsForProject;
exports.getStoriesGroupedByEpic = getStoriesGroupedByEpic;
const db_js_1 = require("./db.js");
// ============================================================================
// CREW SKILL MANIFEST FUNCTIONS
// ============================================================================
/**
 * Get a single crew member's skill manifest by crew ID
 */
async function getCrewSkillManifest(crewId, options) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_crew_skills')
            .select('*')
            .eq('crew_id', crewId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // no rows
            throw error;
        }
        const manifest = {
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
    }
    catch (error) {
        console.error(`[crew-db] Error loading skill manifest for ${crewId}:`, error);
        return null;
    }
}
/**
 * Get all crew skill manifests (current versions only)
 */
async function getAllCrewSkillManifests() {
    try {
        const db = await (0, db_js_1.getDbClient)();
        // Get latest version for each crew member
        const { data, error } = await db
            .from('sa_crew_skills')
            .select('*')
            .order('crew_id, created_at DESC')
            .then(result => {
            if (result.error)
                return result;
            // Group by crew_id and take first (latest)
            const manifests = result.data;
            const latest = new Map();
            manifests.forEach(m => {
                if (!latest.has(m.crew_id))
                    latest.set(m.crew_id, m);
            });
            return { data: Array.from(latest.values()), error: null };
        });
        if (error)
            throw error;
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
    }
    catch (error) {
        console.error('[crew-db] Error loading all skill manifests:', error);
        return [];
    }
}
/**
 * Get skill manifest history for a crew member (all versions)
 */
async function getCrewSkillManifestHistory(crewId, limit = 10) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_crew_skills')
            .select('*')
            .eq('crew_id', crewId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
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
    }
    catch (error) {
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
async function getCrewPersona(crewId) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_crew_personas')
            .select('*')
            .eq('crew_id', crewId)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null;
            throw error;
        }
        return {
            id: data.crew_id,
            fullName: data.full_name,
            rank: data.rank,
            shipRole: data.ship_role,
            engineeringRole: data.engineering_role,
            tagline: data.tagline,
            consoleName: data.console_name,
            uiThemeColor: data.ui_theme_color || 'gold',
            memoryAlphaUrl: data.memory_alpha_url,
            personalityTraits: data.personality_traits || [],
            specializations: data.domain_specialties || [],
            definingMoments: data.defining_moments || [],
            canonicalQuotes: data.canonical_quotes || [],
            growthAreas: data.growth_areas || [],
            keyRelationships: data.collaborative_context || {},
        };
    }
    catch (error) {
        console.error(`[crew-db] Error loading persona for ${crewId}:`, error);
        return null;
    }
}
/**
 * Get all crew personas
 */
async function getAllCrewPersonas() {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_crew_personas')
            .select('*')
            .order('crew_id');
        if (error)
            throw error;
        return (data || []).map(d => ({
            id: d.crew_id,
            fullName: d.full_name,
            rank: d.rank,
            shipRole: d.ship_role,
            engineeringRole: d.engineering_role,
            tagline: d.tagline,
            consoleName: d.console_name,
            uiThemeColor: d.ui_theme_color || 'gold',
            memoryAlphaUrl: d.memory_alpha_url,
            personalityTraits: d.personality_traits || [],
            specializations: d.domain_specialties || [],
            definingMoments: d.defining_moments || [],
            canonicalQuotes: d.canonical_quotes || [],
            growthAreas: d.growth_areas || [],
            keyRelationships: d.collaborative_context || {},
        }));
    }
    catch (error) {
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
async function getToolRegistry(filters) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        let query = db.from('sa_tool_registry').select('*');
        if (filters?.status)
            query = query.eq('status', filters.status);
        if (filters?.category)
            query = query.eq('category', filters.category);
        if (filters?.securityClearance)
            query = query.eq('security_clearance', filters.securityClearance);
        const { data, error } = await query.order('last_evaluated_at', { ascending: false });
        if (error)
            throw error;
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
            uiMetadata: d.ui_metadata,
            lastEvaluatedAt: d.last_evaluated_at,
            createdAt: d.created_at,
        }));
    }
    catch (error) {
        console.error('[crew-db] Error loading tool registry:', error);
        return [];
    }
}
/**
 * Get approved tools only
 */
async function getApprovedTools() {
    return getToolRegistry({
        status: 'approved',
        securityClearance: 'approved',
    });
}
/**
 * Get tools blocked by Worf
 */
async function getWorfVetoedTools() {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_tool_registry')
            .select('*')
            .eq('worf_veto', true)
            .order('last_evaluated_at', { ascending: false });
        if (error)
            throw error;
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
            uiMetadata: d.ui_metadata,
            lastEvaluatedAt: d.last_evaluated_at,
            createdAt: d.created_at,
        }));
    }
    catch (error) {
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
async function getMissionDebriefs(missionId) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_mission_debriefs')
            .select('*')
            .eq('mission_id', missionId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
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
    }
    catch (error) {
        console.error(`[crew-db] Error loading debriefs for mission ${missionId}:`, error);
        return [];
    }
}
/**
 * Get all recent mission debriefs
 */
async function getRecentMissionDebriefs(limit = 50) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('sa_mission_debriefs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
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
    }
    catch (error) {
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
async function getCrewRosterWithStats() {
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
    }
    catch (error) {
        console.error('[crew-db] Error building crew roster:', error);
        return [];
    }
}
/**
 * Get starship system status — comprehensive health report
 */
async function getStarshipStatus() {
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
    }
    catch (error) {
        console.error('[crew-db] Error building starship status:', error);
        return {
            crew: { total: 0, roster: [] },
            skills: { totalManifests: 0, averageVersion: '1.0.0', totalImprovements: 0 },
            tools: { total: 0, approved: 0, worfVetoed: 0, pending: 0 },
            missions: { recentDebriefs: 0, totalDebriefs: 0 },
        };
    }
}
// ============================================================================
// EPIC & HIERARCHY FUNCTIONS
// ============================================================================
/**
 * Get all epics for a specific project
 */
async function getEpicsForProject(projectId) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        const { data, error } = await db
            .from('epics')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return (data || []).map(d => ({
            id: d.id,
            clientId: d.client_id,
            projectId: d.project_id,
            name: d.name,
            description: d.description,
            status: d.status,
            createdAt: d.created_at,
        }));
    }
    catch (error) {
        console.error(`[crew-db] Error loading epics for project ${projectId}:`, error);
        return [];
    }
}
/**
 * Get stories grouped by epic to support hierarchical UI visualization
 */
async function getStoriesGroupedByEpic(projectId) {
    try {
        const db = await (0, db_js_1.getDbClient)();
        // Fetch epics and stories in parallel
        const [epicsResult, storiesResult] = await Promise.all([
            db.from('epics').select('*').eq('project_id', projectId).order('name'),
            db.from('stories').select('*').eq('project_id', projectId)
        ]);
        if (epicsResult.error)
            throw epicsResult.error;
        if (storiesResult.error)
            throw storiesResult.error;
        return (epicsResult.data || []).map(epic => ({
            ...epic,
            stories: (storiesResult.data || []).filter(s => s.epic_id === epic.id)
        }));
    }
    catch (error) {
        console.error(`[crew-db] Error fetching epic hierarchy for project ${projectId}:`, error);
        return [];
    }
}
//# sourceMappingURL=crew-db.js.map