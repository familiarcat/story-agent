/**
 * Domain-Based Task Routing & Crew Collaboration
 *
 * Routes tasks to appropriate crew members based on domain expertise.
 * Enables intelligent SME selection for crew collaboration.
 */
export interface TaskDomainContext {
    taskId: string;
    title: string;
    description: string;
    domains: string[];
    severity?: 'critical' | 'high' | 'medium' | 'low';
    timeframe?: 'immediate' | 'urgent' | 'soon' | 'backlog';
}
export interface CrewAssignment {
    crewId: string;
    role: string;
    primaryDomains: string[];
    secondaryDomains: string[];
    expertise: string;
}
/**
 * Route a task to crew members based on domain expertise
 * Returns ordered list of crew members with matching expertise
 */
export declare function routeTaskToCrew(context: TaskDomainContext): CrewAssignment[];
/**
 * Get primary expert crew members for a task
 * Useful for identifying primary decision makers
 */
export declare function getPrimaryCrewForTask(context: TaskDomainContext): CrewAssignment[];
/**
 * Generate crew collaboration briefing for a task
 * Shows which crew members should collaborate and why
 */
export declare function generateCrewBriefing(context: TaskDomainContext): {
    taskId: string;
    title: string;
    domains: string[];
    relatedDomains: string[];
    crewAssignments: CrewAssignment[];
    collaborationPlan: {
        primary: {
            crewId: string;
            role: string;
            responsibility: string;
        }[];
        secondary: {
            crewId: string;
            role: string;
            responsibility: string;
        }[];
        advisory: {
            crewId: string;
            role: string;
            responsibility: string;
        }[];
    };
    expertise: {
        [k: string]: {
            role: string;
            primaryDomains: string[];
            secondaryDomains: string[];
        };
    };
    domainExplanations: {
        [k: string]: {
            name: string;
            description: string;
            experts: {
                crewId: string;
                expertise: string;
                reason: string;
            }[];
        };
    };
};
/**
 * Check if crew members have expertise for all task domains
 */
export declare function validateCrewCapability(crewIds: string[], taskDomains: string[]): boolean;
/**
 * Find coverage gaps - domains not covered by assigned crew
 */
export declare function findCoverageGaps(crewIds: string[], taskDomains: string[]): string[];
/**
 * Recommend additional crew members to fill gaps
 */
export declare function recommendCrewForGaps(gaps: string[]): CrewAssignment[];
/**
 * Generate detailed crew collaboration report
 * For documentation and transparency on how crews will work together
 */
export declare function generateDetailedCollaborationReport(context: TaskDomainContext): {
    taskId: string;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    timeframe: "immediate" | "urgent" | "soon" | "backlog";
    domains: {
        primary: string[];
        related: string[];
    };
    crewAssignments: CrewAssignment[];
    collaboration: {
        primary: {
            crewId: string;
            role: string;
            responsibility: string;
        }[];
        secondary: {
            crewId: string;
            role: string;
            responsibility: string;
        }[];
        advisory: {
            crewId: string;
            role: string;
            responsibility: string;
        }[];
    };
    coverageAnalysis: {
        domainsRequiredCount: number;
        crewAssignedCount: number;
        expertiseCoveragePercentage: number;
        coverageGaps: string[];
        recommendations: CrewAssignment[];
    };
    expectedWorkflow: {
        phase: string;
        owner: string;
        description: string;
    }[];
    domainDetails: {
        [k: string]: {
            name: string;
            description: string;
            experts: {
                crewId: string;
                expertise: string;
                reason: string;
            }[];
        };
    };
};
/**
 * Generate task context automatically from task description
 * Uses NLP-inspired heuristics to identify likely domains
 */
export declare function inferTaskDomains(description: string): string[];
//# sourceMappingURL=crew-task-routing.d.ts.map