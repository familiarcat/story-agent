// Shared types across MCP server and Next.js UI
// Selection-first UI contract — re-exported so the web (which imports @story-agent/shared bare) and
// the mcp-server share one source of truth. The VS Code extension mirrors it (esbuild, no bundle).
export * from './selection-contract.js';
// Crew/agent run-status contract — one shape rendered by <WorkflowStatus> on web + mirrored in vscode.
export * from './workflow-status.js';
// Async status registry — live cross-process view of in-flight async work (surfaced on every prompt).
export * from './async-status.js';
// Extends StoryRecord with sprint/agile fields (used in wizard output)
export * from './client-scope.js';
export * from './client-security-policy.js';
export * from './client-registry.js';
export * from './business-tier.js';
export * from './entitlements.js';
export * from './entitlement-sync.js';
export * from './worfgate-credentials.js';
export * from './skill-theory.js';
export { SOURCE_AUTHORITY, initialStructuredMemoryState, mergeStructuredMemoryPatch, buildStructuredMemoryPatchFromDebate, summarizeStructuredMemory, } from './structured-memory.js';
export { retrieveDocKnowledge, listDocPhases, getRoleGuidance, searchDocs, } from './db-docs.js';
export { toEmbedding, toPgVector, parseVector, cosineSimilarity, EMBEDDING_DIMENSION } from './embedding.js';
export { getCrewSkillManifest, getAllCrewSkillManifests, getCrewSkillManifestHistory, getCrewPersona, getAllCrewPersonas, getToolRegistry, getApprovedTools, getWorfVetoedTools, getMissionDebriefs, getRecentMissionDebriefs, getCrewRosterWithStats, getStarshipStatus, } from './crew-db.js';
export { storeCrewPersonalMemory, getCrewPersonalMemories, searchCrewPersonalMemories, searchCrewPersonalMemoriesByEmbedding, getCrewMemoriesByProject, getCrewMemoryStats, } from './db.js';
// ── Domain-Driven Crew Coordination ─────────────────────────────────────────
export { DOMAIN_REGISTRY, getDomainExperts, getPrimaryExpert, hasExpertise, getRelatedDomains, getCrewForTask, generateDomainOwnershipReport } from './lib/domain-registry.js';
export { CREW_EXPERTISE, getCrewExpertise, generateCrewExpertiseSummary } from './lib/crew-expertise.js';
export { routeTaskToCrew, getPrimaryCrewForTask, generateCrewBriefing, validateCrewCapability, findCoverageGaps, recommendCrewForGaps, generateDetailedCollaborationReport, inferTaskDomains } from './lib/crew-task-routing.js';
// ── Crew Baseline Knowledge ─────────────────────────────────────────────────
export { CREW_BASELINE_MEMORIES } from './lib/crew-baseline-memories.js';
// ── Delegation Router (reusable complexity/cost scorer) ──────────────────────
export { scoreDelegation } from './delegation-router.js';
export { laneForRoute, readLedger, recordCrewRun, summarizeLanes, laneBanner, buildStatusMarker, writeStatusMarker, statusPath } from './control-lane.js';
export { ImageInputSchema, MAX_IMAGE_BASE64_BYTES, imageInputToUrl, checkImageSize } from './image-input.js';
export { VISION_MODELS, VISION_MODEL_ARCHITECTURE, selectVisionModel, INTENT_COMPLEXITY, INTENT_PROMPTS, runVisionAnalysis } from './vision.js';
