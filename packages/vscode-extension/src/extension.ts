import * as vscode from 'vscode';
import { registerParticipant } from './participant';
import { StorySidebarProvider } from './sidebar';

export function activate(context: vscode.ExtensionContext): void {
  // ── Sidebar webview ──────────────────────────────────────────────────────
  const sidebarProvider = new StorySidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'story-agent.sidebar',
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // ── Commands ─────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('story-agent.openDashboard', () => {
      const base =
        vscode.workspace
          .getConfiguration('storyAgent')
          .get<string>('dashboardUrl') ?? 'http://localhost:3000';
      vscode.env.openExternal(vscode.Uri.parse(`${base}/dashboard`));
    }),

    vscode.commands.registerCommand('story-agent.openObservationLounge', () => {
      const base =
        vscode.workspace
          .getConfiguration('storyAgent')
          .get<string>('dashboardUrl') ?? 'http://localhost:3000';
      vscode.env.openExternal(vscode.Uri.parse(`${base}/observation-lounge`));
    }),

    vscode.commands.registerCommand('story-agent.openSidebar', () => {
      vscode.commands.executeCommand(
        'workbench.view.extension.story-agent-sidebar'
      );
    }),

    vscode.commands.registerCommand(
      'story-agent.copyToClipboard',
      async (text: string) => {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(
          'Story Agent: Kickoff prompt copied to clipboard.'
        );
      }
    ),

    vscode.commands.registerCommand(
      'story-agent.prepareStory',
      (referenceNum?: string, repoFullName?: string) => {
        sidebarProvider.focusPrepareForm(referenceNum, repoFullName);
      }
    )
  );

  // ── Chat participant ──────────────────────────────────────────────────────
  registerParticipant(context);
}

export function deactivate(): void {
  // nothing
}
