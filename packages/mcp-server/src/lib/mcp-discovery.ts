/**
 * Per-role MCP discovery — the capability the crew asked for: each crew member can DISCOVER MCP
 * libraries relevant to its role/task from the official registry, run them through the EXISTING
 * crew-tool-registry evaluation pipeline (Worf security → Quark cost → specialist votes → Picard),
 * and persist approved ToolRecords (sa_tool_registry) + a crew personal memory so future tasks recall
 * them. Discovery is catalog-only: a freshly-discovered MCP server is NEVER auto-executed — its
 * endpoint is recorded with requiresHumanGate=true (Worf/Yar/O'Brien/Crusher consensus on supply-chain
 * trust). Closing the loop, getApprovedToolsForCrew() then surfaces approved tools back to that role.
 */
import type { CrewId } from './crew-personas.js';
import {
  TOOL_EVALUATORS,
  submitToolForEvaluation,
  type ToolCategory,
  type ToolEvaluationResult,
} from './crew-tool-registry.js';
import { searchMcpRegistry, type McpRegistryServer } from './mcp-registry-client.js';
import { storeCrewPersonalMemory } from '@story-agent/shared/db';

/** Categories a crew member owns (reverse of TOOL_EVALUATORS) — the lens for role-scoped discovery. */
export function categoriesForCrew(crewId: CrewId): ToolCategory[] {
  return (Object.entries(TOOL_EVALUATORS) as [ToolCategory, CrewId[]][])
    .filter(([, evaluators]) => evaluators.includes(crewId))
    .map(([cat]) => cat);
}

/** Build a short keyword query for the registry from the crew member's role categories + the task. */
export function buildRegistryQuery(crewId: CrewId, task: string): string {
  const cats = categoriesForCrew(crewId).map((c) => c.replace('-', ' '));
  const taskKeywords = task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);
  return [...new Set([...taskKeywords, ...cats])].slice(0, 6).join(' ');
}

const CATEGORY_KEYWORDS: Record<ToolCategory, string[]> = {
  'code-search': ['code', 'search', 'grep', 'index', 'repo', 'symbol'],
  'documentation': ['doc', 'documentation', 'wiki', 'readme', 'knowledge'],
  'ci-cd': ['ci', 'cd', 'pipeline', 'build', 'deploy', 'action', 'workflow'],
  'security': ['security', 'auth', 'secret', 'vuln', 'scan', 'sast', 'audit'],
  'database': ['database', 'sql', 'postgres', 'mongo', 'supabase', 'query'],
  'analytics': ['analytics', 'metric', 'telemetry', 'dashboard', 'report'],
  'communication': ['slack', 'email', 'message', 'notify', 'chat', 'discord'],
  'infrastructure': ['infra', 'terraform', 'docker', 'kubernetes', 'aws', 'cloud'],
  'testing': ['test', 'coverage', 'playwright', 'e2e', 'qa', 'lint'],
  'ai-tooling': ['llm', 'embedding', 'vector', 'model', 'rag', 'agent'],
  'project-management': ['jira', 'linear', 'project', 'issue', 'task', 'aha'],
};

/** Pick the best ToolCategory for a server WITHIN the crew member's owned set (pure, testable). */
export function inferCategory(server: McpRegistryServer, allowed: ToolCategory[]): ToolCategory {
  const hay = `${server.name} ${server.title ?? ''} ${server.description}`.toLowerCase();
  for (const cat of allowed) {
    if ((CATEGORY_KEYWORDS[cat] ?? []).some((k) => hay.includes(k))) return cat;
  }
  return allowed[0] ?? 'ai-tooling';
}

/** Loose capability keywords from a server's text (pure, testable). */
export function deriveCapabilities(server: McpRegistryServer): string[] {
  const words = `${server.title ?? ''} ${server.description}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  return [...new Set(words)].slice(0, 8);
}

/**
 * Convert a registry server into a ToolRecord proposal for the evaluation pipeline. The endpoint is
 * recorded but flagged autoExecute=false / requiresHumanGate=true — discovery never runs the server.
 */
export function registryServerToProposal(
  server: McpRegistryServer,
  category: ToolCategory,
): Parameters<typeof submitToolForEvaluation>[0] {
  const remote = server.remotes?.find((r) => r.url);
  const pkg = server.packages?.[0];
  return {
    name: server.name,
    description: server.description || server.title || server.name,
    category,
    capabilities: deriveCapabilities(server),
    endpoint: remote?.url,
    sourceReference: pkg?.identifier ? `${pkg.registryType ?? 'pkg'}:${pkg.identifier}` : server.name,
    costProfile: remote ? 'paid' : 'self-hosted',
    metadata: {
      source: 'mcp-registry',
      registryVersion: server.version ?? null,
      isLatest: server.isLatest ?? null,
      transports: server.remotes?.map((r) => r.type) ?? (pkg ? ['stdio'] : []),
      autoExecute: false, // Worf: never auto-run a freshly discovered server
      requiresHumanGate: true,
    },
  };
}

export interface RoleDiscoveryResult {
  crewId: CrewId;
  query: string;
  categories: ToolCategory[];
  candidates: number;
  evaluated: ToolEvaluationResult[];
}

/**
 * A crew member discovers role-relevant MCP servers, evaluates the top N through the existing pipeline,
 * and records the discovery to RAG. Network + LLM + DB heavy → integration-level (the pure helpers
 * above are unit-tested). `fetchImpl` is injectable for tests/WorfGate brokering.
 */
export async function discoverMcpForRole(
  crewId: CrewId,
  task: string,
  opts: { limit?: number; evaluateTop?: number; fetchImpl?: typeof fetch } = {},
): Promise<RoleDiscoveryResult> {
  const categories = categoriesForCrew(crewId);
  const query = buildRegistryQuery(crewId, task);
  const { servers } = await searchMcpRegistry({ search: query, limit: opts.limit ?? 10, fetchImpl: opts.fetchImpl });

  const evaluateTop = opts.evaluateTop ?? 2;
  const evaluated: ToolEvaluationResult[] = [];
  for (const server of servers.slice(0, evaluateTop)) {
    if (!server.name) continue;
    const category = inferCategory(server, categories);
    const result = await submitToolForEvaluation(registryServerToProposal(server, category));
    evaluated.push(result);
  }

  // Record the discovery to RAG (crew personal memory) so future tasks recall what this role found.
  try {
    const approved = evaluated.filter((e) => e.approved).map((e) => e.tool.name);
    await storeCrewPersonalMemory({
      crew_id: crewId,
      memory_type: 'insight',
      title: `MCP discovery: "${task.slice(0, 60)}" → ${approved.length} approved`,
      content: `Searched the official MCP registry with "${query}" (role categories: ${categories.join(', ') || 'none'}). Evaluated ${evaluated.length} of ${servers.length} candidates; approved: ${approved.join(', ') || 'none'}. Discovered servers are CATALOGUED, not auto-executed (human-gated).`,
      tags: ['mcp-discovery', 'registry', ...categories],
    });
  } catch {
    /* RAG write is best-effort — never fail discovery on a memory hiccup */
  }

  return { crewId, query, categories, candidates: servers.length, evaluated };
}
