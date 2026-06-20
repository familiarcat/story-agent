"use strict";
// Shared types across MCP server and Next.js UI
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferTaskDomains = exports.generateDetailedCollaborationReport = exports.recommendCrewForGaps = exports.findCoverageGaps = exports.validateCrewCapability = exports.generateCrewBriefing = exports.getPrimaryCrewForTask = exports.routeTaskToCrew = exports.generateCrewExpertiseSummary = exports.getCrewExpertise = exports.CREW_EXPERTISE = exports.generateDomainOwnershipReport = exports.getCrewForTask = exports.getRelatedDomains = exports.hasExpertise = exports.getPrimaryExpert = exports.getDomainExperts = exports.DOMAIN_REGISTRY = exports.getCrewMemoryStats = exports.getCrewMemoriesByProject = exports.searchCrewPersonalMemoriesByEmbedding = exports.searchCrewPersonalMemories = exports.getCrewPersonalMemories = exports.storeCrewPersonalMemory = exports.getStarshipStatus = exports.getCrewRosterWithStats = exports.getRecentMissionDebriefs = exports.getMissionDebriefs = exports.getWorfVetoedTools = exports.getApprovedTools = exports.getToolRegistry = exports.getAllCrewPersonas = exports.getCrewPersona = exports.getCrewSkillManifestHistory = exports.getAllCrewSkillManifests = exports.getCrewSkillManifest = exports.EMBEDDING_DIMENSION = exports.cosineSimilarity = exports.parseVector = exports.toPgVector = exports.toEmbedding = exports.searchDocs = exports.getRoleGuidance = exports.listDocPhases = exports.retrieveDocKnowledge = exports.summarizeStructuredMemory = exports.buildStructuredMemoryPatchFromDebate = exports.mergeStructuredMemoryPatch = exports.initialStructuredMemoryState = exports.SOURCE_AUTHORITY = void 0;
exports.CREW_BASELINE_MEMORIES = void 0;
// Extends StoryRecord with sprint/agile fields (used in wizard output)
__exportStar(require("./client-scope.js"), exports);
__exportStar(require("./client-security-policy.js"), exports);
var structured_memory_js_1 = require("./structured-memory.js");
Object.defineProperty(exports, "SOURCE_AUTHORITY", { enumerable: true, get: function () { return structured_memory_js_1.SOURCE_AUTHORITY; } });
Object.defineProperty(exports, "initialStructuredMemoryState", { enumerable: true, get: function () { return structured_memory_js_1.initialStructuredMemoryState; } });
Object.defineProperty(exports, "mergeStructuredMemoryPatch", { enumerable: true, get: function () { return structured_memory_js_1.mergeStructuredMemoryPatch; } });
Object.defineProperty(exports, "buildStructuredMemoryPatchFromDebate", { enumerable: true, get: function () { return structured_memory_js_1.buildStructuredMemoryPatchFromDebate; } });
Object.defineProperty(exports, "summarizeStructuredMemory", { enumerable: true, get: function () { return structured_memory_js_1.summarizeStructuredMemory; } });
var db_docs_js_1 = require("./db-docs.js");
Object.defineProperty(exports, "retrieveDocKnowledge", { enumerable: true, get: function () { return db_docs_js_1.retrieveDocKnowledge; } });
Object.defineProperty(exports, "listDocPhases", { enumerable: true, get: function () { return db_docs_js_1.listDocPhases; } });
Object.defineProperty(exports, "getRoleGuidance", { enumerable: true, get: function () { return db_docs_js_1.getRoleGuidance; } });
Object.defineProperty(exports, "searchDocs", { enumerable: true, get: function () { return db_docs_js_1.searchDocs; } });
var embedding_js_1 = require("./embedding.js");
Object.defineProperty(exports, "toEmbedding", { enumerable: true, get: function () { return embedding_js_1.toEmbedding; } });
Object.defineProperty(exports, "toPgVector", { enumerable: true, get: function () { return embedding_js_1.toPgVector; } });
Object.defineProperty(exports, "parseVector", { enumerable: true, get: function () { return embedding_js_1.parseVector; } });
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return embedding_js_1.cosineSimilarity; } });
Object.defineProperty(exports, "EMBEDDING_DIMENSION", { enumerable: true, get: function () { return embedding_js_1.EMBEDDING_DIMENSION; } });
var crew_db_js_1 = require("./crew-db.js");
Object.defineProperty(exports, "getCrewSkillManifest", { enumerable: true, get: function () { return crew_db_js_1.getCrewSkillManifest; } });
Object.defineProperty(exports, "getAllCrewSkillManifests", { enumerable: true, get: function () { return crew_db_js_1.getAllCrewSkillManifests; } });
Object.defineProperty(exports, "getCrewSkillManifestHistory", { enumerable: true, get: function () { return crew_db_js_1.getCrewSkillManifestHistory; } });
Object.defineProperty(exports, "getCrewPersona", { enumerable: true, get: function () { return crew_db_js_1.getCrewPersona; } });
Object.defineProperty(exports, "getAllCrewPersonas", { enumerable: true, get: function () { return crew_db_js_1.getAllCrewPersonas; } });
Object.defineProperty(exports, "getToolRegistry", { enumerable: true, get: function () { return crew_db_js_1.getToolRegistry; } });
Object.defineProperty(exports, "getApprovedTools", { enumerable: true, get: function () { return crew_db_js_1.getApprovedTools; } });
Object.defineProperty(exports, "getWorfVetoedTools", { enumerable: true, get: function () { return crew_db_js_1.getWorfVetoedTools; } });
Object.defineProperty(exports, "getMissionDebriefs", { enumerable: true, get: function () { return crew_db_js_1.getMissionDebriefs; } });
Object.defineProperty(exports, "getRecentMissionDebriefs", { enumerable: true, get: function () { return crew_db_js_1.getRecentMissionDebriefs; } });
Object.defineProperty(exports, "getCrewRosterWithStats", { enumerable: true, get: function () { return crew_db_js_1.getCrewRosterWithStats; } });
Object.defineProperty(exports, "getStarshipStatus", { enumerable: true, get: function () { return crew_db_js_1.getStarshipStatus; } });
var db_js_1 = require("./db.js");
Object.defineProperty(exports, "storeCrewPersonalMemory", { enumerable: true, get: function () { return db_js_1.storeCrewPersonalMemory; } });
Object.defineProperty(exports, "getCrewPersonalMemories", { enumerable: true, get: function () { return db_js_1.getCrewPersonalMemories; } });
Object.defineProperty(exports, "searchCrewPersonalMemories", { enumerable: true, get: function () { return db_js_1.searchCrewPersonalMemories; } });
Object.defineProperty(exports, "searchCrewPersonalMemoriesByEmbedding", { enumerable: true, get: function () { return db_js_1.searchCrewPersonalMemoriesByEmbedding; } });
Object.defineProperty(exports, "getCrewMemoriesByProject", { enumerable: true, get: function () { return db_js_1.getCrewMemoriesByProject; } });
Object.defineProperty(exports, "getCrewMemoryStats", { enumerable: true, get: function () { return db_js_1.getCrewMemoryStats; } });
// ── Domain-Driven Crew Coordination ─────────────────────────────────────────
var domain_registry_js_1 = require("./lib/domain-registry.js");
Object.defineProperty(exports, "DOMAIN_REGISTRY", { enumerable: true, get: function () { return domain_registry_js_1.DOMAIN_REGISTRY; } });
Object.defineProperty(exports, "getDomainExperts", { enumerable: true, get: function () { return domain_registry_js_1.getDomainExperts; } });
Object.defineProperty(exports, "getPrimaryExpert", { enumerable: true, get: function () { return domain_registry_js_1.getPrimaryExpert; } });
Object.defineProperty(exports, "hasExpertise", { enumerable: true, get: function () { return domain_registry_js_1.hasExpertise; } });
Object.defineProperty(exports, "getRelatedDomains", { enumerable: true, get: function () { return domain_registry_js_1.getRelatedDomains; } });
Object.defineProperty(exports, "getCrewForTask", { enumerable: true, get: function () { return domain_registry_js_1.getCrewForTask; } });
Object.defineProperty(exports, "generateDomainOwnershipReport", { enumerable: true, get: function () { return domain_registry_js_1.generateDomainOwnershipReport; } });
var crew_expertise_js_1 = require("./lib/crew-expertise.js");
Object.defineProperty(exports, "CREW_EXPERTISE", { enumerable: true, get: function () { return crew_expertise_js_1.CREW_EXPERTISE; } });
Object.defineProperty(exports, "getCrewExpertise", { enumerable: true, get: function () { return crew_expertise_js_1.getCrewExpertise; } });
Object.defineProperty(exports, "generateCrewExpertiseSummary", { enumerable: true, get: function () { return crew_expertise_js_1.generateCrewExpertiseSummary; } });
var crew_task_routing_js_1 = require("./lib/crew-task-routing.js");
Object.defineProperty(exports, "routeTaskToCrew", { enumerable: true, get: function () { return crew_task_routing_js_1.routeTaskToCrew; } });
Object.defineProperty(exports, "getPrimaryCrewForTask", { enumerable: true, get: function () { return crew_task_routing_js_1.getPrimaryCrewForTask; } });
Object.defineProperty(exports, "generateCrewBriefing", { enumerable: true, get: function () { return crew_task_routing_js_1.generateCrewBriefing; } });
Object.defineProperty(exports, "validateCrewCapability", { enumerable: true, get: function () { return crew_task_routing_js_1.validateCrewCapability; } });
Object.defineProperty(exports, "findCoverageGaps", { enumerable: true, get: function () { return crew_task_routing_js_1.findCoverageGaps; } });
Object.defineProperty(exports, "recommendCrewForGaps", { enumerable: true, get: function () { return crew_task_routing_js_1.recommendCrewForGaps; } });
Object.defineProperty(exports, "generateDetailedCollaborationReport", { enumerable: true, get: function () { return crew_task_routing_js_1.generateDetailedCollaborationReport; } });
Object.defineProperty(exports, "inferTaskDomains", { enumerable: true, get: function () { return crew_task_routing_js_1.inferTaskDomains; } });
// ── Crew Baseline Knowledge ─────────────────────────────────────────────────
var crew_baseline_memories_js_1 = require("./lib/crew-baseline-memories.js");
Object.defineProperty(exports, "CREW_BASELINE_MEMORIES", { enumerable: true, get: function () { return crew_baseline_memories_js_1.CREW_BASELINE_MEMORIES; } });
//# sourceMappingURL=index.js.map