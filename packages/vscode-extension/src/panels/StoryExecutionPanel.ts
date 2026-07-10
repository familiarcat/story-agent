/**
 * Story Execution Panel - WebView for real-time crew execution in VS Code
 */

import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { space, webviewTokenStyle } from '@story-agent/shared/ui-tokens';

function getNonce(): string {
  return randomBytes(16).toString('base64');
}

// Local type definition (mirrors @story-agent/shared)
interface CrewExecution {
  crewId: string;
  crewName: string;
  status: 'pending' | 'executing' | 'complete' | 'error' | 'vetoed';
  findings?: string;
  recommendations?: string[];
  confidence?: number;
  isVeto?: boolean;
  costUsd?: number;
}

interface CrewExecutionState {
  storyRef: string;
  status: 'pending' | 'in-progress' | 'complete' | 'blocked';
  phase: string;
  nextStep: string;
  crewExecutions: CrewExecution[];
  blockers?: string[];
  cost?: number;
  totalCostUsd?: number;
  totalExecutionTimeMs?: number;
  broadcastCount?: number;
  estimatedCompletionTime?: string;
}

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
    // No CSP added: the progress-fill width is an inline style attribute, which a
    // nonce-based CSP would disable. Token injection stays a nonce'd static <style>.
    const nonce = getNonce();
    const crewHtml = state.crewExecutions
      .map(
        (execution: unknown) => {
          const exec = execution as any;
          return `
      <div class="crew-member ${exec.status}">
        <div class="crew-header">
          <span class="crew-name">${exec.crewName}</span>
          <span class="crew-status">${this.getStatusBadge(exec.status)}</span>
        </div>
        ${
          exec.findings
            ? `
        <div class="crew-findings">
          <p class="findings-text">${exec.findings}</p>
          ${
            exec.recommendations && exec.recommendations.length > 0
              ? `
            <div class="recommendations">
              <strong>Recommendations:</strong>
              <ul>
                ${(exec.recommendations as string[]).map((r: string) => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          `
              : ''
          }
          ${
            exec.confidence !== undefined
              ? `<div class="confidence">Confidence: ${exec.confidence}%</div>`
              : ''
          }
          ${exec.isVeto ? '<div class="veto">🛑 SECURITY VETO</div>' : ''}
          ${exec.costUsd !== undefined ? `<div class="cost">💰 $${exec.costUsd.toFixed(4)}</div>` : ''}
        </div>
      `
            : ''
        }
      </div>
    `;
        }
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        ${webviewTokenStyle(nonce)}
        <style nonce="${nonce}">
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell;
            color: var(--sa-text);
            background-color: var(--sa-surface);
            padding: ${space(3)};
            margin: 0;
          }
          h1 {
            margin-top: 0;
            font-size: 18px;
            margin-bottom: ${space(2)};
          }
          .status-line {
            display: flex;
            gap: ${space(4)};
            margin-bottom: ${space(3)};
            font-size: 12px;
            color: var(--sa-muted);
          }
          .phase {
            font-weight: bold;
            color: var(--sa-accent);
          }
          .next-step {
            background-color: var(--sa-card);
            padding: ${space(2)};
            border-radius: 4px;
            margin-bottom: ${space(3)};
            font-weight: 500;
          }
          .progress-bar {
            width: 100%;
            height: 4px;
            background-color: var(--sa-card);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: ${space(3)};
          }
          .progress-fill {
            height: 100%;
            background-color: var(--sa-ok);
            transition: width 0.3s;
          }
          .crew-section {
            margin-bottom: ${space(3)};
          }
          .crew-member {
            border: 1px solid var(--sa-border);
            border-radius: 4px;
            padding: ${space(2)};
            margin-bottom: ${space(2)};
          }
          .crew-member.pending {
            border-color: var(--sa-muted);
          }
          .crew-member.executing {
            border-color: var(--sa-accent);
            background-color: var(--sa-card);
          }
          .crew-member.complete {
            border-color: var(--sa-ok);
          }
          .crew-member.vetoed {
            border-color: var(--sa-danger);
            background-color: color-mix(in srgb, var(--sa-danger) 5%, transparent);
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
            color: var(--sa-muted);
            margin-top: 6px;
          }
          .findings-text {
            margin: 0 0 6px 0;
            line-height: 1.4;
          }
          .recommendations {
            margin: 6px 0;
            padding-left: ${space(4)};
          }
          .recommendations strong {
            display: block;
            margin-bottom: ${space(1)};
          }
          .recommendations ul {
            margin: 0;
            padding-left: ${space(4)};
          }
          .recommendations li {
            margin: 2px 0;
          }
          .confidence {
            font-weight: 500;
            color: var(--sa-accent);
            margin-top: ${space(1)};
          }
          .veto {
            color: var(--sa-danger);
            font-weight: bold;
            margin-top: ${space(1)};
          }
          .cost {
            color: var(--sa-muted);
            font-size: 11px;
            margin-top: ${space(1)};
          }
          .blockers {
            background-color: color-mix(in srgb, var(--sa-danger) 10%, transparent);
            border: 1px solid var(--sa-danger);
            border-radius: 4px;
            padding: ${space(2)};
            margin-top: ${space(3)};
            color: var(--sa-danger);
          }
          .footer {
            margin-top: ${space(3)};
            font-size: 11px;
            color: var(--sa-muted);
            display: flex;
            gap: ${space(3)};
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
            ((state.crewExecutions.filter((c: any) => c.status === 'complete').length /
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
              ${state.blockers.map((b: string) => `<li>${b}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        <div class="footer">
          <span>💰 Total: $${(state.totalCostUsd ?? 0).toFixed(4)}</span>
          <span>⏱️ Time: ${Math.round((state.totalExecutionTimeMs ?? 0) / 1000)}s</span>
          <span>🔄 Updates: ${state.broadcastCount ?? 0}</span>
        </div>
      </body>
      </html>
    `;
  }

  private renderLoading(): string {
    const nonce = getNonce();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        ${webviewTokenStyle(nonce)}
        <style nonce="${nonce}">
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
            color: var(--sa-text);
            background-color: var(--sa-surface);
            padding: ${space(5)};
            display: flex;
            flex-direction: column;
            gap: ${space(3)};
          }
          h1 { margin: 0; font-size: 18px; }
          .loading { color: var(--sa-muted); }
        </style>
      </head>
      <body>
        <h1>Story Execution: ${this.storyRef}</h1>
        <div class="loading">Connecting to crew state server...</div>
      </body>
      </html>
    `;
  }

  private getStatusBadge(status: string): string {
    const badges: Record<string, string> = {
      pending: '⏳ Pending',
      executing: '🔄 Executing',
      complete: '✅ Complete',
      vetoed: '🛑 Vetoed',
      error: '⚠️ Error',
    };
    return badges[status] || status;
  }

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
