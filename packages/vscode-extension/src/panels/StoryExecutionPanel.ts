/**
 * Story Execution Panel - WebView for real-time crew execution in VS Code
 */

import * as vscode from 'vscode';
import type { CrewExecutionState } from '@story-agent/shared';

export class StoryExecutionPanel {
  private panel: vscode.WebviewPanel;
  private ws: WebSocket | null = null;
  private storyRef: string;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, storyRef: string) {
    this.storyRef = storyRef;
    this.context = context;

    this.panel = vscode.window.createWebviewPanel(
      'storyExecution',
      `Executing ${storyRef}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableForms: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    this.panel.onDidDispose(() => this.cleanup());
    this.initWebSocket();
    this.updatePanel();
  }

  private initWebSocket(): void {
    const wsUrl = vscode.workspace
      .getConfiguration('storyAgent')
      .get<string>('crewWebSocketUrl') || 'ws://localhost:8000';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        vscode.window.showInformationMessage(`Connected to crew state server`);
        this.ws?.send(
          JSON.stringify({
            type: 'subscribe',
            storyRef: this.storyRef,
          })
        );
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'state:initial' || message.type === 'state:updated') {
            this.updatePanel(message.payload);
          }
        } catch (err) {
          console.error('Message parse error:', err);
        }
      };

      this.ws.onerror = (event: Event) => {
        vscode.window.showErrorMessage('Crew state connection error');
      };

      this.ws.onclose = () => {
        vscode.window.showWarningMessage('Crew state connection closed');
      };
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to connect to crew state: ${err}`);
    }
  }

  private updatePanel(state?: CrewExecutionState): void {
    if (!this.panel) return;

    const html = state ? this.renderState(state) : this.renderLoading();
    this.panel.webview.html = html;
    
    // Also fetch and update developer advisor insights
    this.updateDeveloperAdvisor();
  }

  private async updateDeveloperAdvisor(): Promise<void> {
    try {
      // Fetch developer-focused crew insights
      const dashboardUrl =
        vscode.workspace
          .getConfiguration('storyAgent')
          .get<string>('dashboardUrl') || 'http://localhost:3000';
      
      const response = await fetch(
        `${dashboardUrl}/api/crew/insights?storyRef=${this.storyRef}&role=developer`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Insights will be displayed in side panel (see CrewCopilotProvider updates)
      }
    } catch (err) {
      console.error('Error updating developer advisor:', err);
    }
  }

  private renderState(state: CrewExecutionState): string {
    const crewHtml = state.crewExecutions
      .map(
        execution => `
      <div class="crew-member ${execution.status}">
        <div class="crew-header">
          <span class="crew-name">${execution.crewName}</span>
          <span class="crew-status">${this.getStatusBadge(execution.status)}</span>
        </div>
        ${
          execution.findings
            ? `
        <div class="crew-findings">
          <p class="findings-text">${execution.findings}</p>
          ${
            execution.recommendations && execution.recommendations.length > 0
              ? `
            <div class="recommendations">
              <strong>Recommendations:</strong>
              <ul>
                ${execution.recommendations.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          `
              : ''
          }
          ${
            execution.confidence !== undefined
              ? `<div class="confidence">Confidence: ${execution.confidence}%</div>`
              : ''
          }
          ${execution.isVeto ? '<div class="veto">🛑 SECURITY VETO</div>' : ''}
          ${execution.costUsd !== undefined ? `<div class="cost">💰 $${execution.costUsd.toFixed(4)}</div>` : ''}
        </div>
      `
            : ''
        }
      </div>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 12px;
            margin: 0;
          }
          h1 {
            margin-top: 0;
            font-size: 18px;
            margin-bottom: 8px;
          }
          .status-line {
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          .phase {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
          }
          .next-step {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-weight: 500;
          }
          .progress-bar {
            width: 100%;
            height: 4px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 12px;
          }
          .progress-fill {
            height: 100%;
            background-color: var(--vscode-terminal-ansiGreen);
            transition: width 0.3s;
          }
          .crew-section {
            margin-bottom: 12px;
          }
          .crew-member {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
          }
          .crew-member.pending {
            border-color: var(--vscode-terminal-ansiGray);
          }
          .crew-member.executing {
            border-color: var(--vscode-terminal-ansiBlue);
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          .crew-member.complete {
            border-color: var(--vscode-terminal-ansiGreen);
          }
          .crew-member.vetoed {
            border-color: var(--vscode-terminal-ansiRed);
            background-color: rgba(255, 0, 0, 0.05);
          }
          .crew-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
          }
          .crew-name {
            font-weight: 600;
          }
          .crew-status {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
          }
          .crew-findings {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 6px;
          }
          .findings-text {
            margin: 0 0 6px 0;
            line-height: 1.4;
          }
          .recommendations {
            margin: 6px 0;
            padding-left: 16px;
          }
          .recommendations strong {
            display: block;
            margin-bottom: 4px;
          }
          .recommendations ul {
            margin: 0;
            padding-left: 16px;
          }
          .recommendations li {
            margin: 2px 0;
          }
          .confidence {
            font-weight: 500;
            color: var(--vscode-textLink-foreground);
            margin-top: 4px;
          }
          .veto {
            color: var(--vscode-terminal-ansiRed);
            font-weight: bold;
            margin-top: 4px;
          }
          .cost {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            margin-top: 4px;
          }
          .blockers {
            background-color: rgba(255, 0, 0, 0.1);
            border: 1px solid var(--vscode-terminal-ansiRed);
            border-radius: 4px;
            padding: 8px;
            margin-top: 12px;
            color: var(--vscode-terminal-ansiRed);
          }
          .footer {
            margin-top: 12px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 12px;
          }
        </style>
      </head>
      <body>
        <h1>Story Execution: ${this.storyRef}</h1>
        
        <div class="status-line">
          <span class="phase">${state.phase.toUpperCase()}</span>
          <span>Status: ${state.status}</span>
        </div>

        <div class="next-step">
          ${state.nextStep}
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width: ${
            ((state.crewExecutions.filter(c => c.status === 'complete').length /
              state.crewExecutions.length) *
              100) |
            0
          }%"></div>
        </div>

        <div class="crew-section">
          <h2 style="margin: 0 0 8px 0; font-size: 14px;">Crew Findings</h2>
          ${crewHtml}
        </div>

        ${
          state.blockers && state.blockers.length > 0
            ? `
          <div class="blockers">
            <strong>🛑 Blockers:</strong>
            <ul>
              ${state.blockers.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        <div class="footer">
          <span>💰 Total: $${state.totalCostUsd.toFixed(4)}</span>
          <span>⏱️ Time: ${Math.round(state.totalExecutionTimeMs / 1000)}s</span>
          <span>🔄 Updates: ${state.broadcastCount}</span>
        </div>
      </body>
      </html>
    `;
  }

  private renderLoading(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          h1 { margin: 0; font-size: 18px; }
          .loading { color: var(--vscode-descriptionForeground); }
        </style>
      </head>
      <body>
        <h1>Story Execution: ${this.storyRef}</h1>
        <div class="loading">Connecting to crew state server...</div>
      </body>
      </html>
    `;
  }

  private getStatusBadge(status: string): string => {
    const badges: Record<string, string> = {
      pending: '⏳ Pending',
      executing: '🔄 Executing',
      complete: '✅ Complete',
      vetoed: '🛑 Vetoed',
      error: '⚠️ Error',
    };
    return badges[status] || status;
  };

  private cleanup(): void {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          storyRef: this.storyRef,
        })
      );
      this.ws.close();
    }
  }
}
