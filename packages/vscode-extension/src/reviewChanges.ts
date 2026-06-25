import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexec = promisify(execFile);

/**
 * Multi-file diff review UI (unification v1, Riker's "pivotal" feature). After the agent makes edits,
 * the user reviews each changed file as a diff and Keeps or Reverts it per file (per-file accept/reject
 * — the crew DoD). Git-backed: diff = HEAD vs working tree; reject = `git checkout -- <file>`.
 *
 * (Pre-apply gating — Worf's "no apply without APPROVED" — is the next iteration; this is review +
 * selective revert of changes the agent already applied, with one-click undo.)
 */

const SCHEME = 'storyagent-head';

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await pexec('git', args, { cwd: root, maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

interface Changed { rel: string; status: string; }

async function changedFiles(root: string): Promise<Changed[]> {
  const out = await git(root, ['status', '--porcelain']);
  return out.split(/\r?\n/).filter(Boolean).map(line => ({
    status: line.slice(0, 2).trim(),
    rel: line.slice(3).trim().replace(/^"|"$/g, ''),
  }));
}

/** TextDocumentContentProvider serving the HEAD version of a file for the diff's left side. */
export class HeadContentProvider implements vscode.TextDocumentContentProvider {
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const root = workspaceRoot();
    if (!root) return '';
    const rel = uri.query; // we stash the repo-relative path in the query
    try { return await git(root, ['show', `HEAD:${rel}`]); } catch { return ''; }
  }
}

export function registerReviewChanges(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, new HeadContentProvider())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('story-agent.reviewChanges', async () => {
      const root = workspaceRoot();
      if (!root) { vscode.window.showWarningMessage('Story Agent: no workspace folder to review.'); return; }

      let files: Changed[];
      try { files = await changedFiles(root); }
      catch { vscode.window.showWarningMessage('Story Agent: not a git repository (cannot review changes).'); return; }

      if (!files.length) { vscode.window.showInformationMessage('Story Agent: no working-tree changes to review.'); return; }

      const revertBtn: vscode.QuickInputButton = { iconPath: new vscode.ThemeIcon('discard'), tooltip: 'Revert (reject) this file' };
      const qp = vscode.window.createQuickPick<vscode.QuickPickItem & { rel: string }>();
      qp.title = `Review agent changes — ${files.length} file(s)`;
      qp.placeholder = 'Select a file to open its diff · use the ↩ button to revert (reject)';
      const render = (list: Changed[]) => list.map(f => ({
        label: `$(diff) ${f.rel}`, description: f.status, rel: f.rel, buttons: [revertBtn],
      }));
      qp.items = render(files);

      qp.onDidTriggerItemButton(async (e) => {
        const rel = (e.item as any).rel as string;
        const ok = await vscode.window.showWarningMessage(`Revert ${rel}? This discards the agent's changes to this file.`, { modal: true }, 'Revert');
        if (ok !== 'Revert') return;
        try {
          await git(root, ['checkout', '--', rel]);
          vscode.window.showInformationMessage(`Reverted ${rel}.`);
          const left = await changedFiles(root);
          qp.items = render(left);
          if (!left.length) qp.hide();
        } catch (err) {
          vscode.window.showErrorMessage(`Revert failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      qp.onDidAccept(async () => {
        const pick = qp.selectedItems[0];
        if (!pick) return;
        const rel = pick.rel;
        const fileUri = vscode.Uri.file(`${root}/${rel}`);
        const headUri = vscode.Uri.from({ scheme: SCHEME, path: `/${rel}`, query: rel });
        await vscode.commands.executeCommand('vscode.diff', headUri, fileUri, `${rel} (HEAD ↔ Working)`);
      });

      qp.show();
    })
  );
}
