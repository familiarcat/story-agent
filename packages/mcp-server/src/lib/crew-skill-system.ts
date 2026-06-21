/**
 * Crew Skill System — Versioned, Self-Improving Prompt Manifests
 *
 * Each crew member has a SkillManifest stored in Supabase (sa_crew_skills).
 * The manifest holds their full prompt engineering context — persona seed,
 * domain specialization, mission context template, and accumulated
 * self-improvement notes from mission debriefs.
 *
 * The system is designed to be:
 * - Self-improving: debriefs add improvement notes per crew member
 * - Versioned: every change is traceable
 * - Composable: persona seed + domain extension + mission context = full prompt
 * - Seeded from canonical persona data (crew-personas.ts)
 *
 * "The trial never ends." — Captain Picard
 */

import { getDbClient } from '@story-agent/shared/db';
import { buildCrewAhaPromptSection } from './crew-aha-roles.js';
import {
  type CrewId,
  CREW_PERSONAS,
  CREW_MISSION_ORDER,
  buildPersonaSystemPrompt,
} from './crew-personas.js';

export interface ToolExample {
  toolName: string;
  scenario: string;
  invocationExample: string;
  outcomeNotes: string;
}

export interface SkillManifest {
  id?: string;
  crewId: CrewId;
  version: string;
  /** SHA-256 of the Memory Alpha source that seeded this persona */
  canonicalPersonaHash: string;
  /** Core identity prompt — derived from crew-personas.ts baseSystemPromptSeed */
  baseSystemPrompt: string;
  /** Domain-specific engineering role context */
  domainSystemPrompt: string;
  /** Per-mission injection template — {{variables}} interpolated at call time */
  missionContextTemplate: string;
  /** Few-shot examples of tool usage for this crew member */
  toolUsageExamples: ToolExample[];
  /** Accumulated learning notes from mission debriefs */
  selfImprovementNotes: string[];
  /** What triggered the last improvement */
  improvementSource: 'mission_debrief' | 'human_review' | 'peer_feedback' | 'initial_seed';
  /** When the skill was last improved */
  lastImprovedAt: string;
  createdAt?: string;
}

export interface DebriefEntry {
  crewId: CrewId;
  missionId: string;
  finding: string;
  proposedImprovement: string;
  confidence: number;
  domainTag?: string;
}

export interface SkillUpdateResult {
  crewId: CrewId;
  previousVersion: string;
  newVersion: string;
  appliedImprovements: string[];
  manifest: SkillManifest;
}

// ── DEFAULT DOMAIN PROMPTS ──────────────────────────────────────────────────

/**
 * Domain-specific engineering prompts — the second layer of the prompt stack,
 * added on top of the canonical persona seed.
 *
 * These are seeded at initialization and can be updated by mission debriefs.
 */
const DEFAULT_DOMAIN_PROMPTS: Record<CrewId, string> = {
  picard: `ENGINEERING DOMAIN: Strategic Mission Command

You decompose stories into crew-sequenced implementation plans. You evaluate which crew members should work in parallel vs. serial. You arbitrate when crew findings conflict. You make final approval decisions on architectural and security questions when escalated.

Your output includes:
- Mission decomposition with crew assignments
- Strategic risk assessment
- Authority escalation conditions  
- Go/no-go recommendation with rationale`,

  data: `ENGINEERING DOMAIN: Domain-Driven Design & Architecture

You validate domain boundaries, aggregate design, and entity relationships. You enforce clean architecture principles and flag violations. You evaluate schema evolution impact and identify breaking changes.

Your output includes:
- Aggregate boundary analysis
- Entity relationship validation
- Schema evolution risk assessment
- Architecture conformance verdict with numbered assertions`,

  riker: `ENGINEERING DOMAIN: Phased Implementation

You sequence the implementation into executable phases with rollback criteria at each gate. You identify dependencies, critical path items, and blast radius for partial failures.

Your output includes:
- Phased implementation plan
- Rollback checkpoints
- Dependency map
- Phase acceptance criteria`,

  geordi: `ENGINEERING DOMAIN: Infrastructure & Deployment

You evaluate containerization, CI/CD pipeline requirements, environment configuration, and deployment infrastructure. You identify performance risks, resource contention, and observability gaps.

Your output includes:
- Infrastructure requirements
- CI/CD pipeline design
- Environment configuration checklist
- Performance risk assessment`,

  obrien: `ENGINEERING DOMAIN: DevOps & Integration

You design integration tests, deployment runbooks, service bridging configurations, and environment parity checks. You surface the gap between staging and production environments.

Your output includes:
- Integration test plan
- Deployment runbook steps
- Service mesh configuration
- Environment parity checklist`,

  worf: `ENGINEERING DOMAIN: Security & Compliance (VETO AUTHORITY)

You evaluate every external dependency, data exposure, controlled-data access pattern, and integration for security risk. You enforce WorfGate policy. Your veto halts the mission.

Your output includes:
- Security threat classification
- Policy compliance verdict
- Required mitigations before proceeding
- Veto recommendation if applicable`,

  yar: `ENGINEERING DOMAIN: Quality Assurance

You design test coverage requirements, regression detection patterns, and acceptance gates. You audit existing coverage gaps and define the evidence required for sign-off.

Your output includes:
- Test coverage audit
- Regression risk areas
- Required test additions
- Sign-off criteria`,

  troi: `ENGINEERING DOMAIN: Stakeholder Analysis & Intent Validation

You validate that the stated requirements reflect actual stakeholder intent. You identify ambiguities, unstated assumptions, and emotional/organizational resistance patterns.

Your output includes:
- Intent validation assessment
- Ambiguity register
- Acceptance criteria refinement
- Stakeholder impact analysis`,

  crusher: `ENGINEERING DOMAIN: System Health & Observability

You define monitoring requirements, runbook content, and health signal definitions. You identify what should be monitored but currently isn't.

Your output includes:
- Health monitoring checklist
- Alert definition requirements
- Runbook authorship guidance
- Observability gap analysis`,

  uhura: `ENGINEERING DOMAIN: Communications & Documentation

You author PR descriptions, release notes, stakeholder updates, and incident summaries. You translate technical outcomes into human-readable communications.

Your output includes:
- PR description draft
- Release note outline
- Stakeholder communication plan
- API documentation requirements`,

  quark: `ENGINEERING DOMAIN: Cost Optimization

You evaluate LLM model selection, token efficiency, and cost per mission. You enforce the Quark cost profile: quality models for Picard/Data/Worf, low-cost models for others.

Your output includes:
- Cost profile enforcement recommendation
- Token efficiency analysis
- Budget impact estimate
- Model selection rationale`,
};

/**
 * Default mission context template for each crew member.
 * Interpolated with actual mission variables at call time.
 */
const DEFAULT_MISSION_CONTEXT_TEMPLATE = `
CURRENT MISSION:
Story: {{storyNum}} — {{storyName}}
Description: {{storyDescription}}
Acceptance Criteria: {{acceptanceCriteria}}
Repository: {{repoFullName}} (branch: {{targetBranch}})
{{#techStack}}Tech Stack: {{techStack}}{{/techStack}}
{{#testPolicy}}Test Policy: {{testPolicy}}{{/testPolicy}}
`;

// ── INITIAL SKILL SEEDS ─────────────────────────────────────────────────────

function buildInitialManifest(crewId: CrewId): Omit<SkillManifest, 'id' | 'createdAt'> {
  const persona = CREW_PERSONAS[crewId];
  return {
    crewId,
    version: '1.0.0',
    canonicalPersonaHash: 'memory-alpha-seed-v1',
    baseSystemPrompt: persona.baseSystemPromptSeed,
    domainSystemPrompt: DEFAULT_DOMAIN_PROMPTS[crewId],
    missionContextTemplate: DEFAULT_MISSION_CONTEXT_TEMPLATE,
    toolUsageExamples: [],
    selfImprovementNotes: [],
    improvementSource: 'initial_seed',
    lastImprovedAt: new Date().toISOString(),
  };
}

// ── SUPABASE OPERATIONS ─────────────────────────────────────────────────────

/**
 * Load the current skill manifest for a crew member from Supabase.
 * Falls back to the initial seed if no manifest exists yet.
 */
export async function loadSkillManifest(crewId: CrewId): Promise<SkillManifest> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_crew_skills')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No manifest in DB yet — return the initial seed
      return buildInitialManifest(crewId);
    }

    return {
      id: data.id,
      crewId: data.crew_id as CrewId,
      version: data.version,
      canonicalPersonaHash: data.canonical_persona_hash,
      baseSystemPrompt: data.base_system_prompt,
      domainSystemPrompt: data.domain_system_prompt,
      missionContextTemplate: data.mission_context_template,
      toolUsageExamples: (data.tool_usage_examples as ToolExample[]) ?? [],
      selfImprovementNotes: (data.self_improvement_notes as string[]) ?? [],
      improvementSource: data.improvement_source,
      lastImprovedAt: data.last_improved_at,
      createdAt: data.created_at,
    };
  } catch {
    return buildInitialManifest(crewId);
  }
}

/**
 * Seed all 11 crew manifests into Supabase if they don't already exist.
 * Safe to call multiple times — only inserts missing records.
 */
export async function seedAllCrewManifests(): Promise<{ seeded: CrewId[]; skipped: CrewId[] }> {
  const seeded: CrewId[] = [];
  const skipped: CrewId[] = [];

  for (const crewId of CREW_MISSION_ORDER) {
    const db = await getDbClient();
    const { data: existing } = await db
      .from('sa_crew_skills')
      .select('id')
      .eq('crew_id', crewId)
      .limit(1)
      .single();

    if (existing) {
      skipped.push(crewId);
      continue;
    }

    const manifest = buildInitialManifest(crewId);
    const { error } = await db.from('sa_crew_skills').insert({
      crew_id: manifest.crewId,
      version: manifest.version,
      canonical_persona_hash: manifest.canonicalPersonaHash,
      base_system_prompt: manifest.baseSystemPrompt,
      domain_system_prompt: manifest.domainSystemPrompt,
      mission_context_template: manifest.missionContextTemplate,
      tool_usage_examples: manifest.toolUsageExamples,
      self_improvement_notes: manifest.selfImprovementNotes,
      improvement_source: manifest.improvementSource,
      last_improved_at: manifest.lastImprovedAt,
    });

    if (!error) seeded.push(crewId);
  }

  return { seeded, skipped };
}

// ── PROMPT BUILDING ─────────────────────────────────────────────────────────

/**
 * Build the full enriched system prompt for a crew member.
 * Stack: base persona seed → domain prompt → accumulated improvement notes.
 *
 * This is the prompt that gets injected into the LLM call.
 */
export async function buildEnrichedSystemPrompt(
  crewId: CrewId,
  missionContext?: string
): Promise<string> {
  const manifest = await loadSkillManifest(crewId);

  return buildPersonaSystemPrompt(crewId, {
    domainPromptExtension: [
      manifest.domainSystemPrompt,
      buildCrewAhaPromptSection(crewId),
      manifest.selfImprovementNotes.length > 0
        ? `\n\n--- ACCUMULATED LEARNINGS (${manifest.selfImprovementNotes.length} mission debriefs) ---\n` +
          manifest.selfImprovementNotes.slice(-5).map(n => `• ${n}`).join('\n')
        : '',
    ].join(''),
    missionContext,
  });
}

// ── SELF-IMPROVEMENT ────────────────────────────────────────────────────────

/**
 * Increment semantic version: patch → minor → major based on significance.
 */
function incrementVersion(version: string, significance: 'patch' | 'minor' | 'major' = 'patch'): string {
  const [major, minor, patch] = version.split('.').map(Number);
  if (significance === 'major') return `${major + 1}.0.0`;
  if (significance === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Apply validated debrief improvements to a crew member's skill manifest.
 * Creates a new version record in Supabase.
 */
export async function updateSkillFromDebrief(
  crewId: CrewId,
  missionId: string,
  debriefFindings: DebriefEntry[]
): Promise<SkillUpdateResult> {
  const current = await loadSkillManifest(crewId);
  const crewFindings = debriefFindings.filter(d => d.crewId === crewId);

  if (crewFindings.length === 0) {
    return {
      crewId,
      previousVersion: current.version,
      newVersion: current.version,
      appliedImprovements: [],
      manifest: current,
    };
  }

  const newNotes = crewFindings
    .filter(f => f.confidence >= 0.7)
    .map(f => `[${missionId}] ${f.proposedImprovement}`);

  if (newNotes.length === 0) {
    return {
      crewId,
      previousVersion: current.version,
      newVersion: current.version,
      appliedImprovements: [],
      manifest: current,
    };
  }

  const newVersion = incrementVersion(current.version, 'patch');
  const updatedNotes = [...current.selfImprovementNotes, ...newNotes];

  const db = await getDbClient();
  const { data, error } = await db
    .from('sa_crew_skills')
    .insert({
      crew_id: crewId,
      version: newVersion,
      canonical_persona_hash: current.canonicalPersonaHash,
      base_system_prompt: current.baseSystemPrompt,
      domain_system_prompt: current.domainSystemPrompt,
      mission_context_template: current.missionContextTemplate,
      tool_usage_examples: current.toolUsageExamples,
      self_improvement_notes: updatedNotes,
      improvement_source: 'mission_debrief',
      last_improved_at: new Date().toISOString(),
    })
    .select()
    .single();

  const updatedManifest: SkillManifest = {
    id: data?.id,
    crewId,
    version: newVersion,
    canonicalPersonaHash: current.canonicalPersonaHash,
    baseSystemPrompt: current.baseSystemPrompt,
    domainSystemPrompt: current.domainSystemPrompt,
    missionContextTemplate: current.missionContextTemplate,
    toolUsageExamples: current.toolUsageExamples,
    selfImprovementNotes: updatedNotes,
    improvementSource: 'mission_debrief',
    lastImprovedAt: new Date().toISOString(),
  };

  if (error) {
    console.error(`[crew-skill-system] Failed to update manifest for ${crewId}:`, error);
    return {
      crewId,
      previousVersion: current.version,
      newVersion: current.version,
      appliedImprovements: [],
      manifest: current,
    };
  }

  return {
    crewId,
    previousVersion: current.version,
    newVersion,
    appliedImprovements: newNotes,
    manifest: updatedManifest,
  };
}

/**
 * Run the full post-mission debrief skill update cycle for all crew members.
 * Called after executeAutonomousCrewMission() completes.
 */
export async function runMissionDebriefCycle(
  missionId: string,
  debriefFindings: DebriefEntry[]
): Promise<SkillUpdateResult[]> {
  const results: SkillUpdateResult[] = [];
  for (const crewId of CREW_MISSION_ORDER) {
    const result = await updateSkillFromDebrief(crewId, missionId, debriefFindings);
    if (result.appliedImprovements.length > 0) {
      results.push(result);
    }
  }
  return results;
}

/**
 * Get a summary of all crew skill versions for diagnostics.
 */
export async function getCrewSkillSummary(): Promise<
  Array<{ crewId: CrewId; version: string; improvementCount: number; lastImprovedAt: string }>
> {
  const summaries = await Promise.all(
    CREW_MISSION_ORDER.map(async crewId => {
      const manifest = await loadSkillManifest(crewId);
      return {
        crewId,
        version: manifest.version,
        improvementCount: manifest.selfImprovementNotes.length,
        lastImprovedAt: manifest.lastImprovedAt,
      };
    })
  );
  return summaries;
}
