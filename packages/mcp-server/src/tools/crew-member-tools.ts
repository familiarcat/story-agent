/**
 * Crew Member MCP Tools - 11 Star Trek personas as autonomous MCP tools
 * 
 * Each crew member is registered as an independent MCP tool that can:
 * - Analyze stories autonomously using their assigned LLM model
 * - Provide specialized findings based on their expertise
 * - Make recommendations with authority weight
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgileStory } from '@story-agent/shared';
import {
  captainPicardAnalysis,
  dataArchitectAnalysis,
  rikerDeveloperAnalysis,
  geordiInfraAnalysis,
  obrienDevOpsAnalysis,
  worfSecurityAnalysis,
  tashaQAAnalysis,
  troiAnalystAnalysis,
  crusherHealthAnalysis,
  uhuraCommunicationsAnalysis,
  quarkFinanceAnalysis,
} from '../lib/crew-agents.js';

export function registerCrewMemberTools(server: McpServer): void {
  // Helper to create story object from arguments
  const createStory = (args: any): AgileStory => ({
    id: args.storyId || 'unknown',
    name: args.storyName || 'Unknown',
    description: args.storyDescription || '',
    acceptanceCriteria: args.acceptanceCriteria || '',
    referenceNum: args.referenceNum || '',
    url: '',
    workflowStatus: 'ready',
  });

  // CAPTAIN PICARD
  server.tool(
    'crew_captain_picard',
    'Captain Picard - Crew Manager. Strategic mission decomposition and executive authority. Uses Claude 3 Opus.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      acceptanceCriteria: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
      targetBranch: z.string().optional(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await captainPicardAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: args.targetBranch || 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // COMMANDER DATA
  server.tool(
    'crew_commander_data',
    'Commander Data - DDD Architect. Domain-driven design patterns and clean architecture. Uses Claude 3.5 Sonnet.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      acceptanceCriteria: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
      targetBranch: z.string().optional(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await dataArchitectAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: args.targetBranch || 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // COMMANDER RIKER
  server.tool(
    'crew_commander_riker',
    'Commander Riker - Full-Stack Developer. Tactical implementation and phased execution. Uses Claude 3.5 Sonnet.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      acceptanceCriteria: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
      targetBranch: z.string().optional(),
      techStack: z.string().optional(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await rikerDeveloperAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: args.targetBranch || 'main',
        techStack: args.techStack,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // GEORDI LA FORGE
  server.tool(
    'crew_geordi_la_forge',
    'Geordi La Forge - Infrastructure Developer. Containerization and deployment readiness. Uses Claude 3.5 Sonnet.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await geordiInfraAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // CHIEF O'BRIEN
  server.tool(
    'crew_chief_obrien',
    'Chief O\'Brien - DevOps Engineer. CI/CD pipelines and system integration. Uses GPT-4o-mini.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
      targetBranch: z.string().optional(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await obrienDevOpsAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: args.targetBranch || 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // LT. WORF - VETO AUTHORITY
  server.tool(
    'crew_lt_worf',
    'Lt. Worf - Security Officer. VETO AUTHORITY over unsafe decisions. Uses GPT-4o-mini. ⚠️ Can block execution.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await worfSecurityAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // TASHA YAR
  server.tool(
    'crew_tasha_yar',
    'Tasha Yar - QA Auditor. Test coverage and smoke testing. Uses Gemini Flash.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
      testPolicy: z.string().optional(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await tashaQAAnalysis({
        story,
        repoFullName: 'unknown/repo',
        targetBranch: 'main',
        testPolicy: args.testPolicy,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // COUNSELOR TROI
  server.tool(
    'crew_counselor_troi',
    'Counselor Troi - System Analyst. Stakeholder impact and intent validation. Uses Claude 3 Haiku.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      acceptanceCriteria: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await troiAnalystAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // DR. BEVERLY CRUSHER
  server.tool(
    'crew_dr_crusher',
    'Dr. Beverly Crusher - System Health Analyst. Health diagnostics and observability. Uses Claude 3.5 Sonnet.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
      repoFullName: z.string(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await crusherHealthAnalysis({
        story,
        repoFullName: args.repoFullName,
        targetBranch: 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // LT. UHURA
  server.tool(
    'crew_lt_uhura',
    'Lt. Uhura - Communications Analyst. Stakeholder communication and status broadcasting. Uses Gemini 1.5 Pro.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
      reviewers: z.string().optional(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await uhuraCommunicationsAnalysis({
        story,
        repoFullName: 'unknown/repo',
        targetBranch: 'main',
        reviewers: args.reviewers,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // QUARK
  server.tool(
    'crew_quark',
    'Quark - Financial Analyst. Cost optimization and model arbitrage. Uses GPT-4o-mini.',
    {
      storyId: z.string(),
      storyName: z.string(),
      storyDescription: z.string(),
      referenceNum: z.string(),
    },
    async (args) => {
      const story = createStory(args);
      const result = await quarkFinanceAnalysis({
        story,
        repoFullName: 'unknown/repo',
        targetBranch: 'main',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
