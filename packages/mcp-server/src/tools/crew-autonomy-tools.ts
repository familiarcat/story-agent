/**
 * Crew Autonomy Tools — Personal tools for each crew member to function autonomously
 * 
 * Each crew member has domain-specific tools to:
 * - Access relevant project/story/sprint/client data
 * - Make autonomous decisions within their domain
 * - Learn from observation memories
 * - Grow capabilities with new clients/projects/tasks
 * 
 * These tools enable the crew to "run the ship on their own" without human intervention
 * for routine decisions within their authority boundaries.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// Import db functions as needed - TODO: update imports as implementation progresses
// import { getRelevantObservationMemories, storeObservationMemory } from '@story-agent/shared/db';

export function registerCrewAutonomyTools(server: McpServer) {
  // ══════════════════════════════════════════════════════════════════════════════
  // ── UNIVERSAL AUTONOMY TOOLS (Available to all crew members) ──────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * CREW: All
   * Retrieve personal baseline memories, expertise domain, and authority boundaries
   * Used by crew to understand their own role and decision scope
   */
  server.tool(
    'crew:get-personal-profile',
    'Retrieve your personal profile including role, expertise, authority level, and decision boundaries. Use this to understand your autonomous scope.',
    {
      crewId: z.string().describe('Your crew ID (e.g., picard, data, riker, etc.)'),
    },
    async ({ crewId }) => {
      // This would fetch from crew baseline memories and expertise registry
      const profile = await getCrewProfile(crewId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(profile, null, 2),
        }],
      };
    }
  );

  /**
   * CREW: All
   * Get all active projects that this crew member might work on
   * Helps crew stay aware of current organizational context
   */
  server.tool(
    'crew:list-active-projects',
    'List all active projects in the organization. Use to understand current work scope and client context.',
    {
      includeArchived: z.boolean().optional().default(false).describe('Include archived projects'),
      clientId: z.string().optional().describe('Filter by specific client ID'),
    },
    async ({ includeArchived, clientId }) => {
      const projects = await listActiveProjects(includeArchived, clientId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        }],
      };
    }
  );

  /**
   * CREW: All
   * Get all active sprints across the organization
   * Helps crew understand current delivery timelines and priorities
   */
  server.tool(
    'crew:list-active-sprints',
    'List all active sprints across projects. Use to understand current delivery priorities and schedules.',
    {
      status: z.enum(['planned', 'active', 'completed']).optional().describe('Filter by sprint status'),
      projectId: z.string().optional().describe('Filter by specific project'),
    },
    async ({ status, projectId }) => {
      const sprints = await listActiveSprints(status, projectId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(sprints, null, 2),
        }],
      };
    }
  );

  /**
   * CREW: All
   * Get stories matching domain-specific filters
   * Each crew member uses different filter criteria based on their role
   */
  server.tool(
    'crew:query-stories',
    'Query stories by status, assignee, project, or domain filters. Use to find work relevant to your expertise.',
    {
      status: z.enum(['pending', 'discovery', 'implementing', 'pr_open', 'pr_revision', 'pr_approved', 'merged', 'blocked']).optional(),
      projectId: z.string().optional().describe('Filter by project ID'),
      sprintId: z.string().optional().describe('Filter by sprint ID'),
      clientId: z.string().optional().describe('Filter by client ID'),
      domain: z.string().optional().describe('Filter by domain (architecture, security, qa, infrastructure, etc.)'),
      limit: z.number().optional().default(20).describe('Maximum number of results'),
    },
    async ({ status, projectId, sprintId, clientId, domain, limit }) => {
      const stories = await queryStoriesByDomain({ status, projectId, sprintId, clientId, domain, limit });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stories, null, 2),
        }],
      };
    }
  );

  /**
   * CREW: All
   * Retrieve learning from past observation debates and crew decisions
   * Enables continuous learning and adaptation to organizational patterns
   */
  server.tool(
    'crew:get-relevant-memories',
    'Retrieve relevant memories from past crew decisions in your domain. Use to learn from organizational history.',
    {
      domain: z.string().describe('Your expertise domain (security, architecture, qa, devops, etc.)'),
      projectId: z.string().optional().describe('Optionally filter to specific project'),
      limit: z.number().optional().default(10).describe('Number of most recent memories'),
    },
    async ({ domain, projectId, limit }) => {
      const memories = await getRelevantCrewMemories(domain, projectId, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(memories, null, 2),
        }],
      };
    }
  );

  /**
   * CREW: All
   * Store a decision or finding to organizational memory
   * Enables continuous learning for the whole crew
   */
  server.tool(
    'crew:store-learning',
    'Record a decision, finding, or lesson learned to crew memory. Use to help the team learn from your autonomous decisions.',
    {
      crewId: z.string().describe('Your crew ID'),
      domain: z.string().describe('Domain of the learning (security, architecture, qa, etc.)'),
      content: z.string().describe('The lesson, decision rationale, or finding'),
      projectId: z.string().optional().describe('Associated project ID if applicable'),
      confidence: z.number().min(0).max(1).optional().default(0.8).describe('Confidence level (0-1)'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
    },
    async ({ crewId, domain, content, projectId, confidence, tags }) => {
      const stored = await storeCrewLearning({ crewId, domain, content, projectId, confidence, tags });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, id: stored.id, timestamp: stored.timestamp }, null, 2),
        }],
      };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ── DOMAIN-SPECIFIC AUTONOMY TOOLS ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * PICARD (Captain) - Command Authority
   * Review organizational readiness and make executive-level decisions
   */
  server.tool(
    'picard:assess-readiness',
    'Assess organization/project readiness for deployment or major decision. Executive-level strategic analysis.',
    {
      projectId: z.string().describe('Project to assess'),
      readinessArea: z.enum(['technical', 'organizational', 'security', 'client_alignment', 'resource']).describe('Area to assess'),
    },
    async ({ projectId, readinessArea }) => {
      const assessment = await assessOrganizationalReadiness(projectId, readinessArea);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(assessment, null, 2),
        }],
      };
    }
  );

  /**
   * DATA (Architect) - Architectural Authority
   * Autonomous architectural review and design decisions
   */
  server.tool(
    'data:review-architecture',
    'Review architecture against design principles and consistency standards. Returns alignment report.',
    {
      projectId: z.string().describe('Project to review'),
      reviewType: z.enum(['consistency', 'scalability', 'maintainability', 'complexity']).describe('Type of architectural review'),
    },
    async ({ projectId, reviewType }) => {
      const review = await performArchitecturalReview(projectId, reviewType);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(review, null, 2),
        }],
      };
    }
  );

  /**
   * RIKER (Commander) - Implementation Authority
   * Autonomous execution planning and tactical decisions
   */
  server.tool(
    'riker:plan-execution',
    'Plan story execution with risk analysis, sequencing, and fallback strategies.',
    {
      storyId: z.string().describe('Story to plan execution for'),
      includeRiskAnalysis: z.boolean().optional().default(true).describe('Include risk assessment'),
    },
    async ({ storyId, includeRiskAnalysis }) => {
      const plan = await planStoryExecution(storyId, includeRiskAnalysis);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(plan, null, 2),
        }],
      };
    }
  );

  /**
   * GEORDI (Infrastructure) - Infrastructure Authority
   * Autonomous infrastructure readiness and deployment planning
   */
  server.tool(
    'geordi:assess-infrastructure',
    'Assess infrastructure readiness, deployment feasibility, and observability setup.',
    {
      projectId: z.string().describe('Project to assess'),
      assessmentType: z.enum(['readiness', 'scalability', 'observability', 'resilience']).describe('Type of assessment'),
    },
    async ({ projectId, assessmentType }) => {
      const assessment = await assessInfrastructureReadiness(projectId, assessmentType);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(assessment, null, 2),
        }],
      };
    }
  );

  /**
   * O'BRIEN (DevOps) - Deployment Authority
   * Autonomous CI/CD decisions and deployment sequencing
   */
  server.tool(
    'obrien:plan-deployment',
    'Plan deployment sequence, identify dependencies, assess rollback readiness.',
    {
      projectId: z.string().describe('Project to plan deployment for'),
      changeScope: z.string().describe('Scope of changes (e.g., database schema, API contract, etc.)'),
    },
    async ({ projectId, changeScope }) => {
      const plan = await planDeploymentSequence(projectId, changeScope);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(plan, null, 2),
        }],
      };
    }
  );

  /**
   * WORF (Security) - Security Veto Authority
   * Autonomous security assessment and potential VETO decisions
   */
  server.tool(
    'worf:security-audit',
    'Perform security audit on change, configuration, or deployment. Can autonomously VETO unsafe changes.',
    {
      projectId: z.string().describe('Project to audit'),
      auditScope: z.enum(['code_change', 'configuration', 'deployment', 'dependency', 'access_control']).describe('What to audit'),
      details: z.string().describe('Details of what to audit'),
    },
    async ({ projectId, auditScope, details }) => {
      const audit = await performSecurityAudit(projectId, auditScope, details);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(audit, null, 2),
        }],
      };
    }
  );

  /**
   * TASHA YAR (QA) - Quality Authority
   * Autonomous test planning and quality assessment
   */
  server.tool(
    'yar:assess-test-coverage',
    'Assess test coverage, identify gaps, recommend test priorities.',
    {
      storyId: z.string().describe('Story to assess'),
      changeScope: z.string().describe('Scope of code changes'),
    },
    async ({ storyId, changeScope }) => {
      const assessment = await assessTestCoverage(storyId, changeScope);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(assessment, null, 2),
        }],
      };
    }
  );

  /**
   * TROI (Analyst) - Stakeholder Authority
   * Autonomous stakeholder impact assessment
   */
  server.tool(
    'troi:assess-stakeholder-impact',
    'Assess impact on stakeholders, organizational alignment, change management needs.',
    {
      projectId: z.string().describe('Project to assess'),
      changeDescription: z.string().describe('Description of the change'),
    },
    async ({ projectId, changeDescription }) => {
      const impact = await assessStakeholderImpact(projectId, changeDescription);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(impact, null, 2),
        }],
      };
    }
  );

  /**
   * CRUSHER (Health) - Health Authority
   * Autonomous system health diagnostics
   */
  server.tool(
    'crusher:diagnose-system-health',
    'Diagnose system health, identify issues, recommend interventions.',
    {
      projectId: z.string().describe('Project to diagnose'),
      symptom: z.string().describe('Observed symptom or concern'),
    },
    async ({ projectId, symptom }) => {
      const diagnosis = await diagnoseSystemHealth(projectId, symptom);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(diagnosis, null, 2),
        }],
      };
    }
  );

  /**
   * UHURA (Communications) - Communications Authority
   * Autonomous communication drafting and clarity checking
   */
  server.tool(
    'uhura:draft-communication',
    'Draft clear communication (status update, incident report, decision announcement).',
    {
      communicationType: z.enum(['status_update', 'incident_report', 'decision', 'release_notes', 'standby']).describe('Type of communication'),
      context: z.string().describe('Context/details of what to communicate'),
      audience: z.string().optional().describe('Intended audience (technical, stakeholders, all)'),
    },
    async ({ communicationType, context, audience }) => {
      const communication = await draftCommunication(communicationType, context, audience);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(communication, null, 2),
        }],
      };
    }
  );

  /**
   * QUARK (Finance) - Cost Authority
   * Autonomous cost analysis and optimization decisions
   */
  server.tool(
    'quark:analyze-costs',
    'Analyze project costs, identify optimization opportunities, track token efficiency.',
    {
      projectId: z.string().describe('Project to analyze'),
      analysisType: z.enum(['budget_tracking', 'optimization', 'token_efficiency', 'model_arbitrage']).describe('Type of analysis'),
    },
    async ({ projectId, analysisType }) => {
      const analysis = await analyzeCosts(projectId, analysisType);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        }],
      };
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── HELPER IMPLEMENTATIONS ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

async function getCrewProfile(crewId: string) {
  // TODO: Fetch from crew baseline memories and expertise registry
  return { crewId, role: 'TODO', expertise: 'TODO', authority: 'TODO' };
}

async function listActiveProjects(includeArchived: boolean, clientId?: string) {
  // TODO: Query projects from database
  return [];
}

async function listActiveSprints(status?: string, projectId?: string) {
  // TODO: Query sprints from database
  return [];
}

async function queryStoriesByDomain(filters: any) {
  // TODO: Query stories with domain-specific filters
  return [];
}

async function getRelevantCrewMemories(domain: string, projectId?: string, limit?: number) {
  // TODO: Query observation memories by domain
  return [];
}

async function storeCrewLearning(params: any) {
  // TODO: Store to observation memories
  return { id: 'TODO', timestamp: new Date().toISOString() };
}

async function assessOrganizationalReadiness(projectId: string, area: string) {
  return { projectId, area, readiness: 'TODO', details: [] };
}

async function performArchitecturalReview(projectId: string, reviewType: string) {
  return { projectId, reviewType, alignment: 'TODO', findings: [] };
}

async function planStoryExecution(storyId: string, includeRiskAnalysis: boolean) {
  return { storyId, plan: 'TODO', risks: [] };
}

async function assessInfrastructureReadiness(projectId: string, assessmentType: string) {
  return { projectId, assessmentType, readiness: 'TODO', details: [] };
}

async function planDeploymentSequence(projectId: string, changeScope: string) {
  return { projectId, changeScope, deploymentPlan: 'TODO', dependencies: [] };
}

async function performSecurityAudit(projectId: string, auditScope: string, details: string) {
  return { projectId, auditScope, approved: true, findings: [], vetoIssues: [] };
}

async function assessTestCoverage(storyId: string, changeScope: string) {
  return { storyId, coverage: 'TODO', gaps: [], recommendations: [] };
}

async function assessStakeholderImpact(projectId: string, changeDescription: string) {
  return { projectId, stakeholders: [], impacts: [], changeManagementNeeds: [] };
}

async function diagnoseSystemHealth(projectId: string, symptom: string) {
  return { projectId, symptom, diagnosis: 'TODO', interventions: [] };
}

async function draftCommunication(type: string, context: string, audience?: string) {
  return { type, audience: audience || 'all', draft: 'TODO', keyPoints: [] };
}

async function analyzeCosts(projectId: string, analysisType: string) {
  return { projectId, analysisType, costs: {}, optimizations: [] };
}
