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
export declare const DOMAIN_REGISTRY: {
    'database:schema': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'database:migration': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'tenancy:isolation': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'tenancy:onboarding': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'deployment:cicd': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'deployment:strategy': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'monitoring:health': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'monitoring:alerts': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'security:rls': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'security:authentication': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'security:secrets': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'security:audit': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'documentation:guides': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'documentation:knowledge': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'performance:indexing': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'performance:caching': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'performance:metrics': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'error:handling': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'error:resilience': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'infrastructure:automation': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'infrastructure:configuration': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'crew:coordination': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'crew:communication': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    'crew:baseline-memories': {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
};
/**
 * Get all domains owned by a crew member
 */
export declare function getCrewDomains(crewId: string): {
    domainId: string;
    domain: {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    } | {
        name: string;
        description: string;
        owners: {
            crewId: string;
            expertise: string;
            reason: string;
        }[];
        relatedDomains: string[];
    };
    expertise: string;
    reason: string;
}[];
/**
 * Get all crew members responsible for a domain
 */
export declare function getDomainExperts(domainId: string, expertiseLevel?: string | null): {
    crewId: string;
    expertise: string;
    reason: string;
}[];
/**
 * Get primary expert for a domain
 */
export declare function getPrimaryExpert(domainId: string): string | null;
/**
 * Check if a crew member has expertise in a domain
 */
export declare function hasExpertise(crewId: string, domainId: string): boolean;
/**
 * Get all related domains for a given domain
 */
export declare function getRelatedDomains(domainId: string): string[];
/**
 * Get crew members for a task by domain classification
 * Useful for auto-routing tasks to appropriate SMEs
 */
export declare function getCrewForTask(taskDomains: string[]): any[];
/**
 * Generate domain ownership report for documentation
 */
export declare function generateDomainOwnershipReport(): {
    timestamp: string;
    totalDomains: number;
    domains: Record<string, unknown>;
    crewDistribution: Record<string, unknown>;
};
//# sourceMappingURL=domain-registry.d.ts.map