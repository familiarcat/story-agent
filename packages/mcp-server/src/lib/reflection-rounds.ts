/**
 * Reflection rounds — turn the crew's BLIND single-round contribution into actual deliberation.
 *
 * The problem this solves: runMissionPipeline called one model per officer, all in parallel, with
 * none of them seeing any other officer's position. Picard then "synthesized" nine independent
 * monologues. There was no rebuttal, no cross-examination, and no opportunity for anyone to be
 * talked out of a wrong position — so the pipeline could not catch a confabulation even when another
 * officer's contribution contradicted it. (Observed live: officers invented statistics and a
 * security incident to explain a bug whose cause was stated in the brief, and agreed with each other.)
 *
 * The fix is rounds, not more officers. Each officer sees a digest of the others and must declare a
 * STANCE: revised, held (with a rebuttal), or conceded (to a named officer).
 *
 * THE ANTI-THEATER RULE: reflection that never changes a position is theater. This module MEASURES
 * whether positions actually moved and flags a deliberation where nobody ever budged, because a
 * hardcoded template also produces perfect agreement. Unanimity is only evidence when dissent was
 * possible. Compare `runObservationLoungeDebate`, which manufactured "Consensus achieved" as a
 * string literal — the whole point here is to be structurally incapable of that.
 *
 * Everything in this module is PURE so the deliberation logic is testable without model calls.
 */

/** One officer's contribution in one round. */
export interface RoundContribution {
  crewId: string;
  model: string;
  text: string;
  costUSD: number;
}

/** Where an officer landed relative to their previous position. */
export type Stance = 'revised' | 'held' | 'conceded' | 'unknown';

export interface ReflectionSummary {
  rounds: number;
  /** Officers whose stance changed (revised or conceded) at least once after round 1. */
  positionsChanged: string[];
  /** Count of each declared stance across all reflection rounds. */
  stanceCounts: Record<Stance, number>;
  /**
   * True when reflection ran but NOBODY revised or conceded in any round. Not proof of theater, but
   * the signal that unanimity here carries no information — treat the conclusion as unvalidated.
   */
  theaterWarning: boolean;
  /** Human-readable one-liner for the stored record and the operator. */
  note: string;
}

/** Marker an officer must emit so their stance is machine-readable. */
const STANCE_PATTERNS: Array<{ stance: Exclude<Stance, 'unknown'>; pattern: RegExp }> = [
  // Order matters: CONCEDED is checked before HELD so "I concede, I will not hold" reads as conceded.
  { stance: 'conceded', pattern: /\bCONCEDED?\b/i },
  { stance: 'revised', pattern: /\bREVISED?\b/i },
  { stance: 'held', pattern: /\bHELD?\b|\bHOLD\b/i },
];

/** Parse the declared stance out of an officer's reflection text. */
export function classifyStance(text: string): Stance {
  const t = String(text ?? '');
  for (const { stance, pattern } of STANCE_PATTERNS) {
    if (pattern.test(t)) return stance;
  }
  return 'unknown';
}

/**
 * Build the digest one officer reads before reflecting: every OTHER officer's position, truncated.
 * Excluding their own keeps the prompt focused on what they must respond to, and truncation bounds
 * token growth — a full transcript per officer per round would make cost scale quadratically.
 */
export function buildDigest(
  contributions: readonly RoundContribution[],
  excludeCrewId: string,
  maxCharsPerEntry = 320,
): string {
  return contributions
    .filter((c) => c.crewId !== excludeCrewId)
    .map((c) => {
      const text = String(c.text ?? '').replace(/\s+/g, ' ').trim();
      const clipped = text.length > maxCharsPerEntry ? `${text.slice(0, maxCharsPerEntry)}…` : text;
      return `${c.crewId}: ${clipped}`;
    })
    .join('\n');
}

/** The instruction that makes a reflection round produce a machine-readable stance. */
export function buildReflectionSystemPrompt(crewId: string, domain: string, round: number, totalRounds: number): string {
  return [
    `You are ${crewId} (${domain}) of the Story Agent crew, in reflection round ${round} of ${totalRounds}.`,
    'You will read the other officers\' positions. Do NOT simply restate your own.',
    'Begin your reply with exactly ONE of these words:',
    '  REVISED — you are changing your position, and you say what changed your mind.',
    '  CONCEDED — you defer to a specific officer, whom you NAME.',
    '  HELD — you keep your position, and you give a concrete rebuttal to whoever disagreed.',
    'If no other officer engaged your domain, prefer REVISED or CONCEDED only when genuinely warranted;',
    'do not manufacture agreement. Challenge any claim that cites data you have not seen.',
    'Then 2-3 sentences. Be specific; no summaries of the discussion.',
  ].join('\n');
}

/**
 * Summarize what the reflection rounds actually accomplished.
 * `reflectionRounds` excludes round 1 (the blind opening positions have no stance to declare).
 */
export function summarizeReflection(reflectionRounds: ReadonlyArray<readonly RoundContribution[]>): ReflectionSummary {
  const stanceCounts: Record<Stance, number> = { revised: 0, held: 0, conceded: 0, unknown: 0 };
  const changed = new Set<string>();

  for (const round of reflectionRounds) {
    for (const c of round) {
      const stance = classifyStance(c.text);
      stanceCounts[stance]++;
      if (stance === 'revised' || stance === 'conceded') changed.add(c.crewId);
    }
  }

  const rounds = reflectionRounds.length;
  const positionsChanged = [...changed].sort();
  const anyContributions = reflectionRounds.some((r) => r.length > 0);
  const theaterWarning = rounds > 0 && anyContributions && positionsChanged.length === 0;

  const note = !anyContributions
    ? 'No reflection rounds ran — single-round (blind) deliberation only.'
    : theaterWarning
      ? `⚠️ ${rounds} reflection round(s) ran and NO officer revised or conceded. Unanimity here is not evidence — nobody was moved, so the conclusion is unvalidated by disagreement.`
      : `${positionsChanged.length} officer(s) moved across ${rounds} reflection round(s): ${positionsChanged.join(', ')}.`;

  return { rounds, positionsChanged, stanceCounts, theaterWarning, note };
}

/** Resolve how many reflection rounds to run. 3 is the default ("3x self-reflection"). */
export function resolveReflectionRounds(explicit?: number, env: NodeJS.ProcessEnv = process.env): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return Math.max(0, Math.min(5, Math.trunc(explicit)));
  const raw = env.CREW_REFLECTION_ROUNDS;
  if (raw != null && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.min(5, Math.trunc(n)));
  }
  return 3;
}
