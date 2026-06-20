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
  // Track crew member registration for diagnostic purposes
  const registeredCrew: string[] = [];
  const registrationErrors: { crew: string; error: string }[] = [];

  // Helper to create story object from arguments
  const createStory = (args: any): AgileStory => ({
    id: args.storyId || 'unknown',
    name: args.storyName || 'Unknown',
    description: args.storyDescription || '',
    acceptanceCriteria: args.acceptanceCriteria || '',
    epicId: args.epicId || undefined, // Pass epicId if available
    referenceNum: args.referenceNum || '',
    url: '',
    workflowStatus: 'ready',
  });

  // CAPTAIN PICARD
  try {
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
    registeredCrew.push('picard');
    process.stderr.write('✅ Registered: Captain Jean-Luc Picard\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'picard', error });
    process.stderr.write(`❌ Failed to register: Captain Picard — ${error}\n`);
  }

  // COMMANDER DATA
  try {
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
    registeredCrew.push('data');
    process.stderr.write('✅ Registered: Commander Data\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'data', error });
    process.stderr.write(`❌ Failed to register: Commander Data — ${error}\n`);
  }

  // COMMANDER RIKER
  try {
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
    registeredCrew.push('riker');
    process.stderr.write('✅ Registered: Commander William Thomas Riker\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'riker', error });
    process.stderr.write(`❌ Failed to register: Commander Riker — ${error}\n`);
  }

  // GEORDI LA FORGE
  try {
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
    registeredCrew.push('geordi');
    process.stderr.write('✅ Registered: Geordi La Forge\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'geordi', error });
    process.stderr.write(`❌ Failed to register: Geordi La Forge — ${error}\n`);
  }

  // CHIEF O'BRIEN
  try {
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
    registeredCrew.push('obrien');
    process.stderr.write('✅ Registered: Chief Miles Edward O\'Brien\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'obrien', error });
    process.stderr.write(`❌ Failed to register: Chief O'Brien — ${error}\n`);
  }

  // LT. WORF - VETO AUTHORITY
  try {
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
    registeredCrew.push('worf');
    process.stderr.write('✅ Registered: Lieutenant Worf (Veto Authority)\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'worf', error });
    process.stderr.write(`❌ Failed to register: Lieutenant Worf — ${error}\n`);
  }

  // TASHA YAR
  try {
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
    registeredCrew.push('tasha');
    process.stderr.write('✅ Registered: Lieutenant Tasha Yar\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'tasha', error });
    process.stderr.write(`❌ Failed to register: Lieutenant Tasha Yar — ${error}\n`);
  }

  // COUNSELOR TROI
  try {
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
    registeredCrew.push('troi');
    process.stderr.write('✅ Registered: Counselor Deanna Troi\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'troi', error });
    process.stderr.write(`❌ Failed to register: Counselor Troi — ${error}\n`);
  }

  // DR. BEVERLY CRUSHER
  try {
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
    registeredCrew.push('crusher');
    process.stderr.write('✅ Registered: Dr. Beverly Crusher\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'crusher', error });
    process.stderr.write(`❌ Failed to register: Dr. Crusher — ${error}\n`);
  }

  // LT. UHURA
  try {
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
    registeredCrew.push('uhura');
    process.stderr.write('✅ Registered: Lieutenant Nyota Uhura\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'uhura', error });
    process.stderr.write(`❌ Failed to register: Lieutenant Uhura — ${error}\n`);
  }

  // QUARK
  try {
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
    registeredCrew.push('quark');
    process.stderr.write('✅ Registered: Quark (Financial Analyst)\n');
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    registrationErrors.push({ crew: 'quark', error });
    process.stderr.write(`❌ Failed to register: Quark — ${error}\n`);
  }

  // Registration Summary
  process.stderr.write(`\n📊 Crew Member Registration Summary:\n`);
  process.stderr.write(`   ✅ Successfully registered: ${registeredCrew.length}/11\n`);
  if (registrationErrors.length > 0) {
    process.stderr.write(`   ❌ Registration errors: ${registrationErrors.length}\n`);
    registrationErrors.forEach(({ crew, error }) => {
      process.stderr.write(`      - ${crew}: ${error}\n`);
    });
  }
}
