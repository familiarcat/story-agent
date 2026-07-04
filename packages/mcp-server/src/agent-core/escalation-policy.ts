/**
 * Determines the next escalation tier based on consecutive failures.
 * Keeps LLM usage cost-optimal by defaulting to the cheapest adequate model
 * and escalating only after `threshold` consecutive failures.
 * @param currentTier The current capability tier (Quark default = 3).
 * @param consecutiveFailures Number of consecutive failures.
 * @param opts Optional config: threshold (default 3), maxTier (default 4).
 * @returns Next tier to escalate to, or null if no escalation is needed.
 */
export function nextEscalationTier(
  currentTier: number,
  consecutiveFailures: number,
  opts?: { threshold?: number; maxTier?: number }
): number | null {
  const threshold = opts?.threshold ?? 3;
  const maxTier = opts?.maxTier ?? 4;

  // Clamp currentTier to valid range (>= 0, <= maxTier)
  currentTier = Math.max(0, Math.min(currentTier, maxTier));

  // Clamp consecutiveFailures to be non-negative
  consecutiveFailures = Math.max(0, consecutiveFailures);

  // Escalate if past threshold and not already at maxTier
  if (consecutiveFailures >= threshold && currentTier < maxTier) {
    return currentTier + 1;
  }

  return null;
}