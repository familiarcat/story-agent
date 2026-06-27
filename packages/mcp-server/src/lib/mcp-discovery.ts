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
  type ToolRecord,
} from './crew-tool-registry.js';
import { searchMcpRegistry, type McpRegistryServer } from './mcp-registry-client.js';
import { storeCrewPersonalMemory, storeObservationMemory, getRelevantObservationMemories } from '@story-agent/shared/db';

export const ALL_CREW: CrewId[] = ['picard', 'data', 'worf', 'riker', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark'];

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

// ── TOOL-CARD TEACHING (crew-wide shared understanding) ───────────────────────
// The teaching protocol (crew debate, RAG MEM 27): when a discovery approves a tool, the discoverer
// writes a crew-wide "tool-card" to RAG so every member can recall and reuse it. Teaching shares
// KNOWLEDGE, not auto-trust — execution stays human-gated (autoExecute:false on every card).

export interface ToolCard {
  name: string;
  category: ToolCategory;
  capabilities: string[];
  invocation: string;
  usageContext: string;
  owningRole: CrewId;
  autoExecute: false;
  riskTier: 'low' | 'medium' | 'high';
  costTier: 'low' | 'medium' | 'high';
  securityClearance: string;
  endpoint?: string;
  sourceReference?: string;
  lastVerified: string;
}

/** Build a structured tool-card from an evaluated ToolRecord (pure, testable). */
export function buildToolCard(tool: ToolRecord, owningRole: CrewId, now: string): ToolCard {
  const riskTier = tool.securityClearance === 'approved' ? 'low' : tool.securityClearance === 'review' ? 'medium' : 'high';
  const costTier = tool.costProfile === 'free' ? 'low' : tool.costProfile === 'self-hosted' ? 'medium' : 'high';
  const invocation = tool.endpoint
    ? `Human-gated: configure the MCP server at ${tool.endpoint}, then the crew may call its tools.`
    : `Human-gated: install ${tool.sourceReference ?? tool.name} as an MCP server, then call its tools.`;
  return {
    name: tool.name,
    category: tool.category,
    capabilities: tool.capabilities,
    invocation,
    usageContext: `${owningRole} found this for ${tool.category}: ${tool.description}`,
    owningRole,
    autoExecute: false,
    riskTier,
    costTier,
    securityClearance: tool.securityClearance,
    endpoint: tool.endpoint,
    sourceReference: tool.sourceReference,
    lastVerified: now,
  };
}

/** Validate a tool-card before RAG ingestion (Yar/Geordi schema gate). */
export function validateToolCard(card: Partial<ToolCard>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!card.name) errors.push('name required');
  if (!card.category) errors.push('category required');
  if (!card.capabilities?.length) errors.push('capabilities required');
  if (card.autoExecute !== false) errors.push('autoExecute must be false (execution is human-gated)');
  if (!card.owningRole) errors.push('owningRole required');
  return { ok: errors.length === 0, errors };
}

/** Deterministic story id so re-teaching the same tool UPSERTS one card (dedup), not duplicates. */
export function toolCardStoryId(toolName: string): string {
  return `tool-card:${toolName}`;
}

/** Render a tool-card to the text body that gets embedded + recalled. */
export function toolCardText(card: ToolCard): string {
  return [
    `TOOL-CARD ${card.name} [${card.category}] owner=${card.owningRole} risk=${card.riskTier} cost=${card.costTier} clearance=${card.securityClearance}`,
    `Capabilities: ${card.capabilities.join(', ')}`,
    `Use when: ${card.usageContext}`,
    `Invoke: ${card.invocation}`,
  ].join('\n');
}

/** Teach the whole crew about an approved tool by writing a crew-wide tool-card to RAG. */
export async function teachCrewAboutTool(
  tool: ToolRecord,
  owningRole: CrewId,
  now = new Date().toISOString(),
): Promise<{ taught: boolean; card: ToolCard; errors: string[] }> {
  const card = buildToolCard(tool, owningRole, now);
  const v = validateToolCard(card);
  if (!v.ok) return { taught: false, card, errors: v.errors };
  const text = toolCardText(card);
  try {
    await storeObservationMemory({
      storyId: toolCardStoryId(card.name), // deterministic → dedup on re-teach
      source: 'mcp',
      transcript: {
        rounds: [{ title: `tool-card:${card.name}`, entries: [{ speakerId: owningRole, position: 'support', statement: text, evidence: [card.category, `risk:${card.riskTier}`, `cost:${card.costTier}`] }] }],
        consensusSummary: text,
        unresolvedRisks: card.riskTier !== 'low' ? [`execution human-gated (${card.riskTier} risk)`] : [],
        finalDecision: 'approved',
        actionItems: [`recall via tag tool-card / category ${card.category}`],
      },
      tags: ['tool-card', card.category, `owner:${owningRole}`, `risk:${card.riskTier}`, `cost:${card.costTier}`, 'crew-wide'],
    });
    return { taught: true, card, errors: [] };
  } catch {
    return { taught: false, card, errors: ['rag write failed'] };
  }
}

/** Recall peer-taught tool-cards relevant to a task (embedding recall over the tool-card corpus). */
export async function recallTaughtTools(query: string, limit = 5): Promise<string[]> {
  try {
    const mems = await getRelevantObservationMemories({ queryText: `tool-card ${query}`, clientId: null, limit: limit * 2 });
    return mems
      .filter((m: any) => String(m?.missionReference ?? m?.storyId ?? '').startsWith('tool-card:') || (Array.isArray(m?.tags) && m.tags.includes('tool-card')))
      .slice(0, limit)
      .map((m: any) => m?.transcript?.consensusSummary ?? '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

export interface RoleDiscoveryResult {
  crewId: CrewId;
  query: string;
  categories: ToolCategory[];
  candidates: number;
  evaluated: ToolEvaluationResult[];
  taught: string[]; // names of tools taught crew-wide
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
  const taught: string[] = [];
  for (const server of servers.slice(0, evaluateTop)) {
    if (!server.name) continue;
    const category = inferCategory(server, categories);
    const result = await submitToolForEvaluation(registryServerToProposal(server, category));
    evaluated.push(result);
    // Teaching protocol: an APPROVED tool is taught crew-wide (a tool-card) so peers can reuse it.
    if (result.approved) {
      const t = await teachCrewAboutTool(result.tool, crewId);
      if (t.taught) taught.push(t.card.name);
    }
  }

  // Record the discovery itself as the discoverer's personal memory (their own learning trail).
  try {
    const approved = evaluated.filter((e) => e.approved).map((e) => e.tool.name);
    await storeCrewPersonalMemory({
      crew_id: crewId,
      memory_type: 'insight',
      title: `MCP discovery: "${task.slice(0, 60)}" → ${approved.length} approved, ${taught.length} taught`,
      content: `Searched the official MCP registry with "${query}" (role categories: ${categories.join(', ') || 'none'}). Evaluated ${evaluated.length} of ${servers.length} candidates; approved: ${approved.join(', ') || 'none'}; taught crew-wide: ${taught.join(', ') || 'none'}. Discovered servers are CATALOGUED, not auto-executed (human-gated).`,
      tags: ['mcp-discovery', 'registry', ...categories],
    });
  } catch {
    /* RAG write is best-effort — never fail discovery on a memory hiccup */
  }

  return { crewId, query, categories, candidates: servers.length, evaluated, taught };
}
