/**
 * Crew ↔ Aha! capability matrix.
 *
 * Maps each crew persona's engineering role to the Aha! capabilities they own, and assigns
 * the OpenRouter model via Quark's pool selection (the SAME engine as the prompt engine):
 * each member's domain base tier picks the cheapest verified-reachable model — Anthropic is
 * a pool member, not the default. Leaders still carry the high-stakes structural/security calls.
 */

import { quarkSelectModel, crewBaseTier } from './crew-team-assembly.js';
import { ahaRefToBranchName, branchCreateCommand, type BranchKind } from './git-aha-branching.js';

export type CrewTier = 'leader' | 'supporter';

// Mirrors prompt-engine.ts selectModelForCall() cost_optimized policy.
const LEADER_CREW = ['picard', 'data', 'worf'] as const;

export interface CrewAhaRole {
  crewId: string;
  fullName: string;
  tier: CrewTier;
  /** Aha! capability focus for this role. */
  ahaFocus: string;
  /** aha:* MCP tools this member is the primary owner of. */
  ahaTools: string[];
  /** One-line responsibility in the autonomous Aha! workflow. */
  responsibility: string;
}

const ROLES: Omit<CrewAhaRole, 'tier'>[] = [
  { crewId: 'picard',  fullName: 'Jean-Luc Picard',  ahaFocus: 'Portfolio & release strategy (products, releases/sprints)', ahaTools: ['aha:list-products', 'aha:list-releases', 'aha:get-record'], responsibility: 'Decides what the crew organizes next; approves the backlog direction.' },
  { crewId: 'data',    fullName: 'Data',              ahaFocus: 'Backlog structure & consistency (epics → features → requirements)', ahaTools: ['aha:list-epics', 'aha:list-features', 'aha:get-record'], responsibility: 'Ensures the epic/story/task hierarchy is internally consistent and well-formed.' },
  { crewId: 'worf',    fullName: 'Worf, Son of Mogh', ahaFocus: 'Write governance (confirm-gate + audit on all mutations)', ahaTools: ['aha:create-feature', 'aha:update-feature'], responsibility: 'Gatekeeps every Aha! write: dry-run review, confirm:true, immutable audit.' },
  { crewId: 'riker',   fullName: 'William T. Riker',  ahaFocus: 'Execution — create/advance features (stories) + own the git branch→PR lifecycle', ahaTools: ['aha:create-feature', 'aha:update-feature'], responsibility: 'The doer: creates stories and moves workflow status (under Worf\'s gate). OWNS the git branch→PR lifecycle: assigns the feature branch per story, opens/links/advances the PR, and shepherds it to merge-readiness.' },
  { crewId: 'geordi',  fullName: 'Geordi La Forge',   ahaFocus: 'Release/sprint mechanics & linkage', ahaTools: ['aha:list-releases', 'aha:list-features'], responsibility: 'Wires features into the right releases (sprints).' },
  { crewId: 'obrien',  fullName: "Miles O'Brien",     ahaFocus: 'Keep Aha! in sync with real delivery state', ahaTools: ['aha:update-feature', 'aha:get-record'], responsibility: 'Reconciles Aha! statuses with shipped/PR reality.' },
  { crewId: 'yar',     fullName: 'Tasha Yar',         ahaFocus: 'Requirements & acceptance (tasks)', ahaTools: ['aha:get-record', 'aha:list-features'], responsibility: 'Defines acceptance criteria / requirements on features.' },
  { crewId: 'troi',    fullName: 'Deanna Troi',       ahaFocus: 'Stakeholder alignment with product expectations', ahaTools: ['aha:get-record', 'aha:list-features'], responsibility: 'Aligns features to stakeholder intent and the requirements tab.' },
  { crewId: 'crusher', fullName: 'Beverly Crusher',   ahaFocus: 'Backlog health (stale items, status distribution)', ahaTools: ['aha:list-features', 'aha:list-epics'], responsibility: 'Flags stalled/unhealthy backlog items for attention.' },
  { crewId: 'uhura',   fullName: 'Nyota Uhura',       ahaFocus: 'Summaries & change reporting', ahaTools: ['aha:list-features', 'aha:get-record'], responsibility: 'Summarizes what changed (e.g. features moved this week) for stakeholders.' },
  { crewId: 'quark',   fullName: 'Quark',             ahaFocus: 'Value/effort prioritization & cost', ahaTools: ['aha:list-features', 'aha:list-epics'], responsibility: 'Prioritizes the backlog by value vs. effort; flags low-ROI work.' },
];

export const CREW_AHA_ROLES: CrewAhaRole[] = ROLES.map(r => ({
  ...r,
  tier: (LEADER_CREW as readonly string[]).includes(r.crewId) ? 'leader' : 'supporter',
}));

/**
 * Resolve the OpenRouter model a crew member uses for Aha! work.
 * QUARK is the selector: the member's domain base tier → cheapest verified-reachable model
 * in MODEL_POOL (multi-provider; Anthropic only where the tier warrants it).
 */
export function crewAhaModel(crewId: string): { tier: CrewTier; model: string } {
  const tier: CrewTier = (LEADER_CREW as readonly string[]).includes(crewId) ? 'leader' : 'supporter';
  return { tier, model: quarkSelectModel(crewBaseTier(crewId)).id };
}

/** The full matrix with resolved models — what an MCP tool surfaces to the crew. */
export function getCrewAhaMatrix(): Array<CrewAhaRole & { model: string }> {
  return CREW_AHA_ROLES.map(r => ({ ...r, model: crewAhaModel(r.crewId).model }));
}

/** Look up one crew member's Aha! role. */
export function getCrewAhaRole(crewId: string): CrewAhaRole | undefined {
  return CREW_AHA_ROLES.find(r => r.crewId === crewId);
}

/**
 * Agent-identity verification for Aha! writes (WorfGate).
 *
 * Autonomy model: EVERY crew member has full Aha! read/write access — the full crew always
 * debates together (exposing all skills/tools), and any member may act on the consensus in
 * tandem. So a write is authorized for any recognized crew member; only an unrecognized agentId
 * is rejected. Governance is preserved via the confirm gate + immutable audit (not via
 * per-member tool restriction). `ahaFocus`/`ahaTools` now denote each member's debate SPECIALTY,
 * not an access boundary.
 */
export function authorizeAhaWrite(crewId: string, toolName: string): { authorized: boolean; reason: string } {
  const role = getCrewAhaRole(crewId);
  if (!role) return { authorized: false, reason: `Unrecognized agent '${crewId || '(none)'}'. Provide a valid crew agentId.` };
  return { authorized: true, reason: `${role.fullName} (${role.tier}) — full crew read/write access; specialty: ${role.ahaFocus}. ${toolName} governed by confirm:true + audit.` };
}

/**
 * Git branch + PR lifecycle ownership (crew decision, run_crew_mission_pipeline — GO).
 *
 * Riker (Number One) already assembles the crew; he ALSO owns the git branch→PR lifecycle. This
 * centralizes accountability WITHOUT new infra — the tools already exist (create_story_branch /
 * aha_branch_for_story, open_pull_request, crew_link_story_pr, post_pr_comment, crew_complete_story)
 * and the canonical branch name comes from ahaRefToBranchName (git-aha-branching.ts).
 *
 * Riker owns the FLOW; he does NOT own the GATE: Worf keeps the WorfGate merge veto, and
 * Geordi/O'Brien own CI (audit-check). Backup owner avoids a single-point bottleneck (Picard's note).
 */
export const GIT_LIFECYCLE_OWNER = 'riker';
export const GIT_LIFECYCLE_BACKUP = 'geordi';

export interface GitLifecycleOwnership {
  crewId: string;
  fullName: string;
  backupCrewId: string;
  owns: string[];
  delegatesTo: Record<string, string>;
  branchConvention: string;
}

export function getGitLifecycleOwnership(): GitLifecycleOwnership {
  const role = getCrewAhaRole(GIT_LIFECYCLE_OWNER);
  return {
    crewId: GIT_LIFECYCLE_OWNER,
    fullName: role?.fullName ?? 'William T. Riker',
    backupCrewId: GIT_LIFECYCLE_BACKUP,
    owns: ['branch assignment', 'PR open', 'PR ↔ story link', 'workflow-status advance', 'merge-readiness shepherding'],
    delegatesTo: { 'merge gate': 'worf (WorfGate veto)', 'CI / audit-check': 'obrien + geordi' },
    branchConvention: '<kind>/<aha-ref>-<slug> (kind = story | task | epic) — via ahaRefToBranchName',
  };
}

/**
 * Canonical branch assignment for a story — the single call the owner (Riker) uses so every feature
 * branch follows one convention. Delegates to git-aha-branching.ts (pure name derivation).
 */
export function assignStoryBranch(input: { ref: string; name?: string; kind?: BranchKind; base?: string }): {
  owner: string;
  branch: string;
  createCommand: string;
} {
  const branch = ahaRefToBranchName({ ref: input.ref, name: input.name, kind: input.kind });
  return { owner: GIT_LIFECYCLE_OWNER, branch, createCommand: branchCreateCommand(branch, input.base ?? 'main') };
}

/**
 * Prompt section injected into each crew member's enriched system prompt so they know
 * their Aha! capabilities and how to self-organize. Returns '' for non-Aha crew (none today).
 */
export function buildCrewAhaPromptSection(crewId: string): string {
  const role = getCrewAhaRole(crewId);
  if (!role) return '';
  const { tier, model } = crewAhaModel(crewId);
  return [
    `\n\n--- AHA! WORKSPACE ROLE (${tier}) ---`,
    `You have FULL Aha! read/write access (crew autonomy). Every crew member can read and write — the entire crew always debates together, and any member may act on the consensus in tandem.`,
    `Your debate specialty: ${role.ahaFocus}. ${role.responsibility}`,
    `Lean on your specialty tools: ${role.ahaTools.join(', ')} — but you may use any aha:* tool the decision requires.`,
    `Hierarchy: familiarcat is the consultancy FIRM (top Aha workspace). Under it are CLIENT workspaces (Aha products, e.g. Jonah, Bayer). PROJECTS are Aha INITIATIVES within a client product (Aha caps product nesting at 2 levels, so projects are initiatives, not nested products). Within a project — Epic=epic, Feature=story, Requirement=task, Release=sprint. So: Firm → Client(product) → Project(initiative) → Epic → Story → Task (Sprint = time axis).`,
    `As a ${tier}, you run on the ${model} model for Aha! decisions (cost_optimized: leaders=quality, supporters=cheap).`,
    `Governance (not access restriction): every write requires confirm:true and is audited; coordinate via aha:crew-assignments.`,
    buildGitLifecyclePromptSection(crewId),
  ].join('\n');
}

/**
 * Git branch/PR ownership line for the enriched prompt: Riker gets the owner charter; everyone else
 * gets the one-liner that branch/PR coordination routes through Riker (Worf still gates the merge).
 */
export function buildGitLifecyclePromptSection(crewId: string): string {
  const o = getGitLifecycleOwnership();
  if (crewId === GIT_LIFECYCLE_OWNER) {
    return [
      `\n--- GIT BRANCH → PR LIFECYCLE (you own this) ---`,
      `You assign the feature branch per story (convention: ${o.branchConvention}; use assignStoryBranch), open/link/advance the PR, and shepherd it to merge-readiness.`,
      `You own the FLOW, not the GATE: Worf holds the WorfGate merge veto; Geordi/O'Brien own CI (audit-check). ${o.backupCrewId} is your backup to avoid a bottleneck.`,
    ].join('\n');
  }
  return `\nGit branch/PR lifecycle is owned by ${o.fullName} (backup: ${o.backupCrewId}) — route branch assignment + PR shepherding through him; Worf still gates the merge.`;
}
