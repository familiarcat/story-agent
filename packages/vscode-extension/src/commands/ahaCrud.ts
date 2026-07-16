import * as vscode from 'vscode';
import { resolveDashboardBase } from './updateAhaStatus';

async function postResource(resource: 'sprint' | 'story' | 'task', payload: Record<string, unknown>, confirm: boolean): Promise<Record<string, unknown>> {
  const resp = await fetch(`${resolveDashboardBase()}/api/aha/resource/${resource}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, actor: 'extension', ...(confirm ? { confirm: true } : {}) }),
  });
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function runWithDryRun(resource: 'sprint' | 'story' | 'task', payload: Record<string, unknown>, title: string): Promise<Record<string, unknown> | null> {
  const preview = await postResource(resource, payload, false);
  const choice = await vscode.window.showWarningMessage(
    `${title} (WorfGate dry-run)`,
    {
      modal: true,
      detail:
        JSON.stringify(preview.proposed ?? preview, null, 2).slice(0, 1200) +
        (typeof preview.note === 'string' ? `\n\n${preview.note}` : ''),
    },
    'Confirm',
  );
  if (choice !== 'Confirm') return null;
  return postResource(resource, payload, true);
}

export function registerAhaCrudCommands(
  context: vscode.ExtensionContext,
  deps: { refreshTree: () => void },
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('story-agent.createAhaSprint', async (item?: unknown) => {
      try {
        const itemArg = item as { projectId?: string; project?: { id?: string; name?: string } } | undefined;
        const projectId =
          itemArg?.project?.id ??
          itemArg?.projectId ??
          context.workspaceState.get<string>('aha.lastActiveProjectId') ??
          await vscode.window.showInputBox({ prompt: 'Aha project/product id (e.g. 7653544790593325082)' });
        if (!projectId) return;

        const name = await vscode.window.showInputBox({ prompt: 'Sprint name', placeHolder: 'Sprint Alpha - Full API Control' });
        if (!name) return;
        const startDate = await vscode.window.showInputBox({ prompt: 'Start date (optional, YYYY-MM-DD)' });
        const endDate = await vscode.window.showInputBox({ prompt: 'End date (optional, YYYY-MM-DD)' });

        const result = await runWithDryRun('sprint', { mode: 'create', projectId, name, startDate: startDate || undefined, endDate: endDate || undefined }, `Create sprint in ${projectId}`);
        if (!result) return;
        vscode.window.showInformationMessage(`Aha sprint created: ${String(result.id ?? result.result ?? 'ok')}`);
        deps.refreshTree();
      } catch (err) {
        vscode.window.showErrorMessage(`Create sprint failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),

    vscode.commands.registerCommand('story-agent.createAhaStory', async (item?: unknown) => {
      try {
        const itemArg = item as { release?: { id?: string; name?: string }; projectId?: string } | undefined;
        const releaseId =
          itemArg?.release?.id ??
          await vscode.window.showInputBox({ prompt: 'Release id for new story' });
        if (!releaseId) return;

        const name = await vscode.window.showInputBox({ prompt: 'Story name' });
        if (!name) return;
        const description = await vscode.window.showInputBox({ prompt: 'Story description (optional)' });

        const result = await runWithDryRun('story', { mode: 'create', releaseId, name, description: description || undefined }, `Create story in release ${releaseId}`);
        if (!result) return;
        vscode.window.showInformationMessage(`Aha story created: ${String(result.id ?? result.result ?? 'ok')}`);
        deps.refreshTree();
      } catch (err) {
        vscode.window.showErrorMessage(`Create story failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),

    vscode.commands.registerCommand('story-agent.createAhaTask', async (item?: unknown) => {
      try {
        const itemArg = item as { story?: { referenceNum?: string; name?: string } } | undefined;
        const featureRef =
          itemArg?.story?.referenceNum ??
          await vscode.window.showInputBox({ prompt: 'Parent story reference (e.g. PROD-22)' });
        if (!featureRef) return;

        const name = await vscode.window.showInputBox({ prompt: 'Task name' });
        if (!name) return;
        const description = await vscode.window.showInputBox({ prompt: 'Task description (optional)' });

        const result = await runWithDryRun('task', { mode: 'create', featureRef, name, description: description || undefined }, `Create task under ${featureRef}`);
        if (!result) return;
        vscode.window.showInformationMessage(`Aha task created: ${String(result.id ?? result.result ?? 'ok')}`);
        deps.refreshTree();
      } catch (err) {
        vscode.window.showErrorMessage(`Create task failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );
}
