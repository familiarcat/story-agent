/**
 * Prompt engineering standards — applies the framing discipline from the WWT AI Engineer interview
 * materials (Prompt Eng Q2: Role→Context→Task→Constraints→Output Format; the four closing "Framing
 * Tips": anchor in scenario, name the tradeoff, name the eval, security ≠ prompt) to the crew's own
 * runtime prompts in crew-mission-pipeline.ts.
 *
 * Two things, deliberately kept separate:
 *   1. buildStructuredPrompt() — a composer so every crew-facing system prompt follows the same
 *      Role/Context/Task/Constraints/OutputFormat shape instead of ad hoc string concatenation
 *      (Prompt Eng Q2: "Structure removes the ambiguity that causes model drift").
 *   2. scoreFramingTips() — a PURE, ground-truth scorer (same "measure, don't assume" discipline as
 *      reflection-rounds.ts's classifyStance/anti-theater rule) that checks whether a crew member's
 *      OWN contribution actually anchored in the scenario, named a tradeoff, named an eval, and drew
 *      the security≠prompt distinction where relevant — the same four badges the interview deck's
 *      scenario playbook scores itself against. This makes the deck's own rubric something the crew
 *      can be held to, not just something a human interviewer reads for.
 *
 * Both are pure/offline — no model calls — so they're fully unit testable (see prompt-standards.test.ts).
 */

export interface StructuredPromptSpec {
  /** "You are ${crewId} (${domain})..." — perspective & expertise (Prompt Eng Q2). */
  role: string;
  /** Relevant facts, retrieved docs, prior turns/positions. Omit sections that don't apply. */
  context?: string;
  /** The single, explicit instruction — one sentence, not a paragraph of hedging. */
  task: string;
  /** Length, tone, refusal rules, scope limits — imperatives, not suggestions. */
  constraints?: string[];
  /** Schema/structure/no-preamble rule. Omit for free-text positions; required for parsed output. */
  outputFormat?: string;
}

/**
 * Compose a system prompt in the deck's canonical section order. Sections with no content are
 * omitted entirely rather than emitted empty — an empty "CONSTRAINTS:" header is itself an
 * ambiguity source (Prompt Eng Q2's whole point is removing ambiguity, not relocating it).
 */
export function buildStructuredPrompt(spec: StructuredPromptSpec): string {
  const parts: string[] = [spec.role.trim()];
  if (spec.context?.trim()) parts.push(`CONTEXT:\n${spec.context.trim()}`);
  parts.push(`TASK:\n${spec.task.trim()}`);
  if (spec.constraints?.length) parts.push(`CONSTRAINTS:\n${spec.constraints.map((c) => `- ${c}`).join('\n')}`);
  if (spec.outputFormat?.trim()) parts.push(`OUTPUT FORMAT:\n${spec.outputFormat.trim()}`);
  return parts.join('\n\n');
}

/** The four badges from the scenario playbook, applied to a crew member's own contribution text. */
export interface FramingScore {
  anchoredInScenario: boolean;
  namesTradeoff: boolean;
  namesEval: boolean;
  securityNePrompt: boolean;
  /** Count of the four badges lit — a coarse, human-scannable summary. */
  badgeCount: 0 | 1 | 2 | 3 | 4;
}

// Deliberately generous, keyword-level heuristics — this is a coaching signal for RAG recall and
// the efficiency report, not a gate (nothing here blocks a run, matching Decision 2's "advisory
// only" philosophy from the max-iterations fix). A false negative just means the badge doesn't
// light; it never fails the officer's actual contribution.
const TRADEOFF_MARKERS = /\btrade[\s-]?off\b|\bhowever\b|\bat the cost of\b|\bin exchange for\b|\bversus\b|\bwhile this\b/i;
const EVAL_MARKERS = /\beval(?:uate|uation)?\b|\bmeasure\b|\btrack\b|\bmetric\b|\bregression test\b|\bbenchmark\b/i;
const SECURITY_NE_PROMPT_MARKERS = /\barchitecture\b.{0,40}\bsecurity\b|\bpermission(?:s|ing)?\b|\bscop(?:e|ing)\b.{0,20}\btool\b|\bnot (?:a|the) prompt\b|\bprompt(?:ing)? (?:alone )?(?:can'?t|cannot|won'?t)\b/i;
// "Anchored in scenario" is the hardest to detect generically — approximate it as: the text
// references something concrete (a number, an id, a named system/officer) rather than staying
// purely abstract. This intentionally undercounts; a missed badge is the safe failure direction.
const SCENARIO_ANCHOR_MARKERS = /\d|`[^`]+`|\b(?:this (?:task|issue|bug|run|deploy|migration))\b/i;

export function scoreFramingTips(text: string): FramingScore {
  const t = String(text ?? '');
  const anchoredInScenario = SCENARIO_ANCHOR_MARKERS.test(t);
  const namesTradeoff = TRADEOFF_MARKERS.test(t);
  const namesEval = EVAL_MARKERS.test(t);
  const securityNePrompt = SECURITY_NE_PROMPT_MARKERS.test(t);
  const badgeCount = ([anchoredInScenario, namesTradeoff, namesEval, securityNePrompt].filter(Boolean).length) as 0 | 1 | 2 | 3 | 4;
  return { anchoredInScenario, namesTradeoff, namesEval, securityNePrompt, badgeCount };
}

/** Appended to a crew member's contribution/reflection prompt — the deck's tips as a live instruction. */
export const FRAMING_TIP_REMINDER = [
  'Where relevant: anchor your position in a concrete detail of THIS task (a number, a file, a system',
  'name) rather than staying abstract; if you are trading one thing for another, say so explicitly;',
  'name how you or someone else would MEASURE that your recommendation worked, not just state it;',
  'and if this touches an irreversible action or untrusted retrieved content, be explicit that the',
  'safeguard lives in permissions/tool-scoping, not in asking the model nicely.',
].join(' ');
