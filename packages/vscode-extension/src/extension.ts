import * as vscode from 'vscode';
import { registerParticipant } from './participant';
import { StorySidebarProvider } from './sidebar';
import { StoryExecutionPanel } from './panels/StoryExecutionPanel';
import { CrewCopilotProvider } from './providers/CrewCopilotProvider';
import { AhaProjectStructureProvider } from './providers/AhaProjectStructureProvider';
import { NavigationTreeProvider } from './providers/NavigationTreeProvider';
import { registerReviewChanges } from './reviewChanges';
import { registerInlineChat } from './inlineChat';
import { connectProviderInteractive } from './oauth';
import { runNodeActions } from './selectionActions';
import { registerNativeChatProvider } from './nativeChatProvider';
import { AhaSyncPoller } from './ahaSyncPoller';
import { registerUpdateAhaStatus, resolveDashboardBase } from './commands/updateAhaStatus';
import { CrewStreamRelay } from './crewStreamRelay';

function dashboardBase(): string {
  return vscode.workspace.getConfiguration('storyAgent').get<string>('dashboardUrl') ?? 'http://localhost:3000';
}

export function activate(context: vscode.ExtensionContext): void {
  // ── Tree Data Providers ──────────────────────────────────────────────────
  // Unified navigation tree (UI-unification plan §1): all primary objects in one place.
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('storyAgent.navigation', new NavigationTreeProvider())
  );

  const crewCopilotProvider = new CrewCopilotProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('storyAgent.crewCopilot', crewCopilotProvider)
  );

  const projectStructureProvider = new AhaProjectStructureProvider(context);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('storyAgent.projectStructure', projectStructureProvider)
  );

  // ── Cross-surface Aha sync: poll /aha/events, debounce bursts into one tree refresh ──
  const ahaSyncPoller = new AhaSyncPoller();
  let ahaRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  ahaSyncPoller.onEvent((event) => {
    if (!['story', 'release', 'epic', 'project'].includes(event.resourceType)) return;
    if (ahaRefreshTimer) clearTimeout(ahaRefreshTimer);
    ahaRefreshTimer = setTimeout(() => projectStructureProvider.refresh(), 4500);
  });
  ahaSyncPoller.start();
  context.subscriptions.push(ahaSyncPoller, {
    dispose: () => { if (ahaRefreshTimer) clearTimeout(ahaRefreshTimer); },
  });

  // ── Live crew stream relay: emit autonomous progress to VS Code Output ──
  const streamRelayEnabled = vscode.workspace.getConfiguration('storyAgent').get<boolean>('chat.autoCrewStreamRelay') ?? true;
  if (streamRelayEnabled) {
    const crewStreamRelay = new CrewStreamRelay();
    crewStreamRelay.start();
    context.subscriptions.push(crewStreamRelay);
  }

  // ── Multi-file diff review UI (per-file accept/reject) ───────────────────
  registerReviewChanges(context);

  // ── Inline chat (Ctrl+I) over the canonical Quark /chat ──────────────────
  registerInlineChat(context);

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

    vscode.commands.registerCommand('story-agent.openInnovationLounge', () => {
      const base =
        vscode.workspace
          .getConfiguration('storyAgent')
          .get<string>('dashboardUrl') ?? 'http://localhost:3000';
      vscode.env.openExternal(vscode.Uri.parse(`${base}/innovation-lounge`));
    }),

    vscode.commands.registerCommand('story-agent.openSidebar', () => {
      vscode.commands.executeCommand(
        'workbench.view.extension.story-agent-sidebar'
      );
    }),

    // Navigation-tree leaves → open the chat participant with a prefilled query.
    vscode.commands.registerCommand('story-agent.runChatCommand', (query: string) => {
      vscode.commands.executeCommand('workbench.action.chat.open', { query });
    }),

    // Navigation-tree leaves → open a specific dashboard page.
    vscode.commands.registerCommand('story-agent.openDashboardPath', (path: string) => {
      vscode.env.openExternal(vscode.Uri.parse(`${dashboardBase()}${path}`));
    }),

    // New crew-related commands
    vscode.commands.registerCommand(
      'storyAgent.executeStory',
      async (storyRef: string) => {
        if (!storyRef) {
          const input = await vscode.window.showInputBox({
            prompt: 'Enter story reference (e.g., STORY-123)',
            placeHolder: 'STORY-123',
          });
          if (!input) return;
          storyRef = input;
        }

        try {
          new StoryExecutionPanel(context, storyRef);
          vscode.window.showInformationMessage(`Opened execution panel for ${storyRef}`);
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to open execution panel: ${err}`);
        }
      }
    ),

    vscode.commands.registerCommand('storyAgent.viewCrewMember', async (crewId: string) => {
      const crewNames: Record<string, string> = {
        captain: 'Captain Picard',
        architect: 'Lt. Commander Data',
        developer: 'Cmdr. Riker',
        infrastructure: 'Lt. Geordi La Forge',
        devops: "Chief O'Brien",
        security: 'Lt. Worf',
        qa: 'Lt. Yar',
        analyst: 'Counselor Troi',
        health: 'Dr. Crusher',
        communications: 'Lt. Uhura',
        finance: 'Quark',
      };

      vscode.window.showInformationMessage(`Viewing: ${crewNames[crewId] || crewId}`);
      // TODO: Show crew member details panel
    }),

    vscode.commands.registerCommand('storyAgent.refreshCrew', async () => {
      crewCopilotProvider.refresh();
      vscode.window.showInformationMessage('Crew status refreshed');
    }),

    vscode.commands.registerCommand('story-agent.refreshProjectStructure', async () => {
      projectStructureProvider.refresh();
      vscode.window.showInformationMessage('Project structure refreshed');
    }),

    vscode.commands.registerCommand('story-agent.openAhaProject', (url: string) => {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand('story-agent.openAhaSprint', (url: string) => {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand('story-agent.openAhaStory', (url: string) => {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    // Dashboard deep links from Aha tree items. Story detail lives at /story/[storyId] (the
    // reference num); the sprint page reads no query params, so it gets the bare page.
    vscode.commands.registerCommand('story-agent.openAhaInDashboard', (item?: any) => {
      const base = resolveDashboardBase();
      const ref = item?.story?.referenceNum;
      if (ref) {
        vscode.env.openExternal(vscode.Uri.parse(`${base}/story/${encodeURIComponent(ref)}`));
        return;
      }
      if (item?.release) {
        vscode.env.openExternal(vscode.Uri.parse(`${base}/sprint`));
        return;
      }
      vscode.env.openExternal(vscode.Uri.parse(`${base}/dashboard`));
    }),

    // Aha tree → refresh, and "Prepare with crew" (story → /prepare mission flow, crew Aha-nav plan).
    vscode.commands.registerCommand('story-agent.refreshAhaTree', () => projectStructureProvider.refresh()),
    vscode.commands.registerCommand('story-agent.prepareAhaStory', (item: any) => {
      const ref = item?.story?.referenceNum;
      if (!ref) { vscode.window.showWarningMessage('No Aha reference on this item.'); return; }
      vscode.commands.executeCommand('workbench.action.chat.open', { query: `@story-agent /prepare ${ref}` });
    }),

    // Selection-first UX: select a project/story node → pick a contract action (read = direct,
    // write = WorfGate-gated dry-run). Folds the NL prompt into a selection. (selection-contract.ts)
    vscode.commands.registerCommand('story-agent.nodeActions', (item: unknown) => runNodeActions(item)),

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
    ),

    // OAuth: connect a provider (Aha! MCP, Google, AWS Cognito, …) via browser sign-in
    vscode.commands.registerCommand('story-agent.connectOAuth', () => connectProviderInteractive(context))
  );

  // Worf-gated Aha story status quick-update (dry-run → confirm → write)
  registerUpdateAhaStatus(context, { refreshTree: () => projectStructureProvider.refresh() });

  // ── Chat participant ──────────────────────────────────────────────────────
  registerParticipant(context);

  // ── Optional VS Code-native chat provider lane ────────────────────────────
  if (vscode.workspace.getConfiguration('storyAgent').get<boolean>('hijack.enabled') ?? true) {
    registerNativeChatProvider(context);
  }
}

export function deactivate(): void {
  // nothing
}
