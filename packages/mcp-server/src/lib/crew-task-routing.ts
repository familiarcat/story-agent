// @ts-nocheck
/**
 * Domain-Based Task Routing & Crew Collaboration
 * 
 * Routes tasks to appropriate crew members based on domain expertise.
 * Enables intelligent SME selection for crew collaboration.
 */

import { DOMAIN_REGISTRY, getCrewForTask, getDomainExperts, getRelatedDomains } from './domain-registry.js';
import { CREW_EXPERTISE } from './crew-expertise.js';

export interface TaskDomainContext {
  taskId: string;
  title: string;
  description: string;
  domains: string[]; // e.g., ['database:migration', 'security:rls']
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
export function routeTaskToCrew(context: TaskDomainContext): CrewAssignment[] {
  const crew = getCrewForTask(context.domains);

  return crew.map(c => {
    const expertise = CREW_EXPERTISE[c.crewId];
    return {
      crewId: c.crewId,
      role: expertise.title,
      primaryDomains: c.domains.filter(d => d.expertise === 'primary').map(d => d.domainId),
      secondaryDomains: c.domains.filter(d => d.expertise === 'secondary').map(d => d.domainId),
      expertise: c.domains.map(d => d.domainId).join(', '),
    };
  });
}

/**
 * Get primary expert crew members for a task
 * Useful for identifying primary decision makers
 */
export function getPrimaryCrewForTask(context: TaskDomainContext): CrewAssignment[] {
  return routeTaskToCrew(context).slice(0, 3); // Top 3 most relevant crew members
}

/**
 * Generate crew collaboration briefing for a task
 * Shows which crew members should collaborate and why
 */
export function generateCrewBriefing(context: TaskDomainContext) {
  const assignments = routeTaskToCrew(context);
  const relatedDomainsList = new Set<string>();

  // Collect all related domains
  for (const domain of context.domains) {
    const related = getRelatedDomains(domain);
    related.forEach(d => relatedDomainsList.add(d));
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

    expertise: Object.fromEntries(
      assignments.map(a => [
        a.crewId,
        {
          role: a.role,
          primaryDomains: a.primaryDomains,
          secondaryDomains: a.secondaryDomains,
        },
      ])
    ),

    domainExplanations: Object.fromEntries(
      context.domains.map(domainId => [
        domainId,
        {
          name: DOMAIN_REGISTRY[domainId]?.name,
          description: DOMAIN_REGISTRY[domainId]?.description,
          experts: getDomainExperts(domainId).map(e => ({
            crewId: e.crewId,
            expertise: e.expertise,
            reason: e.reason,
          })),
        },
      ])
    ),
  };
}

/**
 * Check if crew members have expertise for all task domains
 */
export function validateCrewCapability(crewIds: string[], taskDomains: string[]): boolean {
  const crewExpertise = new Set<string>();

  for (const crewId of crewIds) {
    const expertise = CREW_EXPERTISE[crewId];
    if (!expertise) continue;

    expertise.primaryDomains.forEach(d => crewExpertise.add(d));
    expertise.secondaryDomains.forEach(d => crewExpertise.add(d));
  }

  return taskDomains.every(domain => crewExpertise.has(domain));
}

/**
 * Find coverage gaps - domains not covered by assigned crew
 */
export function findCoveragGaps(crewIds: string[], taskDomains: string[]): string[] {
  const crewExpertise = new Set<string>();

  for (const crewId of crewIds) {
    const expertise = CREW_EXPERTISE[crewId];
    if (!expertise) continue;

    expertise.primaryDomains.forEach(d => crewExpertise.add(d));
    expertise.secondaryDomains.forEach(d => crewExpertise.add(d));
  }

  return taskDomains.filter(domain => !crewExpertise.has(domain));
}

/**
 * Recommend additional crew members to fill gaps
 */
export function recommendCrewForGaps(gaps: string[]): CrewAssignment[] {
  const recommended = new Map<string, { count: number; expertise: CrewAssignment }>();

  for (const domainId of gaps) {
    const experts = getDomainExperts(domainId);
    for (const expert of experts) {
      if (!recommended.has(expert.crewId)) {
        const crewExpertise = CREW_EXPERTISE[expert.crewId];
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
      } else {
        recommended.get(expert.crewId)!.count++;
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
export function generateDetailedCollaborationReport(context: TaskDomainContext) {
  const briefing = generateCrewBriefing(context);
  const allAssignments = Object.values(briefing.crewAssignments);

  // Check for gaps
  const gaps = findCoveragGaps(
    allAssignments.map(a => a.crewId),
    context.domains
  );

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
export function inferTaskDomains(description: string): string[] {
  const lowercaseDesc = description.toLowerCase();
  const inferredDomains = new Set<string>();

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
