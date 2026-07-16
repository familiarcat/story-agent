/**
 * Pure transcript helpers for the Agent Workspace — the SSE-frame + rendering logic that has no React
 * dependency, extracted so it is unit-testable in the node vitest env (the page itself is a streaming
 * client component). Covers the security-relevant error sanitizer, the running-cost reducer, the diff
 * heuristic, and the SSE frame parser.
 */

/** One parsed Server-Sent-Events frame: an optional `event:` name + the decoded `data:` JSON. */
export interface SSEFrame {
  eventName: string | null;
  data: Record<string, unknown> | null;
}

/**
 * Parse a single SSE block (the text between blank-line separators) into {eventName, data}. Returns
 * null when the block carries no `data:` line or the payload isn't valid JSON (a partial frame).
 */
export function parseSSEFrame(block: string): SSEFrame | null {
  let eventName: string | null = null;
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { eventName, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

/**
 * Running session cost. SET semantics (not additive): the terminal `done` carries the final cumulative
 * `totalCostUSD`, and a `cost` frame carries the cumulative spend at a review-threshold crossing — so
 * reflecting either directly avoids double-counting. Any other frame leaves the total unchanged.
 */
export function cumulativeCost(prev: number, frame: SSEFrame): number {
  const { eventName, data } = frame;
  if (eventName === 'done' && typeof data?.totalCostUSD === 'number') return data.totalCostUSD;
  if (data?.type === 'cost' && typeof data?.costUSD === 'number') return data.costUSD;
  return prev;
}

/**
 * Surface a clean, human-readable error to the browser: take the first meaningful line (skip stack
 * frames), strip absolute filesystem paths (which can leak internals/usernames), and cap the length.
 * Full detail stays server-side in the agent audit/logs.
 */
export function sanitizeError(text: string): string {
  if (!text || !text.trim()) return 'Something went wrong. Please try again.';
  const firstLine = text.split('\n').find((l) => l.trim() && !/^\s*at\s/.test(l)) ?? text;
  return firstLine
    .replace(/\/(?:Users|home|var|opt|private|tmp)\/[^\s)'"]+/g, '<path>')
    .trim()
    .slice(0, 300);
}

/** Heuristic: does this tool result look like a unified diff worth colorizing? */
export function isDiff(tool: string, text: string): boolean {
  if (/git_diff|apply_patch/.test(tool)) return /^[-+@]|^diff |^@@/m.test(text);
  return /^@@.*@@/m.test(text) && /^[-+]/m.test(text);
}

/** Stable JSON for tool-call args display; falls back to String() on cycles. */
export function safeJson(v: unknown): string {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
