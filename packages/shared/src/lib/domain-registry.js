"use strict";
/**
 * Domain Registry & Crew Expertise Mapping
 *
 * Domain-Driven Design: Map system domains to crew members based on their expertise.
 * Multiple crew members can own the same domain (for diverse perspectives).
 * Tasks are routed to relevant SMEs based on domain classification.
 *
 * Domains are identified from the automated migration system and broader application:
 * 1. Database/Schema Management
 * 2. Multi-Tenancy & Client Isolation
 * 3. CI/CD & Deployment Automation
 * 4. System Health & Monitoring
 * 5. Security & Access Control
 * 6. Documentation & Knowledge Transfer
 * 7. Performance & Optimization
 * 8. Error Handling & Resilience
 * 9. Infrastructure as Code
 * 10. Crew Coordination & Protocols
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAIN_REGISTRY = void 0;
exports.getCrewDomains = getCrewDomains;
exports.getDomainExperts = getDomainExperts;
exports.getPrimaryExpert = getPrimaryExpert;
exports.hasExpertise = hasExpertise;
exports.getRelatedDomains = getRelatedDomains;
exports.getCrewForTask = getCrewForTask;
exports.generateDomainOwnershipReport = generateDomainOwnershipReport;
exports.DOMAIN_REGISTRY = {
    // Domain 1: Database/Schema Management
    'database:schema': {
        name: 'Database Schema Management',
        description: 'Table design, migrations, schema evolution, data modeling',
        owners: [
            {
                crewId: 'data',
                expertise: 'primary',
                reason: 'Architecture & type systems expert — ensures schema consistency & domain boundaries',
            },
            {
                crewId: 'obrien',
                expertise: 'secondary',
                reason: 'Operations expert — ensures schema supports production reliability',
            },
            {
                crewId: 'crusher',
                expertise: 'tertiary',
                reason: 'Testing expert — validates schema handles all edge cases',
            },
        ],
        relatedDomains: ['database:migration', 'security:rls', 'performance:indexing'],
    },
    'database:migration': {
        name: 'Database Migrations',
        description: 'Migration scripts, bootstrap RPC, idempotent execution, rollback strategy',
        owners: [
            {
                crewId: 'data',
                expertise: 'primary',
                reason: 'Ensures migrations maintain type safety & consistency',
            },
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Ensures migrations are reliable & handle production constraints',
            },
            {
                crewId: 'quark',
                expertise: 'secondary',
                reason: 'Monitors migration cost & resource usage',
            },
        ],
        relatedDomains: ['database:schema', 'infrastructure:automation', 'error:resilience'],
    },
    // Domain 2: Multi-Tenancy & Client Isolation
    'tenancy:isolation': {
        name: 'Client Isolation & Multi-Tenancy',
        description: 'Client-specific tables, Row-Level Security (RLS), data segregation, tenant context',
        owners: [
            {
                crewId: 'data',
                expertise: 'primary',
                reason: 'Architect of domain boundaries & data model isolation',
            },
            {
                crewId: 'worf',
                expertise: 'primary',
                reason: 'Security expert — ensures RLS policies prevent unauthorized access',
            },
            {
                crewId: 'riker',
                expertise: 'secondary',
                reason: 'Execution lead — coordinates multi-tenant deployment strategy',
            },
        ],
        relatedDomains: ['security:rls', 'security:authentication', 'database:schema'],
    },
    'tenancy:onboarding': {
        name: 'Client Onboarding',
        description: 'New client setup, interactive prompts, initial data seeding, verification',
        owners: [
            {
                crewId: 'riker',
                expertise: 'primary',
                reason: 'Execution & delegation lead — orchestrates onboarding workflow',
            },
            {
                crewId: 'troi',
                expertise: 'primary',
                reason: 'Stakeholder communication — ensures smooth client experience',
            },
            {
                crewId: 'data',
                expertise: 'secondary',
                reason: 'Architecture — validates schema setup for new client',
            },
        ],
        relatedDomains: ['tenancy:isolation', 'documentation:guides', 'crew:coordination'],
    },
    // Domain 3: CI/CD & Deployment Automation
    'deployment:cicd': {
        name: 'CI/CD & Automated Deployment',
        description: 'GitHub Actions workflows, automatic migration execution, deployment pipelines, secrets management',
        owners: [
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Operations expert — owns deployment reliability & automation',
            },
            {
                crewId: 'data',
                expertise: 'secondary',
                reason: 'Architecture — ensures CI/CD preserves schema consistency',
            },
            {
                crewId: 'worf',
                expertise: 'secondary',
                reason: 'Security — ensures secrets are managed securely in CI/CD',
            },
        ],
        relatedDomains: ['infrastructure:automation', 'security:secrets', 'monitoring:alerts'],
    },
    'deployment:strategy': {
        name: 'Deployment Strategy & Rollout',
        description: 'Staged rollouts, canary deployments, rollback planning, blue-green strategy',
        owners: [
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Ensures safe, reliable deployments with minimal downtime',
            },
            {
                crewId: 'riker',
                expertise: 'primary',
                reason: 'Execution lead — coordinates deployment sequencing',
            },
            {
                crewId: 'crusher',
                expertise: 'secondary',
                reason: 'Testing — validates each stage before proceeding',
            },
        ],
        relatedDomains: ['error:resilience', 'monitoring:alerts', 'deployment:cicd'],
    },
    // Domain 4: System Health & Monitoring
    'monitoring:health': {
        name: 'Database Health Monitoring',
        description: 'Health checks, connectivity verification, table/RPC status, metrics collection',
        owners: [
            {
                crewId: 'geordi',
                expertise: 'primary',
                reason: 'Performance expert — monitors system health & detects issues early',
            },
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Operations expert — ensures production reliability',
            },
            {
                crewId: 'crusher',
                expertise: 'secondary',
                reason: 'Chief Medical Officer — diagnoses root causes of health issues, ensures system resilience',
            },
            {
                crewId: 'yar',
                expertise: 'secondary',
                reason: 'Risk detection — identifies anomalies & failure patterns',
            },
        ],
        relatedDomains: ['monitoring:alerts', 'performance:metrics', 'error:recovery'],
    },
    'monitoring:alerts': {
        name: 'Alerting & Incident Response',
        description: 'Slack notifications, alert rules, incident escalation, on-call procedures',
        owners: [
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Owns operational reliability & response',
            },
            {
                crewId: 'uhura',
                expertise: 'primary',
                reason: 'Communication expert — ensures clear alert messages',
            },
            {
                crewId: 'yar',
                expertise: 'secondary',
                reason: 'Risk detection — identifies what should trigger alerts',
            },
        ],
        relatedDomains: ['monitoring:health', 'crew:communication', 'crew:coordination'],
    },
    // Domain 5: Security & Access Control
    'security:rls': {
        name: 'Row-Level Security (RLS)',
        description: 'RLS policies, policy evaluation, tenant isolation enforcement, permission verification',
        owners: [
            {
                crewId: 'worf',
                expertise: 'primary',
                reason: 'Security expert — enforces access control & threat modeling',
            },
            {
                crewId: 'data',
                expertise: 'secondary',
                reason: 'Architecture — ensures RLS fits schema design',
            },
            {
                crewId: 'crusher',
                expertise: 'secondary',
                reason: 'Testing — validates RLS prevents unauthorized access',
            },
        ],
        relatedDomains: ['tenancy:isolation', 'security:authentication', 'security:audit'],
    },
    'security:authentication': {
        name: 'Authentication & JWT Management',
        description: 'JWT tokens, token validation, session management, credential rotation',
        owners: [
            {
                crewId: 'worf',
                expertise: 'primary',
                reason: 'Security expert — owns authentication architecture',
            },
            {
                crewId: 'data',
                expertise: 'secondary',
                reason: 'Type systems — ensures consistent token handling',
            },
        ],
        relatedDomains: ['security:rls', 'security:secrets', 'tenancy:isolation'],
    },
    'security:secrets': {
        name: 'Secrets Management & Credential Storage',
        description: 'API keys, tokens, WorfGate principles, environment variable management',
        owners: [
            {
                crewId: 'worf',
                expertise: 'primary',
                reason: 'WorfGate principles owner — strictly separates secrets by environment',
            },
            {
                crewId: 'obrien',
                expertise: 'secondary',
                reason: 'Operations — ensures secrets reach right environments',
            },
            {
                crewId: 'yar',
                expertise: 'secondary',
                reason: 'Risk detection — audits for secret leakage',
            },
        ],
        relatedDomains: ['deployment:cicd', 'security:authentication', 'security:audit'],
    },
    'security:audit': {
        name: 'Security Auditing & Compliance',
        description: 'Audit logs, compliance checks, vulnerability scanning, security reporting',
        owners: [
            {
                crewId: 'worf',
                expertise: 'primary',
                reason: 'Security expert — owns compliance & audit trails',
            },
            {
                crewId: 'yar',
                expertise: 'primary',
                reason: 'QA expert — systematically finds security issues',
            },
            {
                crewId: 'crusher',
                expertise: 'secondary',
                reason: 'Testing — validates audit logs are comprehensive',
            },
        ],
        relatedDomains: ['security:rls', 'monitoring:health', 'crew:coordination'],
    },
    // Domain 6: Documentation & Knowledge Transfer
    'documentation:guides': {
        name: 'Setup & Operational Guides',
        description: 'Automation guides, quick-start docs, troubleshooting, runbooks',
        owners: [
            {
                crewId: 'troi',
                expertise: 'primary',
                reason: 'Stakeholder communication — writes clear, empathetic guides',
            },
            {
                crewId: 'uhura',
                expertise: 'primary',
                reason: 'Communication expert — ensures clarity & accessibility',
            },
            {
                crewId: 'picard',
                expertise: 'secondary',
                reason: 'Strategic insight — adds institutional knowledge to docs',
            },
        ],
        relatedDomains: ['crew:communication', 'documentation:knowledge', 'tenancy:onboarding'],
    },
    'documentation:knowledge': {
        name: 'Tribal Knowledge & Best Practices',
        description: 'Architecture decisions, lessons learned, design rationale, crew baseline memories',
        owners: [
            {
                crewId: 'picard',
                expertise: 'primary',
                reason: 'Captain — maintains institutional memory & strategic context',
            },
            {
                crewId: 'data',
                expertise: 'primary',
                reason: 'Architect — documents design decisions & rationale',
            },
            {
                crewId: 'troi',
                expertise: 'secondary',
                reason: 'Communication — ensures knowledge is accessible to all',
            },
        ],
        relatedDomains: ['documentation:guides', 'crew:baseline-memories'],
    },
    // Domain 7: Performance & Optimization
    'performance:indexing': {
        name: 'Database Indexing & Query Optimization',
        description: 'Index design, query optimization, explain plans, performance tuning',
        owners: [
            {
                crewId: 'geordi',
                expertise: 'primary',
                reason: 'Performance expert — optimizes queries & indexes',
            },
            {
                crewId: 'data',
                expertise: 'secondary',
                reason: 'Architecture — ensures indexes fit schema design',
            },
            {
                crewId: 'obrien',
                expertise: 'secondary',
                reason: 'Operations — ensures indexes support production workloads',
            },
        ],
        relatedDomains: ['database:schema', 'performance:metrics', 'monitoring:health'],
    },
    'performance:caching': {
        name: 'Caching Strategy & Optimization',
        description: 'Redis caching, cache invalidation, TTL management, cache warming',
        owners: [
            {
                crewId: 'geordi',
                expertise: 'primary',
                reason: 'Identifies & removes bottlenecks through caching',
            },
            {
                crewId: 'quark',
                expertise: 'secondary',
                reason: 'Cost optimization — caching reduces API calls',
            },
        ],
        relatedDomains: ['performance:metrics', 'performance:indexing'],
    },
    'performance:metrics': {
        name: 'Performance Metrics & Analytics',
        description: 'Query timing, throughput, latency percentiles, performance reporting',
        owners: [
            {
                crewId: 'geordi',
                expertise: 'primary',
                reason: 'Owns performance measurement & analysis',
            },
            {
                crewId: 'quark',
                expertise: 'secondary',
                reason: 'Cost tracking — correlates performance with cost',
            },
            {
                crewId: 'obrien',
                expertise: 'secondary',
                reason: 'Operations — uses metrics for capacity planning',
            },
        ],
        relatedDomains: ['monitoring:health', 'performance:caching', 'performance:indexing'],
    },
    // Domain 8: Error Handling & Resilience
    'error:handling': {
        name: 'Error Handling & Recovery',
        description: 'Error classification, retry logic, exponential backoff, circuit breakers',
        owners: [
            {
                crewId: 'crusher',
                expertise: 'primary',
                reason: 'Testing expert — handles edge cases & error scenarios',
            },
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Ensures system recovers gracefully from failures',
            },
            {
                crewId: 'yar',
                expertise: 'secondary',
                reason: 'Risk detection — identifies failure modes',
            },
        ],
        relatedDomains: ['error:resilience', 'monitoring:alerts', 'monitoring:health'],
    },
    'error:resilience': {
        name: 'System Resilience & Idempotence',
        description: 'Idempotent operations, state recovery, disaster recovery, MTTR optimization',
        owners: [
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Operations expert — ensures reliability & recovery',
            },
            {
                crewId: 'crusher',
                expertise: 'primary',
                reason: 'Testing — validates resilience under failure conditions',
            },
            {
                crewId: 'riker',
                expertise: 'secondary',
                reason: 'Execution — coordinates recovery procedures',
            },
        ],
        relatedDomains: ['error:handling', 'deployment:strategy', 'monitoring:health'],
    },
    // Domain 9: Infrastructure as Code
    'infrastructure:automation': {
        name: 'Infrastructure Automation & Scripting',
        description: 'Auto-migrate tool, client-onboard script, health-check automation',
        owners: [
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Operations — owns automation for reliability',
            },
            {
                crewId: 'data',
                expertise: 'secondary',
                reason: 'Architecture — ensures automation preserves consistency',
            },
            {
                crewId: 'riker',
                expertise: 'secondary',
                reason: 'Execution — executes automation workflows',
            },
        ],
        relatedDomains: ['deployment:cicd', 'database:migration', 'error:resilience'],
    },
    'infrastructure:configuration': {
        name: 'Environment Configuration & Secrets',
        description: '~/.zshrc, .env files, GitHub Secrets, environment variable management',
        owners: [
            {
                crewId: 'worf',
                expertise: 'primary',
                reason: 'WorfGate principles — enforces credential segregation',
            },
            {
                crewId: 'obrien',
                expertise: 'primary',
                reason: 'Operations — manages environment setup',
            },
            {
                crewId: 'riker',
                expertise: 'secondary',
                reason: 'Execution — ensures configurations are applied correctly',
            },
        ],
        relatedDomains: ['security:secrets', 'deployment:cicd', 'infrastructure:automation'],
    },
    // Domain 10: Crew Coordination & Protocols
    'crew:coordination': {
        name: 'Crew Coordination & Decision-Making',
        description: 'Inter-crew communication, consensus decisions, veto protocols, escalation paths',
        owners: [
            {
                crewId: 'picard',
                expertise: 'primary',
                reason: 'Captain — coordinates crew decisions & strategic alignment',
            },
            {
                crewId: 'riker',
                expertise: 'primary',
                reason: 'Execution lead — facilitates crew collaboration',
            },
            {
                crewId: 'uhura',
                expertise: 'primary',
                reason: 'Communication expert — ensures clear inter-crew protocols',
            },
        ],
        relatedDomains: ['crew:communication', 'crew:baseline-memories'],
    },
    'crew:communication': {
        name: 'Communication Protocols & Clarity',
        description: 'Message formatting, notification clarity, escalation messages, status reports',
        owners: [
            {
                crewId: 'uhura',
                expertise: 'primary',
                reason: 'Communication expert — ensures all messages are clear & actionable',
            },
            {
                crewId: 'troi',
                expertise: 'primary',
                reason: 'Stakeholder communication — adds empathy & clarity',
            },
            {
                crewId: 'picard',
                expertise: 'secondary',
                reason: 'Strategic clarity — ensures alignment in communications',
            },
        ],
        relatedDomains: ['crew:coordination', 'monitoring:alerts', 'documentation:guides'],
    },
    'crew:baseline-memories': {
        name: 'Crew Baseline Knowledge & Memories',
        description: 'Crew baseline memories, institutional knowledge, lessons learned, expertise registry',
        owners: [
            {
                crewId: 'picard',
                expertise: 'primary',
                reason: 'Captain — maintains strategic & institutional memory',
            },
            {
                crewId: 'data',
                expertise: 'primary',
                reason: 'Architect — documents architectural & design principles',
            },
            {
                crewId: 'uhura',
                expertise: 'secondary',
                reason: 'Communication — ensures memories are accessible & understood',
            },
        ],
        relatedDomains: ['documentation:knowledge', 'crew:coordination'],
    },
};
/**
 * Get all domains owned by a crew member
 */
function getCrewDomains(crewId) {
    const domains = [];
    for (const [domainId, domain] of Object.entries(exports.DOMAIN_REGISTRY)) {
        const ownership = domain.owners.find((o) => o.crewId === crewId);
        if (ownership) {
            domains.push({
                domainId,
                domain,
                expertise: ownership.expertise,
                reason: ownership.reason,
            });
        }
    }
    return domains;
}
/**
 * Get all crew members responsible for a domain
 */
function getDomainExperts(domainId, expertiseLevel = null) {
    const domain = exports.DOMAIN_REGISTRY[domainId];
    if (!domain) {
        return [];
    }
    let experts = domain.owners;
    if (expertiseLevel) {
        experts = experts.filter((o) => o.expertise === expertiseLevel);
    }
    return experts.map((o) => ({
        crewId: o.crewId,
        expertise: o.expertise,
        reason: o.reason,
    }));
}
/**
 * Get primary expert for a domain
 */
function getPrimaryExpert(domainId) {
    const experts = getDomainExperts(domainId, 'primary');
    return experts.length > 0 ? experts[0].crewId : null;
}
/**
 * Check if a crew member has expertise in a domain
 */
function hasExpertise(crewId, domainId) {
    const domain = exports.DOMAIN_REGISTRY[domainId];
    return domain && domain.owners.some((o) => o.crewId === crewId);
}
/**
 * Get all related domains for a given domain
 */
function getRelatedDomains(domainId) {
    const domain = exports.DOMAIN_REGISTRY[domainId];
    return domain ? domain.relatedDomains || [] : [];
}
/**
 * Get crew members for a task by domain classification
 * Useful for auto-routing tasks to appropriate SMEs
 */
function getCrewForTask(taskDomains) {
    const crewMembers = new Map();
    for (const domainId of taskDomains) {
        const experts = getDomainExperts(domainId);
        for (const expert of experts) {
            if (!crewMembers.has(expert.crewId)) {
                crewMembers.set(expert.crewId, {
                    crewId: expert.crewId,
                    domains: [],
                    expertiseCount: 0,
                });
            }
            const entry = crewMembers.get(expert.crewId);
            entry.domains.push({ domainId, expertise: expert.expertise });
            if (expert.expertise === 'primary') {
                entry.expertiseCount += 2;
            }
            else if (expert.expertise === 'secondary') {
                entry.expertiseCount += 1;
            }
        }
    }
    // Sort by expertise count
    return Array.from(crewMembers.values()).sort((a, b) => b.expertiseCount - a.expertiseCount);
}
/**
 * Generate domain ownership report for documentation
 */
function generateDomainOwnershipReport() {
    const report = {
        timestamp: new Date().toISOString(),
        totalDomains: Object.keys(exports.DOMAIN_REGISTRY).length,
        domains: {},
        crewDistribution: {},
    };
    // Aggregate by domain
    for (const [domainId, domain] of Object.entries(exports.DOMAIN_REGISTRY)) {
        report.domains[domainId] = {
            name: domain.name,
            description: domain.description,
            owners: domain.owners.map(o => ({
                crewId: o.crewId,
                expertise: o.expertise,
            })),
            relatedDomains: domain.relatedDomains,
        };
    }
    // Aggregate by crew member
    const allCrew = [
        'picard', 'data', 'riker', 'geordi', 'obrien',
        'worf', 'troi', 'crusher', 'uhura', 'quark', 'yar'
    ];
    for (const crewId of allCrew) {
        const domains = getCrewDomains(crewId);
        report.crewDistribution[crewId] = {
            primaryDomains: domains.filter(d => d.expertise === 'primary').map(d => d.domainId),
            secondaryDomains: domains.filter(d => d.expertise === 'secondary').map(d => d.domainId),
            tertiaryDomains: domains.filter(d => d.expertise === 'tertiary').map(d => d.domainId),
            totalDomains: domains.length,
        };
    }
    return report;
}
//# sourceMappingURL=domain-registry.js.map