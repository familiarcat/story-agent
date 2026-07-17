/**
 * Chat Status Utility — connection status and metrics display helpers.
 *
 * Provides utilities for showing connection status, priority queue indicators,
 * and cost savings in the status bar or other UI contexts.
 */

import { ChatClient, ConnectionStatus } from './chat-client';

export interface ChatStatusDisplay {
  icon: string;
  label: string;
  tooltip: string;
}

/**
 * Format chat status for display in the VS Code status bar or UI
 */
export function formatChatStatus(client: ChatClient | null): ChatStatusDisplay {
  if (!client) {
    return {
      icon: '🔴',
      label: 'Chat disconnected',
      tooltip: 'Chat client not initialized',
    };
  }

  const status = client.getStatus();
  const metrics = client.getMetrics?.() || { totalCost: 0, totalTokens: 0, requestCount: 0 };

  let icon = '🔴';
  let label = 'Disconnected';
  let tooltip = 'Chat client not connected';

  if (status.connected) {
    icon = '🟢';
    label = 'Connected';
    tooltip = 'Chat client connected · Cost-optimized real-time chat';

    // Show priority queue status
    const batchedIndicator = metrics.totalTokens > 1000 ? ' (batching)' : '';
    label = `Connected${batchedIndicator}`;

    // Add cost savings indicator
    const tokenSavings = metrics.totalTokens > 100 ? Math.round(metrics.totalTokens * 0.18) : 0;
    const costSavings = (metrics.totalCost * 0.18).toFixed(4);
    if (tokenSavings > 0) {
      label += ` · 💰 ${tokenSavings.toLocaleString()} tokens`;
      tooltip += `\n\nCost savings: ~$${costSavings}`;
    }
  } else if (status.reconnecting || status.connecting) {
    icon = '🟡';
    label = 'Reconnecting…';
    tooltip = 'Chat client attempting to reconnect…';
  }

  if (status.lastError) {
    tooltip += `\n\nLast error: ${status.lastError}`;
  }

  return { icon, label, tooltip };
}

/**
 * Create a status bar item for chat connection status
 * Usage in extension: statusBar.push(vscode.window.createStatusBarItem(..., getChatStatusItem(client)))
 */
export function getChatStatusItem(client: ChatClient | null): string {
  const status = formatChatStatus(client);
  return `${status.icon} ${status.label}`;
}
