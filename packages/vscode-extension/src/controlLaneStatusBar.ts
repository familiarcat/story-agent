/**
 * Control-lane status bar — persistent VS Code indicator of which lane is driving
 * (🟢 direct/shell · 🟡 crew · 🔴 agent) plus cumulative session cost. Mirrors the
 * per-message lane badges in ChatPanel and the repo's control-lane model
 * (packages/shared/src/control-lane.ts): make it observable when the cheap OpenRouter
 * crew is driving vs when the premium orchestrator is.
 */
import * as vscode from 'vscode';

export type ControlLane = 'shell' | 'crew' | 'claude';

let item: vscode.StatusBarItem | undefined;
let sessionCostUSD = 0;
let turns = 0;

const LANE_UI: Record<ControlLane, { dot: string; label: string }> = {
  shell: { dot: '🟢', label: 'direct' },
  crew: { dot: '🟡', label: 'crew' },
  claude: { dot: '🔴', label: 'agent' },
};

/** Register the status bar item during extension activation. */
export function initControlLaneStatusBar(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.text = '🖖 Story Agent';
  item.tooltip = 'Story Agent control lane — awaiting first response';
  item.show();
  context.subscriptions.push(item);
}

/**
 * Update the indicator after a chat/agent response. `lane` is derived by the caller
 * from the response metadata; `addCostUSD` accumulates into the session total.
 */
export function updateControlLane(lane: ControlLane, addCostUSD = 0): void {
  if (!item) return;
  if (Number.isFinite(addCostUSD) && addCostUSD > 0) sessionCostUSD += addCostUSD;
  turns += 1;
  const ui = LANE_UI[lane] ?? LANE_UI.shell;
  item.text = `🖖 ${ui.dot} ${ui.label} · $${sessionCostUSD.toFixed(4)}`;
  item.tooltip =
    `Story Agent — active lane: ${ui.label}\n` +
    `Session: ${turns} turn(s), $${sessionCostUSD.toFixed(5)}\n` +
    `🟢 direct  🟡 crew (OpenRouter)  🔴 agent`;
}
