"use strict";
/**
 * Domain-Based Task Routing & Crew Collaboration
 *
 * Routes tasks to appropriate crew members based on domain expertise.
 * Enables intelligent SME selection for crew collaboration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeTaskToCrew = routeTaskToCrew;
exports.getPrimaryCrewForTask = getPrimaryCrewForTask;
exports.generateCrewBriefing = generateCrewBriefing;
exports.validateCrewCapability = validateCrewCapability;
exports.findCoverageGaps = findCoverageGaps;
exports.recommendCrewForGaps = recommendCrewForGaps;
exports.generateDetailedCollaborationReport = generateDetailedCollaborationReport;
exports.inferTaskDomains = inferTaskDomains;
const domain_registry_js_1 = require("./domain-registry.js");
const crew_expertise_js_1 = require("./crew-expertise.js");
/**
 * Route a task to crew members based on domain expertise
 * Returns ordered list of crew members with matching expertise
 */
function routeTaskToCrew(context) {
    const crew = (0, domain_registry_js_1.getCrewForTask)(context.domains);
    return crew.map((c) => {
        const expertise = crew_expertise_js_1.CREW_EXPERTISE[c.crewId];
        return {
            crewId: c.crewId,
            role: expertise.title,
            primaryDomains: c.domains.filter((d) => d.expertise === 'primary').map((d) => d.domainId),
            secondaryDomains: c.domains.filter((d) => d.expertise === 'secondary').map((d) => d.domainId),
            expertise: c.domains.map((d) => d.domainId).join(', '),
        };
    });
}
/**
 * Get primary expert crew members for a task
 * Useful for identifying primary decision makers
 */
function getPrimaryCrewForTask(context) {
    return routeTaskToCrew(context).slice(0, 3); // Top 3 most relevant crew members
}
/**
 * Generate crew collaboration briefing for a task
 * Shows which crew members should collaborate and why
 */
function generateCrewBriefing(context) {
    const assignments = routeTaskToCrew(context);
    const relatedDomainsList = new Set();
    // Collect all related domains
    for (const domain of context.domains) {
        const related = (0, domain_registry_js_1.getRelatedDomains)(domain);
        related.forEach((d) => relatedDomainsList.add(d));
    }
    return {
        taskId: context.taskId,
        title: context.title,
        domains: context.domains,
        relatedDomains: Array.from(relatedDomainsList),
        crewAssignments: assignments,
        collaborationPlan: {
            primary: assignments.slice(0, 1).map(a => ({
                crewId: a.crewId,
                role: a.role,
                responsibility: 'Lead this task with primary expertise',
            })),
            secondary: assignments.slice(1, 3).map(a => ({
                crewId: a.crewId,
                role: a.role,
                responsibility: 'Support with complementary expertise',
            })),
            advisory: assignments.slice(3).map(a => ({
                crewId: a.crewId,
                role: a.role,
                responsibility: 'Available for consultation if needed',
            })),
        },
        expertise: Object.fromEntries(assignments.map(a => [
            a.crewId,
            {
                role: a.role,
                primaryDomains: a.primaryDomains,
                secondaryDomains: a.secondaryDomains,
            },
        ])),
        domainExplanations: Object.fromEntries(context.domains.map(domainId => [
            domainId,
            {
                name: domain_registry_js_1.DOMAIN_REGISTRY[domainId]?.name,
                description: domain_registry_js_1.DOMAIN_REGISTRY[domainId]?.description,
                experts: (0, domain_registry_js_1.getDomainExperts)(domainId).map((e) => ({
                    crewId: e.crewId,
                    expertise: e.expertise,
                    reason: e.reason,
                })),
            },
        ])),
    };
}
/**
 * Check if crew members have expertise for all task domains
 */
function validateCrewCapability(crewIds, taskDomains) {
    const crewExpertise = new Set();
    for (const crewId of crewIds) {
        const expertise = crew_expertise_js_1.CREW_EXPERTISE[crewId];
        if (!expertise)
            continue;
        expertise.primaryDomains.forEach((d) => crewExpertise.add(d));
        expertise.secondaryDomains.forEach((d) => crewExpertise.add(d));
    }
    return taskDomains.every(domain => crewExpertise.has(domain));
}
/**
 * Find coverage gaps - domains not covered by assigned crew
 */
function findCoverageGaps(crewIds, taskDomains) {
    const crewExpertise = new Set();
    for (const crewId of crewIds) {
        const expertise = crew_expertise_js_1.CREW_EXPERTISE[crewId];
        if (!expertise)
            continue;
        expertise.primaryDomains.forEach((d) => crewExpertise.add(d));
        expertise.secondaryDomains.forEach((d) => crewExpertise.add(d));
    }
    return taskDomains.filter(domain => !crewExpertise.has(domain));
}
/**
 * Recommend additional crew members to fill gaps
 */
function recommendCrewForGaps(gaps) {
    const recommended = new Map();
    for (const domainId of gaps) {
        const experts = (0, domain_registry_js_1.getDomainExperts)(domainId);
        for (const expert of experts) {
            if (!recommended.has(expert.crewId)) {
                const crewExpertise = crew_expertise_js_1.CREW_EXPERTISE[expert.crewId];
                recommended.set(expert.crewId, {
                    count: 1,
                    expertise: {
                        crewId: expert.crewId,
                        role: crewExpertise.title,
                        primaryDomains: crewExpertise.primaryDomains,
                        secondaryDomains: crewExpertise.secondaryDomains,
                        expertise: expert.expertise,
                    },
                });
            }
            else {
                recommended.get(expert.crewId).count++;
            }
        }
    }
    return Array.from(recommended.values())
        .sort((a, b) => b.count - a.count)
        .map(r => r.expertise);
}
/**
 * Generate detailed crew collaboration report
 * For documentation and transparency on how crews will work together
 */
function generateDetailedCollaborationReport(context) {
    const briefing = generateCrewBriefing(context);
    const allAssignments = Object.values(briefing.crewAssignments);
    // Check for gaps
    const gaps = findCoverageGaps(allAssignments.map(a => a.crewId), context.domains);
    const recommendations = gaps.length > 0 ? recommendCrewForGaps(gaps) : [];
    return {
        taskId: context.taskId,
        title: context.title,
        description: context.description,
        severity: context.severity || 'medium',
        timeframe: context.timeframe || 'soon',
        domains: {
            primary: context.domains,
            related: briefing.relatedDomains,
        },
        crewAssignments: briefing.crewAssignments,
        collaboration: briefing.collaborationPlan,
        coverageAnalysis: {
            domainsRequiredCount: context.domains.length,
            crewAssignedCount: allAssignments.length,
            expertiseCoveragePercentage: gaps.length === 0 ? 100 : Math.round(((context.domains.length - gaps.length) / context.domains.length) * 100),
            coverageGaps: gaps,
            recommendations: recommendations,
        },
        expectedWorkflow: [
            {
                phase: 'Understanding',
                owner: allAssignments[0].crewId,
                description: `${allAssignments[0].role} leads task understanding and domain analysis`,
            },
            {
                phase: 'Planning',
                owner: 'crew:coordination',
                description: 'All assigned crew members collaborate on approach planning',
            },
            {
                phase: 'Execution',
                owner: allAssignments.slice(0, 2).map(a => a.crewId).join(', '),
                description: 'Primary and secondary crew execute with assigned responsibilities',
            },
            {
                phase: 'Validation',
                owner: 'crew:validation',
                description: 'Crew validates work against domain requirements',
            },
            {
                phase: 'Documentation',
                owner: 'crew:documentation',
                description: 'Capture learnings and update baseline memories',
            },
        ],
        domainDetails: briefing.domainExplanations,
    };
}
/**
 * Generate task context automatically from task description
 * Uses NLP-inspired heuristics to identify likely domains
 */
function inferTaskDomains(description) {
    const lowercaseDesc = description.toLowerCase();
    const inferredDomains = new Set();
    const domainKeywords = {
        'database:schema': ['schema', 'table', 'column', 'type', 'consistency', 'data model'],
        'database:migration': ['migration', 'migrate', 'evolve', 'rpc', 'bootstrap'],
        'tenancy:isolation': ['client', 'tenant', 'isolation', 'segregation', 'rls', 'row-level'],
        'tenancy:onboarding': ['onboard', 'setup', 'configure', 'initialize', 'new client'],
        'deployment:cicd': ['ci/cd', 'github action', 'workflow', 'deploy', 'pipeline'],
        'security:rls': ['rls', 'row-level', 'access control', 'permission', 'policy'],
        'security:secrets': ['secret', 'credential', 'key', 'token', 'worfgate'],
        'security:audit': ['audit', 'security', 'vulnerability', 'compliance', 'threat'],
        'monitoring:health': ['health', 'connectivity', 'status', 'check', 'verify'],
        'monitoring:alerts': ['alert', 'notification', 'slack', 'incident', 'emergency'],
        'performance:indexing': ['index', 'optimize', 'query', 'performance', 'speed'],
        'performance:metrics': ['metric', 'measure', 'performance', 'throughput', 'latency'],
        'error:resilience': ['resilience', 'recovery', 'idempotent', 'failover', 'disaster'],
        'crew:coordination': ['crew', 'coordinate', 'collaborate', 'decision', 'consensus'],
        'documentation:guides': ['guide', 'documentation', 'howto', 'tutorial', 'runbook'],
    };
    for (const [domainId, keywords] of Object.entries(domainKeywords)) {
        if (keywords.some(kw => lowercaseDesc.includes(kw))) {
            inferredDomains.add(domainId);
        }
    }
    return Array.from(inferredDomains);
}
//# sourceMappingURL=crew-task-routing.js.map