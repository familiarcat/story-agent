import * as vscode from 'vscode';
import { fetchAhaStory } from '../aha';
import { getWorkflowStatuses } from '../lib/ahaStatusCache';

// Fallback when Aha's live workflow-status list can't be fetched (network/auth/proxy down).
const FALLBACK_STATUSES = ['Under consideration', 'In development', 'Ready to ship', 'Shipped'];

export function resolveDashboardBase(): string {
  const cfg = vscode.workspace.getConfiguration('storyAgent');
  // Only an explicitly-set dashboardBaseUrl wins — otherwise its package.json default would mask
  // a user-configured dashboardUrl (the pre-existing key).
  const insp = cfg.inspect<string>('dashboardBaseUrl');
  const explicit = insp?.workspaceFolderValue ?? insp?.workspaceValue ?? insp?.globalValue;
  return (explicit || cfg.get<string>('dashboardUrl') || 'http://localhost:3000').replace(/\/$/, '');
}

export function registerUpdateAhaStatus(
  context: vscode.ExtensionContext,
  deps: { refreshTree: () => void },
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('story-agent.updateAhaStoryStatus', async (item?: unknown) => {
      const itemArg = item as { story?: { referenceNum?: string }; projectId?: string } | undefined;
      const fromItem = itemArg?.story?.referenceNum;
      const input = fromItem ?? await vscode.window.showInputBox({
        prompt: 'Aha story reference (e.g. PROD-11)',
        placeHolder: 'PROD-11',
        validateInput: (v) => (/^[A-Z0-9]+-\d+/i.test(v.trim()) ? undefined : 'Expected a reference like PROD-11'),
      });
      if (!input) return;
      const reference = input.trim();

      let current: string | undefined;
      try {
        current = (await fetchAhaStory(reference)).workflowStatus;
      } catch { /* current status is a nicety — the pick works without it */ }

      const projectId = itemArg?.projectId ?? context.workspaceState.get<string>('aha.lastActiveProjectId');
      let statuses = projectId ? await getWorkflowStatuses(projectId) : null;
      if (!statuses) {
        if (projectId) {
          vscode.window.showWarningMessage('Could not fetch workflow statuses from Aha; using defaults.');
        }
        statuses = FALLBACK_STATUSES.map((name) => ({ name, id: name }));
      }

      const picked = await vscode.window.showQuickPick(
        statuses.map((s) => ({ label: s.name, description: s.name === current ? 'current' : undefined })),
        { placeHolder: `New status for ${reference}${current ? ` (currently: ${current})` : ''}` },
      );
      if (!picked) return;
      const statusName = picked.label;

      const base = resolveDashboardBase();
      const post = async (confirm: boolean): Promise<Record<string, unknown>> => {
        const resp = await fetch(`${base}/api/aha/resource/story`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference,
            statusName,
            actor: 'extension',
            ...(confirm ? { confirm: true } : {}),
          }),
        });
        const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 200)}`);
        return data;
      };

      try {
        // Worf gate: POST without confirm is a dry-run; the write only happens after the user
        // confirms the previewed change.
        const preview = await post(false);
        const detail =
          `${reference} → ${statusName}\n\n` +
          JSON.stringify(preview.proposed ?? preview, null, 2).slice(0, 800) +
          (typeof preview.note === 'string' ? `\n\n${preview.note}` : '');
        const choice = await vscode.window.showWarningMessage(
          'WorfGate dry-run — confirm Aha status update?',
          { modal: true, detail },
          'Confirm',
        );
        if (choice !== 'Confirm') return;

        await post(true);
        vscode.window.showInformationMessage(`Aha: ${reference} → ${statusName}`);
        deps.refreshTree();
      } catch (err) {
        vscode.window.showErrorMessage(
          `Aha status update failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }),
  );
}
