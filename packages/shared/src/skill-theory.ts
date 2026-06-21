/**
 * Skill Theory — a "5W1H" systems-of-theory descriptor for every MCP tool / agent skill.
 *
 * MCP's open-source convention (modelcontextprotocol SDK) describes a tool with a name,
 * description, inputSchema, and `ToolAnnotations` HINTS (title, readOnlyHint, destructiveHint,
 * idempotentHint, openWorldHint). Anthropic Agent Skills add a "when to use" trigger. This
 * extends those into a complete, self-describing theory so any agent (or human) knows:
 *
 *   WHO   — who owns/may invoke it (crew officer, authorized crew, min security tier)
 *   WHAT  — what it does (summary + capabilities)
 *   WHEN  — when to use it / avoid it / preconditions
 *   WHERE — where it operates (scope, surfaces, blast radius)
 *   WHY   — why it exists (rationale + goals served)
 *   HOW   — how it's invoked, how it behaves (MCP annotation hints), and how it LOOKS (output)
 *
 * The HOW.annotations field IS the MCP ToolAnnotations object, so theory → protocol is lossless.
 */

/** MCP ToolAnnotations (mirrors @modelcontextprotocol/sdk ToolAnnotationsSchema — all hints). */
export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export type SkillScope =
  | 'local-fs' | 'local-shell' | 'git' | 'cloud-db' | 'rag' | 'aha' | 'github' | 'aws' | 'llm' | 'crew' | 'meta';

export type SkillSurface = 'cli' | 'api' | 'vscode' | 'mcp';

export type SkillSecurityTier = 'standard' | 'enterprise' | 'regulated';

export interface SkillTheory {
  /** The tool name this theory describes (matches the MCP/agent-core tool name). */
  tool: string;

  who: {
    /** Owning crew officer (e.g. 'worf' for security tools). */
    owner: string;
    /** Crew members permitted to invoke; omit = any recognized crew. */
    authorizedCrew?: string[];
    /** Minimum client security tier required to use this skill. */
    minTier?: SkillSecurityTier;
  };

  what: {
    summary: string;
    capabilities: string[];
  };

  when: {
    /** Situations where this skill is the right choice. */
    useWhen: string[];
    /** Situations to avoid it (cheaper/safer alternative exists). */
    avoidWhen?: string[];
    /** Must-be-true conditions before invoking. */
    preconditions?: string[];
  };

  where: {
    scope: SkillScope[];
    surfaces: SkillSurface[];
    /** Blast radius of the action. */
    sideEffects: 'none' | 'local' | 'external';
  };

  why: {
    rationale: string;
    goalsServed?: string[];
  };

  how: {
    /** One-line invocation summary / argument shape. */
    invocation: string;
    /** MCP ToolAnnotations hints — flow straight into tool registration. */
    annotations: McpToolAnnotations;
    /** "How should it look" — the shape/representation of the output. */
    output: string;
  };
}

const SKILL_REGISTRY: Record<string, SkillTheory> = {};

/** The six dimensions every theory must declare — enforces the discipline. */
const REQUIRED_DIMENSIONS = ['who', 'what', 'when', 'where', 'why', 'how'] as const;

export interface TheoryValidation { ok: boolean; missing: string[] }

/** Validate that a theory declares all 5W1H dimensions with substance. */
export function validateSkillTheory(t: Partial<SkillTheory>): TheoryValidation {
  const missing: string[] = [];
  if (!t.tool) missing.push('tool');
  for (const d of REQUIRED_DIMENSIONS) if (!t[d]) missing.push(d);
  if (t.what && !t.what.summary) missing.push('what.summary');
  if (t.when && !(t.when.useWhen?.length)) missing.push('when.useWhen');
  if (t.why && !t.why.rationale) missing.push('why.rationale');
  if (t.who && !t.who.owner) missing.push('who.owner');
  if (t.how && !t.how.annotations) missing.push('how.annotations');
  return { ok: missing.length === 0, missing };
}

/** Register a tool's theory. Throws if it's incomplete — no half-described skills. */
export function defineSkillTheory(theory: SkillTheory): SkillTheory {
  const v = validateSkillTheory(theory);
  if (!v.ok) throw new Error(`SkillTheory for '${theory.tool ?? '?'}' is incomplete: missing ${v.missing.join(', ')}`);
  SKILL_REGISTRY[theory.tool] = theory;
  return theory;
}

export function getSkillTheory(tool: string): SkillTheory | undefined {
  return SKILL_REGISTRY[tool];
}

export function listSkillTheories(): SkillTheory[] {
  return Object.values(SKILL_REGISTRY);
}

/** Extract MCP ToolAnnotations from a theory (theory → protocol). */
export function mcpAnnotationsFor(tool: string): McpToolAnnotations | undefined {
  return SKILL_REGISTRY[tool]?.how.annotations;
}

/** Coverage report against a set of registered tool names — what has a theory, what's missing. */
export function skillCoverage(registeredTools: string[]): {
  total: number; described: number; coverage: number;
  missing: string[]; described_tools: string[];
} {
  const described = registeredTools.filter(t => SKILL_REGISTRY[t]);
  const missing = registeredTools.filter(t => !SKILL_REGISTRY[t]);
  return {
    total: registeredTools.length,
    described: described.length,
    coverage: registeredTools.length ? Number((described.length / registeredTools.length).toFixed(2)) : 0,
    missing,
    described_tools: described,
  };
}
