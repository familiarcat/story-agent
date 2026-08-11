/**
 * Iteration budget — replaces the hardcoded `maxIterations: 12` that chat.ts was passing into
 * planThenExecute regardless of what the crew actually decided.
 *
 * Root cause this fixes: the crew mission pipeline (Picard/Riker/Quark) can seat anywhere from 2
 * to 11 officers and run 1-3 reflection rounds, but the EXECUTION loop that then carries out their
 * plan was always capped at 12 turns — often less than one turn per officer's assigned step before
 * verify/typecheck/nudge overhead is even counted. "reached max iterations without a final summary"
 * was the predictable result, not a mystery.
 *
 * Decision (human-in-the-loop, 2026-08-10):
 *   - Use crew CONSENSUS ROUND COUNT (team size × reflection rounds) as the complexity signal
 *     instead of raw input length — input length says nothing about how much work the crew
 *     actually agreed needs doing.
 *   - Freeze at a safe constant (15) whenever the mission plan isn't available yet or looks
 *     degenerate, so a bad signal never STARVES a run below the old-known-safe floor.
 *   - Bounded [10, 50] — mirrors the existing loop.ts safety bounds so this never introduces an
 *     unbounded/runaway loop.
 */
import type { TeamMember } from './crew-team-assembly.js';

export const SAFE_FALLBACK_ITERATIONS = 15;
// Floors at the OLD flat value (12) rather than lower — this fix exists because 12 was already too
// tight for anything but the smallest crew; a derived budget must never be able to undercut it.
const MIN_ITERATIONS = 12;
const MAX_ITERATIONS = 50;

export interface IterationBudgetInput {
  /** The crew assembled to deliberate/execute this task. */
  team: TeamMember[];
  /** How many reflection rounds the crew actually ran (0 = blind opening only). */
  reflectionRounds: number;
}

/**
 * Roughly: one turn per seated officer's step, plus one turn per reflection round the team argued
 * through (more rounds ⇒ more revised/contested steps that need re-execution), plus a fixed
 * overhead for orientation + verify + the guaranteed summary turn. Frontier-tier (tier 4) members
 * get a small per-member bonus — their steps tend to be the architecturally heavier ones.
 */
export function computeMaxIterations(input: IterationBudgetInput | null | undefined): number {
  if (!input || !Array.isArray(input.team) || input.team.length === 0) {
    return SAFE_FALLBACK_ITERATIONS;
  }
  const { team, reflectionRounds } = input;
  const frontierBonus = team.filter((m) => m.capabilityTier >= 4).length;
  const raw = 6 // fixed overhead: orient + verify + summary
    + team.length * 2 // ~2 execution turns per seated officer's step
    + Math.max(0, reflectionRounds) * team.length // contested steps re-argued per round
    + frontierBonus;
  const bounded = Math.min(MAX_ITERATIONS, Math.max(MIN_ITERATIONS, raw));
  return Number.isFinite(bounded) ? bounded : SAFE_FALLBACK_ITERATIONS;
}
