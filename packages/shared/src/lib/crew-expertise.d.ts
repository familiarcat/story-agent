/**
 * Crew Domain Expertise Declarations
 *
 * Each crew member claims their domains and explains how they apply their expertise.
 * This enables intelligent task routing and SME collaboration.
 */
export declare const CREW_EXPERTISE: {
    picard: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'crew:coordination': string;
            'documentation:knowledge': string;
        };
    };
    data: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'database:schema': string;
            'documentation:knowledge': string;
            'tenancy:isolation': string;
        };
    };
    riker: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'tenancy:onboarding': string;
            'deployment:strategy': string;
            'crew:coordination': string;
        };
    };
    geordi: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'monitoring:health': string;
            'performance:indexing': string;
            'performance:metrics': string;
            'performance:caching': string;
        };
    };
    obrien: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'deployment:cicd': string;
            'error:resilience': string;
            'monitoring:alerts': string;
            'infrastructure:automation': string;
            'infrastructure:configuration': string;
        };
    };
    worf: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'security:rls': string;
            'security:secrets': string;
            'security:audit': string;
            'tenancy:isolation': string;
        };
    };
    troi: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'tenancy:onboarding': string;
            'documentation:guides': string;
        };
    };
    crusher: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'error:handling': string;
            'security:audit': string;
            'error:resilience': string;
            'monitoring:health': string;
        };
    };
    uhura: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'crew:communication': string;
            'monitoring:alerts': string;
        };
    };
    quark: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'performance:metrics': string;
            'performance:caching': string;
        };
    };
    yar: {
        crewId: string;
        title: string;
        bio: string;
        primaryDomains: string[];
        secondaryDomains: string[];
        expertise: string;
        domainRationale: {
            'monitoring:alerts': string;
            'security:audit': string;
        };
    };
};
/**
 * Get expertise declaration for a crew member
 */
export declare function getCrewExpertise(crewId: keyof typeof CREW_EXPERTISE): {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'crew:coordination': string;
        'documentation:knowledge': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'database:schema': string;
        'documentation:knowledge': string;
        'tenancy:isolation': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'tenancy:onboarding': string;
        'deployment:strategy': string;
        'crew:coordination': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'monitoring:health': string;
        'performance:indexing': string;
        'performance:metrics': string;
        'performance:caching': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'deployment:cicd': string;
        'error:resilience': string;
        'monitoring:alerts': string;
        'infrastructure:automation': string;
        'infrastructure:configuration': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'security:rls': string;
        'security:secrets': string;
        'security:audit': string;
        'tenancy:isolation': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'tenancy:onboarding': string;
        'documentation:guides': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'error:handling': string;
        'security:audit': string;
        'error:resilience': string;
        'monitoring:health': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'crew:communication': string;
        'monitoring:alerts': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'performance:metrics': string;
        'performance:caching': string;
    };
} | {
    crewId: string;
    title: string;
    bio: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
    domainRationale: {
        'monitoring:alerts': string;
        'security:audit': string;
    };
};
/**
 * Generate crew expertise summary
 */
export declare function generateCrewExpertiseSummary(): Record<string, {
    title: string;
    primaryDomains: readonly string[];
    secondaryDomains: readonly string[];
}>;
//# sourceMappingURL=crew-expertise.d.ts.map