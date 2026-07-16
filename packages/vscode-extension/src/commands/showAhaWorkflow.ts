import * as vscode from 'vscode';
import { resolveDashboardBase } from './updateAhaStatus';
import { withDashboardTheme } from '../lib/dashboardThemeLink';

type WorkflowComment = {
  body: string;
  createdAt: string | null;
  author: string;
};

type WorkflowRequirement = {
  referenceNum: string;
  name: string;
  workflowStatus: string;
  assigneeName: string | null;
  url: string;
  comments: WorkflowComment[];
};

type WorkflowStory = {
  referenceNum: string;
  name: string;
  workflowStatus: string;
  assigneeName: string | null;
  storyPoints: number | null;
  url: string;
  comments: WorkflowComment[];
  requirements: WorkflowRequirement[];
};

type WorkflowResponse = {
  releaseId: string;
  stories: WorkflowStory[];
  generatedAt: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function snippet(body: string, max = 180): string {
  return body.length > max ? `${body.slice(0, max)}...` : body;
}

function renderStory(story: WorkflowStory): string {
  const comments = story.comments.length === 0
    ? '<div class="muted">No recent story comments.</div>'
    : story.comments
        .map((c) => `<div class="comment"><span class="muted">${escapeHtml(c.author)}:</span> ${escapeHtml(snippet(c.body))}</div>`)
        .join('');

  const requirements = story.requirements.length === 0
    ? '<div class="muted">No requirements.</div>'
    : story.requirements
        .map((r) => {
          const reqComments = r.comments.length > 0
            ? `<div class="muted tiny">latest: ${escapeHtml(snippet(r.comments[0].body, 110))}</div>`
            : '';
          return `
            <div class="req">
              <div><strong>${escapeHtml(r.referenceNum)}</strong> · ${escapeHtml(r.name)}</div>
              <div class="tiny">${escapeHtml(r.assigneeName ?? 'Unassigned')} · <span class="status">${escapeHtml(r.workflowStatus)}</span> · comments ${r.comments.length}</div>
              ${reqComments}
            </div>`;
        })
        .join('');

  return `
    <section class="story">
      <div class="header">
        <div>
          <div class="title">${escapeHtml(story.referenceNum)} · ${escapeHtml(story.name)}</div>
          <div class="tiny">Owner: ${escapeHtml(story.assigneeName ?? 'Unassigned')} · <span class="status">${escapeHtml(story.workflowStatus)}</span>${story.storyPoints != null ? ` · ${story.storyPoints} pts` : ''}</div>
        </div>
        <a href="${escapeHtml(story.url)}">Aha</a>
      </div>
      <div class="subhead">Story comments (${story.comments.length})</div>
      ${comments}
      <div class="subhead">Tasks (${story.requirements.length})</div>
      ${requirements}
    </section>`;
}

function renderHtml(data: WorkflowResponse, dashboardBase: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); }
    .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .title { font-weight: 700; }
    .muted { color: var(--vscode-descriptionForeground); }
    .tiny { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .story { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 8px; margin-bottom: 10px; }
    .header { display: flex; justify-content: space-between; gap: 8px; }
    .subhead { margin-top: 8px; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vscode-descriptionForeground); }
    .comment { font-size: 12px; border-left: 2px solid var(--vscode-panel-border); padding-left: 8px; margin: 4px 0; }
    .req { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 6px; margin-bottom: 5px; }
    .status { font-weight: 700; }
    a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="title">Aha Workflow Integration</div>
      <div class="tiny">Release ${escapeHtml(data.releaseId)} · Updated ${escapeHtml(new Date(data.generatedAt).toLocaleString())}</div>
    </div>
    <a href="${escapeHtml(withDashboardTheme(`${dashboardBase}/sprint`))}">Open Sprint Board</a>
  </div>
  ${data.stories.map(renderStory).join('')}
</body>
</html>`;
}

function releaseIdFromItem(item: unknown): string | null {
  const row = item as { release?: { id?: string }; releaseId?: string; story?: { referenceNum?: string } } | undefined;
  return row?.release?.id ?? row?.releaseId ?? null;
}

export function registerShowAhaWorkflowCommand(
  context: vscode.ExtensionContext,
  deps: { refreshTree: () => void },
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('story-agent.showAhaWorkflow', async (item?: unknown) => {
      try {
        deps.refreshTree();
        const fromNode = releaseIdFromItem(item);
        const releaseId = fromNode ?? await vscode.window.showInputBox({
          prompt: 'Sprint/release id for workflow view',
          placeHolder: '7662916454855771284',
        });
        if (!releaseId) return;

        const base = resolveDashboardBase();
        const resp = await fetch(`${base}/api/aha/workflow?releaseId=${encodeURIComponent(releaseId)}`);
        const payload = (await resp.json().catch(() => ({}))) as Partial<WorkflowResponse> & { error?: string; details?: string };
        if (!resp.ok) {
          throw new Error(payload.details || payload.error || `HTTP ${resp.status}`);
        }

        const data: WorkflowResponse = {
          releaseId,
          stories: Array.isArray(payload.stories) ? payload.stories : [],
          generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString(),
        };

        const panel = vscode.window.createWebviewPanel(
          'storyAgentAhaWorkflow',
          `Aha Workflow · ${releaseId}`,
          vscode.ViewColumn.Active,
          { enableScripts: false },
        );
        panel.webview.html = renderHtml(data, base);
      } catch (err) {
        vscode.window.showErrorMessage(`Aha workflow view failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );
}
