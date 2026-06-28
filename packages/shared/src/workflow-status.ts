/**
 * Shared crew/agent run-status contract — the single shape both surfaces render so crew feedback
 * looks identical on the web dashboard and in the VS Code extension (universal UI/UX strategy, OBS
 * 569ec582: a reusable <WorkflowStatus>/<CrewFeedback> primitive driven by one contract). The web
 * imports this directly; the extension mirrors it. Pairs with [selection-contract.ts] + [agent-modes.ts].
 */

/** WorfGate posture tally for a run (green = auto, yellow = remediated, red = blocked/approval). */
export interface WorfGatePosture {
  green: number;
  yellow: number;
  red: number;
}

/** A normalized summary of one crew/agent run — what <WorkflowStatus> renders. */
export interface WorkflowStatusData {
  /** The model that ran (e.g. "deepseek/deepseek-chat"). */
  model?: string;
  /** Tool-calling iterations / turns. */
  iterations?: number;
  /** Number of tool calls made. */
  toolCount?: number;
  /** Total cost in USD for the run. */
  costUSD?: number;
  /** Total tokens consumed. */
  totalTokens?: number;
  posture?: WorfGatePosture;
  /** Whether the run auto-escalated to a stronger model / the crew. */
  escalated?: boolean;
  /** Whether the run stalled (produced text with no actionable tool calls). */
  stalled?: boolean;
  /** Whether the token budget was hit. */
  budgetExceeded?: boolean;
}

export type WorkflowStatusTone = 'ok' | 'warn' | 'danger';

/** Overall tone for the status badge: red gate or stall = danger; escalation/budget = warn; else ok. */
export function workflowStatusTone(s: WorkflowStatusData): WorkflowStatusTone {
  if (s.stalled || (s.posture?.red ?? 0) > 0) return 'danger';
  if (s.escalated || s.budgetExceeded || (s.posture?.yellow ?? 0) > 0) return 'warn';
  return 'ok';
}

/** A compact one-line summary (used by surfaces that can't render the full card, e.g. a chat line). */
export function workflowStatusLine(s: WorkflowStatusData): string {
  const parts: string[] = [];
  if (s.model) parts.push(s.model);
  if (s.iterations != null) parts.push(`${s.iterations} turns`);
  if (s.toolCount != null) parts.push(`${s.toolCount} tools`);
  if (s.costUSD != null) parts.push(`$${s.costUSD.toFixed(5)}`);
  if (s.posture) parts.push(`🟢${s.posture.green}/🟡${s.posture.yellow}/🔴${s.posture.red}`);
  if (s.escalated) parts.push('escalated');
  if (s.stalled) parts.push('STALLED');
  if (s.budgetExceeded) parts.push('budget-capped');
  return parts.join(' · ');
}
