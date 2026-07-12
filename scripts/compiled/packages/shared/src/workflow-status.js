/**
 * Shared crew/agent run-status contract — the single shape both surfaces render so crew feedback
 * looks identical on the web dashboard and in the VS Code extension (universal UI/UX strategy, OBS
 * 569ec582: a reusable <WorkflowStatus>/<CrewFeedback> primitive driven by one contract). The web
 * imports this directly; the extension mirrors it. Pairs with [selection-contract.ts] + [agent-modes.ts].
 */
/** Overall tone for the status badge: red gate or stall = danger; escalation/budget = warn; else ok. */
export function workflowStatusTone(s) {
    if (s.stalled || (s.posture?.red ?? 0) > 0)
        return 'danger';
    if (s.escalated || s.budgetExceeded || (s.posture?.yellow ?? 0) > 0)
        return 'warn';
    return 'ok';
}
/** A compact one-line summary (used by surfaces that can't render the full card, e.g. a chat line). */
export function workflowStatusLine(s) {
    const parts = [];
    if (s.model)
        parts.push(s.model);
    if (s.iterations != null)
        parts.push(`${s.iterations} turns`);
    if (s.toolCount != null)
        parts.push(`${s.toolCount} tools`);
    if (s.costUSD != null)
        parts.push(`$${s.costUSD.toFixed(5)}`);
    if (s.posture)
        parts.push(`🟢${s.posture.green}/🟡${s.posture.yellow}/🔴${s.posture.red}`);
    if (s.escalated)
        parts.push('escalated');
    if (s.stalled)
        parts.push('STALLED');
    if (s.budgetExceeded)
        parts.push('budget-capped');
    return parts.join(' · ');
}
