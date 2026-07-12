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
const SKILL_REGISTRY = {};
/** The six dimensions every theory must declare — enforces the discipline. */
const REQUIRED_DIMENSIONS = ['who', 'what', 'when', 'where', 'why', 'how'];
/** Validate that a theory declares all 5W1H dimensions with substance. */
export function validateSkillTheory(t) {
    const missing = [];
    if (!t.tool)
        missing.push('tool');
    for (const d of REQUIRED_DIMENSIONS)
        if (!t[d])
            missing.push(d);
    if (t.what && !t.what.summary)
        missing.push('what.summary');
    if (t.when && !(t.when.useWhen?.length))
        missing.push('when.useWhen');
    if (t.why && !t.why.rationale)
        missing.push('why.rationale');
    if (t.who && !t.who.owner)
        missing.push('who.owner');
    if (t.how && !t.how.annotations)
        missing.push('how.annotations');
    return { ok: missing.length === 0, missing };
}
/** Register a tool's theory. Throws if it's incomplete — no half-described skills. */
export function defineSkillTheory(theory) {
    const v = validateSkillTheory(theory);
    if (!v.ok)
        throw new Error(`SkillTheory for '${theory.tool ?? '?'}' is incomplete: missing ${v.missing.join(', ')}`);
    SKILL_REGISTRY[theory.tool] = theory;
    return theory;
}
export function getSkillTheory(tool) {
    return SKILL_REGISTRY[tool];
}
export function listSkillTheories() {
    return Object.values(SKILL_REGISTRY);
}
/** Extract MCP ToolAnnotations from a theory (theory → protocol). */
export function mcpAnnotationsFor(tool) {
    return SKILL_REGISTRY[tool]?.how.annotations;
}
/** Coverage report against a set of registered tool names — what has a theory, what's missing. */
export function skillCoverage(registeredTools) {
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
