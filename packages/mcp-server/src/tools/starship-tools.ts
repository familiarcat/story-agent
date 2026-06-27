/**
 * Starship MCP Tools — Autonomous Crew Skill System & Tool Registry
 *
 * Exposes the crew's self-learning infrastructure as MCP tools:
 *
 * - get_crew_skill_manifest    — inspect a crew member's current skill state
 * - get_crew_personas          — query canonical Memory Alpha persona data
 * - seed_crew_skill_manifests  — initialize all 11 manifests in Supabase
 * - evaluate_tool_for_crew     — submit an MCP tool for crew evaluation
 * - list_tool_registry         — see all tools in the registry
 * - get_starship_status        — full starship health + skill summary
 * - run_mission_debrief        — trigger post-mission skill improvement cycle
 * - run_observation_lounge     — convene the crew for self-reflective discussion
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  loadSkillManifest,
  seedAllCrewManifests,
  getCrewSkillSummary,
  buildEnrichedSystemPrompt,
  runMissionDebriefCycle,
  type DebriefEntry,
} from '../lib/crew-skill-system.js';
import {
  submitToolForEvaluation,
  listToolRegistry,
  getApprovedToolsForCrew,
  type ToolCategory,
  type CostProfile,
} from '../lib/crew-tool-registry.js';
import { discoverMcpForRole, recallTaughtTools } from '../lib/mcp-discovery.js';
import {
  getPersona,
  CREW_PERSONAS,
  CREW_MISSION_ORDER,
  CRITICAL_CREW,
  SUPPORT_CREW,
  type CrewId,
} from '../lib/crew-personas.js';
import { getPromptEngineConnectivityDiagnostics } from '../lib/prompt-engine.js';
import { runObservationLoungeSession, formatLoungeSessionAsMarkdown, type ObservationLoungeSession } from '../lib/crew-lounge.js';

export function registerStarshipTools(server: McpServer): void {

  // ── GET CREW SKILL MANIFEST ───────────────────────────────────────────────

  server.tool(
    'get_crew_skill_manifest',
    'Get the current versioned skill manifest for a crew member — their active prompt engineering context, domain expertise, and accumulated learnings from mission debriefs.',
    {
      crewId: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
      includeEnrichedPrompt: z.boolean().optional().default(false),
      missionContext: z.string().optional(),
    },
    async (args) => {
      const manifest = await loadSkillManifest(args.crewId as CrewId);
      const output: Record<string, unknown> = {
        crewId: manifest.crewId,
        version: manifest.version,
        canonicalPersonaHash: manifest.canonicalPersonaHash,
        improvementSource: manifest.improvementSource,
        lastImprovedAt: manifest.lastImprovedAt,
        selfImprovementNoteCount: manifest.selfImprovementNotes.length,
        recentNotes: manifest.selfImprovementNotes.slice(-3),
        toolUsageExampleCount: manifest.toolUsageExamples.length,
        domainSystemPromptPreview: manifest.domainSystemPrompt.substring(0, 300) + '...',
      };

      if (args.includeEnrichedPrompt) {
        output.enrichedSystemPrompt = await buildEnrichedSystemPrompt(
          args.crewId as CrewId,
          args.missionContext
        );
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ── GET CREW PERSONAS ────────────────────────────────────────────────────

  server.tool(
    'get_crew_personas',
    'Query canonical Memory Alpha persona data for one or all crew members. Returns canonical traits, defining moments, canonical quotes, and role information.',
    {
      crewId: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark', 'all']).optional().default('all'),
      fields: z.array(z.enum(['traits', 'specializations', 'definingMoments', 'quotes', 'growthAreas', 'relationships', 'role'])).optional(),
    },
    async (args) => {
      const targetIds: CrewId[] = args.crewId === 'all'
        ? CREW_MISSION_ORDER
        : [args.crewId as CrewId];

      const result = targetIds.reduce<Record<string, unknown>>((acc, id) => {
        const persona = getPersona(id);
        const fields = args.fields;

        const entry: Record<string, unknown> = {
          id: persona.id,
          fullName: persona.fullName,
          rank: persona.rank,
          engineeringRole: persona.engineeringRole,
          tagline: persona.tagline,
        };

        if (!fields || fields.includes('traits')) entry.personalityTraits = persona.personalityTraits;
        if (!fields || fields.includes('specializations')) entry.specializations = persona.specializations;
        if (!fields || fields.includes('definingMoments')) entry.definingMoments = persona.definingMoments;
        if (!fields || fields.includes('quotes')) entry.canonicalQuotes = persona.canonicalQuotes;
        if (!fields || fields.includes('growthAreas')) entry.growthAreas = persona.growthAreas;
        if (!fields || fields.includes('relationships')) entry.keyRelationships = persona.keyRelationships;

        acc[id] = entry;
        return acc;
      }, {});

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── SEED CREW SKILL MANIFESTS ─────────────────────────────────────────────

  server.tool(
    'seed_crew_skill_manifests',
    'Initialize all 11 crew skill manifests in Supabase from the canonical Memory Alpha persona data. Safe to call multiple times — only seeds missing records.',
    {},
    async () => {
      const result = await seedAllCrewManifests();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            seeded: result.seeded,
            skipped: result.skipped,
            message: result.seeded.length > 0
              ? `Seeded ${result.seeded.length} crew manifests: ${result.seeded.join(', ')}`
              : 'All crew manifests already initialized',
          }, null, 2),
        }],
      };
    }
  );

  // ── EVALUATE TOOL FOR CREW ────────────────────────────────────────────────

  server.tool(
    'evaluate_tool_for_crew',
    'Submit an MCP tool or external dependency for crew evaluation. Runs Worf security screen → Quark cost eval → specialist evaluation → Picard final approval. Result is persisted in the tool registry.',
    {
      name: z.string().describe('Tool identifier (e.g. "github-mcp", "supabase-mcp")'),
      description: z.string().describe('What this tool does'),
      category: z.enum([
        'code-search', 'documentation', 'ci-cd', 'security',
        'database', 'analytics', 'communication', 'infrastructure',
        'testing', 'ai-tooling', 'project-management',
      ]),
      capabilities: z.array(z.string()).describe('List of capabilities this tool provides'),
      endpoint: z.string().optional().describe('MCP server endpoint if applicable'),
      sourceReference: z.string().optional().describe('npm package, GitHub URL, or registry reference'),
      costProfile: z.enum(['free', 'paid', 'self-hosted']).default('free'),
      metadata: z.record(z.unknown()).optional().default({}),
    },
    async (args) => {
      const result = await submitToolForEvaluation({
        name: args.name,
        description: args.description,
        category: args.category as ToolCategory,
        capabilities: args.capabilities,
        endpoint: args.endpoint,
        sourceReference: args.sourceReference,
        costProfile: args.costProfile as CostProfile,
        metadata: args.metadata ?? {},
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: args.name,
            finalDecision: result.finalDecision,
            approved: result.approved,
            worfVetoed: result.worfVetoed,
            crewApprovals: result.crewApprovalCount,
            crewRejections: result.crewRejectCount,
            rationale: result.decisionRationale,
            qualityScore: result.tool.qualityScore.toFixed(2),
            securityClearance: result.tool.securityClearance,
          }, null, 2),
        }],
      };
    }
  );

  // ── DISCOVER MCP TOOLS (per-role, official registry → eval → teach crew) ───

  server.tool(
    'discover_mcp_tools',
    'A crew member dynamically DISCOVERS MCP servers relevant to its ROLE from the official MCP registry (registry.modelcontextprotocol.io), runs each through the crew evaluation pipeline (Worf security → Quark cost → specialist votes → Picard), and TEACHES the crew about approved tools by writing a crew-wide tool-card to RAG. Discovered servers are catalogued + human-gated — never auto-executed.',
    {
      crewId: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
      task: z.string().describe('The task or capability gap driving discovery (keywords are searched against the registry)'),
      limit: z.number().optional().default(10).describe('Max registry candidates to fetch'),
      evaluateTop: z.number().optional().default(2).describe('How many top candidates to run through the full crew evaluation'),
    },
    async (args) => {
      const r = await discoverMcpForRole(args.crewId as CrewId, args.task, { limit: args.limit, evaluateTop: args.evaluateTop });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            crewId: r.crewId,
            query: r.query,
            roleCategories: r.categories,
            candidates: r.candidates,
            evaluated: r.evaluated.map((e) => ({ name: e.tool.name, decision: e.finalDecision, approved: e.approved, securityClearance: e.tool.securityClearance })),
            taughtCrewWide: r.taught,
            note: 'Approved tools are catalogued + taught crew-wide. Execution stays human-gated (autoExecute=false).',
          }, null, 2),
        }],
      };
    }
  );

  // ── RECALL TAUGHT TOOLS (peer-taught tool-cards from crew-wide RAG) ─────────

  server.tool(
    'recall_taught_tools',
    'Recall peer-taught MCP tool-cards relevant to a task from crew-wide RAG — how a crew member learns a tool another member already found and taught. Returns tool-card summaries (name, capabilities, how-to-invoke, risk/cost). Execution remains human-gated.',
    {
      query: z.string().describe('Task or capability to find taught tools for'),
      limit: z.number().optional().default(5),
    },
    async (args) => {
      const cards = await recallTaughtTools(args.query, args.limit);
      return {
        content: [{ type: 'text', text: cards.length ? cards.join('\n\n---\n\n') : '(no peer-taught tools recalled for this query)' }],
      };
    }
  );

  // ── LIST TOOL REGISTRY ────────────────────────────────────────────────────

  server.tool(
    'list_tool_registry',
    'List all tools in the crew\'s MCP tool registry with their evaluation status, security clearance, and quality scores.',
    {
      crewId: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']).optional(),
      statusFilter: z.enum(['all', 'approved', 'rejected', 'proposed', 'under_evaluation']).optional().default('all'),
    },
    async (args) => {
      let tools;
      if (args.crewId) {
        tools = await getApprovedToolsForCrew(args.crewId as CrewId);
      } else {
        const all = await listToolRegistry();
        tools = args.statusFilter === 'all'
          ? all
          : all.filter(t => t.status === args.statusFilter);
      }

      const summary = tools.map(t => ({
        name: t.name,
        category: t.category,
        status: t.status,
        securityClearance: t.securityClearance,
        qualityScore: t.qualityScore?.toFixed(2),
        worfVeto: t.worfVeto,
        capabilities: t.capabilities,
        lastEvaluatedAt: t.lastEvaluatedAt,
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: summary.length,
            tools: summary,
          }, null, 2),
        }],
      };
    }
  );

  // ── RUN MISSION DEBRIEF ───────────────────────────────────────────────────

  server.tool(
    'run_mission_debrief',
    'Trigger a post-mission debrief cycle that applies crew learnings to their skill manifests. Pass debrief findings per crew member — improvements with confidence >= 0.7 are applied as versioned updates.',
    {
      missionId: z.string().describe('Mission identifier (story reference number or mission ID)'),
      findings: z.array(z.object({
        crewId: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
        finding: z.string().describe('What this crew member observed'),
        proposedImprovement: z.string().describe('How they propose to improve their approach next time'),
        confidence: z.number().min(0).max(1).describe('Confidence that this improvement is valid (0-1)'),
        domainTag: z.string().optional(),
      })),
    },
    async (args) => {
      const debriefEntries: DebriefEntry[] = args.findings.map(f => ({
        crewId: f.crewId as CrewId,
        missionId: args.missionId,
        finding: f.finding,
        proposedImprovement: f.proposedImprovement,
        confidence: f.confidence,
        domainTag: f.domainTag,
      }));

      const results = await runMissionDebriefCycle(args.missionId, debriefEntries);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            missionId: args.missionId,
            updatedCrew: results.map(r => ({
              crewId: r.crewId,
              previousVersion: r.previousVersion,
              newVersion: r.newVersion,
              appliedImprovements: r.appliedImprovements,
            })),
            totalImprovementsApplied: results.reduce((n, r) => n + r.appliedImprovements.length, 0),
            notUpdated: CREW_MISSION_ORDER.filter(id => !results.find(r => r.crewId === id)),
          }, null, 2),
        }],
      };
    }
  );

  // ── GET STARSHIP STATUS ───────────────────────────────────────────────────

  server.tool(
    'get_starship_status',
    'Full Sovereign Factory starship status — crew skill versions, model routing health, LLM connectivity, and tool registry summary.',
    {
      includePersonaSummary: z.boolean().optional().default(false),
    },
    async (args) => {
      const [skillSummary, connectivity, toolRegistry] = await Promise.all([
        getCrewSkillSummary(),
        getPromptEngineConnectivityDiagnostics(),
        listToolRegistry(),
      ]);

      const approvedTools = toolRegistry.filter(t => t.status === 'approved' && !t.worfVeto);
      const blockedTools = toolRegistry.filter(t => t.worfVeto);
      const pendingTools = toolRegistry.filter(t => t.status === 'proposed' || t.status === 'under_evaluation');

      const output: Record<string, unknown> = {
        starship: 'Sovereign Factory',
        status: connectivity.reachable ? 'OPERATIONAL' : 'ADVISORY MODE',
        llmConnectivity: connectivity,
        crewRoster: {
          total: CREW_MISSION_ORDER.length,
          criticalCrew: CRITICAL_CREW,
          supportCrew: SUPPORT_CREW,
        },
        skillManifests: skillSummary,
        toolRegistry: {
          total: toolRegistry.length,
          approved: approvedTools.length,
          blocked: blockedTools.length,
          pending: pendingTools.length,
          approvedTools: approvedTools.map(t => ({ name: t.name, category: t.category })),
        },
      };

      if (args.includePersonaSummary) {
        output.personas = Object.fromEntries(
          CREW_MISSION_ORDER.map(id => {
            const p = getPersona(id);
            return [id, { fullName: p.fullName, rank: p.rank, tagline: p.tagline }];
          })
        );
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ── RUN OBSERVATION LOUNGE ────────────────────────────────────────────────

  server.tool(
    'run_observation_lounge',
    'Convene the crew in the Observation Lounge for a self-referential discussion. Each crew member reflects on: (1) what they believe the overall project goal is, (2) their self-referential role in the team, and (3) what next steps they personally recommend after the crew deliberation. Returns each crew member\'s authentic statement plus Captain Picard\'s synthesis.',
    {
      crewIds: z.array(
        z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark'])
      ).optional().describe('Subset of crew to include. Defaults to all 11 members.'),
      format: z.enum(['json', 'markdown']).optional().default('markdown').describe('Output format'),
    },
    async (args) => {
      const session = await runObservationLoungeSession({
        crewIds: args.crewIds as CrewId[] | undefined,
        sessionLabel: 'MCP Tool Invocation',
      });

      const text = args.format === 'markdown'
        ? formatLoungeSessionAsMarkdown(session)
        : JSON.stringify(session, null, 2);

      return {
        content: [{ type: 'text', text }],
      };
    }
  );
}
