import * as vscode from 'vscode';
import { TransparencyShowcasePanel } from '../panels/TransparencyShowcasePanel';

/**
 * Register command to show the UI/UX Transparency Showcase panel
 * Demonstrates all 17 unified components deployed to production
 */
export function registerShowTransparencyShowcaseCommand(
  context: vscode.ExtensionContext,
  dashboardUrl: string
): void {
  const showcase = new TransparencyShowcasePanel(dashboardUrl);

  context.subscriptions.push(
    vscode.commands.registerCommand('storyAgent.showTransparencyShowcase', () => {
      showcase.show(context);
    })
  );

  // Also register as a sidebar command
  context.subscriptions.push(
    vscode.commands.registerCommand('storyAgent.openDashboardInBrowser', async () => {
      const url = dashboardUrl || 'http://localhost:3000';
      await vscode.env.openExternal(vscode.Uri.parse(`${url}/dashboard`));
    })
  );
}
