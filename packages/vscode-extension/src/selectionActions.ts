import * as vscode from 'vscode';

/**
 * Selection → action bridge for the Aha tree (the selection-first UX: select a node, pick an action,
 * instead of typing a prompt). Mirrors the canonical contract
 * packages/shared/src/selection-contract.ts — INLINED because the extension bundles via esbuild and
 * deliberately avoids bundling @story-agent/shared (see aha.ts). Keep the action set in sync.
 *
 * PERSONA: the VS Code extension is the DEVELOPER surface, so it renders actionsForPersona(level,
 * 'developer') — the full code lifecycle (plan / execute / branch / link-PR / complete). Management
 * (web dashboard) gets the same contract minus the dev-only ops (agent / branch / link-pr). This
 * mirrors selection-contract.ts's actionsForPersona so the two surfaces never drift.
 *
 * Reads (plan / prepare / open) route directly or open the chat with a prefilled query. WRITES
 * (start-story / branch / link-pr / complete) route to /agent as WorfGate-gated DRY-RUNS the crew
 * shows before confirming — so a selection can never silently mutate Aha/git.
 */
type Level = 'project' | 'epic' | 'story' | 'task';
type Persona = 'management' | 'developer';
interface Action { intent: string; label: string; write: boolean; }

/** This surface's persona. The extension is the developer-facing tool. */
const PERSONA: Persona = 'developer';

/** Dev-only intents — mirrors DEVELOPER_ONLY in selection-contract.ts. */
const DEVELOPER_ONLY = new Set(['agent', 'branch', 'link-pr']);

const ACTIONS_BY_LEVEL: Record<Level, Action[]> = {
  project: [
    { intent: 'plan', label: '$(checklist) Plan (read-only)', write: false },
    { intent: 'open', label: '$(link-external) Open in Aha', write: false },
  ],
  epic: [
    { intent: 'plan', label: '$(checklist) Plan (read-only)', write: false },
    { intent: 'open', label: '$(link-external) Open in Aha', write: false },
  ],
  story: [
    { intent: 'plan', label: '$(checklist) Plan (read-only)', write: false },
    { intent: 'agent', label: '$(play) Execute with Agent', write: false },
    { intent: 'prepare', label: '$(notebook) Prepare Observation Lounge brief', write: false },
    { intent: 'start-story', label: '$(git-branch) Start story + branch (gated dry-run)', write: true },
    { intent: 'branch', label: '$(git-branch) Create branch (gated dry-run)', write: true },
    { intent: 'link-pr', label: '$(git-pull-request) Link PR (gated dry-run)', write: true },
    { intent: 'complete', label: '$(check) Complete story (gated dry-run)', write: true },
    { intent: 'open', label: '$(link-external) Open in Aha', write: false },
  ],
  task: [
    { intent: 'plan', label: '$(checklist) Plan (read-only)', write: false },
    { intent: 'agent', label: '$(play) Execute with Agent', write: false },
    { intent: 'open', label: '$(link-external) Open in Aha', write: false },
  ],
};

/**
 * Persona-filtered actions for a level — mirrors selection-contract.ts actionsForPersona().
 * developer = full lifecycle; management = all reads + approval writes, minus dev-only ops.
 */
function actionsForPersona(level: Level, persona: Persona): Action[] {
  const all = ACTIONS_BY_LEVEL[level];
  if (persona === 'developer') return all;
  return all.filter(a => !DEVELOPER_ONLY.has(a.intent));
}

/** Build the chat-participant query for an action. Writes carry explicit gated-dry-run language. */
function buildQuery(intent: string, ref: string, name: string): string {
  switch (intent) {
    case 'plan': return `@story-agent /plan ${ref}${name ? ` — ${name}` : ''}`;
    case 'agent': return `@story-agent /agent Work on ${ref}${name ? ` (${name})` : ''}.`;
    case 'prepare': return `@story-agent /prepare ${ref}`;
    case 'start-story': return `@story-agent /agent Start story ${ref} and create its matching git branch. WorfGate-gated DRY-RUN first — show the plan and wait for my confirmation before any write.`;
    case 'branch': return `@story-agent /agent Create the git branch for story ${ref}. Gated DRY-RUN first; confirm before writing.`;
    case 'link-pr': return `@story-agent /agent Link the current PR to story ${ref}. Gated DRY-RUN first; confirm before writing.`;
    case 'complete': return `@story-agent /agent Complete story ${ref}${name ? ` (${name})` : ''}. Gated DRY-RUN first; confirm before writing.`;
    default: return `@story-agent /ask ${ref} ${name}`.trim();
  }
}

/** Map an Aha tree item (ProjectTreeItem / StoryTreeItem) to its selection level + ref/name/url. */
function describe(item: any): { level: Level; ref: string; name: string; url?: string } | null {
  const cv = item?.contextValue as string | undefined;
  if (cv === 'ahaProject') {
    const p = item.project ?? {};
    return { level: 'project', ref: p.referencePrefix ?? p.name ?? '', name: p.name ?? '', url: p.url };
  }
  if (cv === 'ahaStory') {
    const s = item.story ?? {};
    return { level: 'story', ref: s.referenceNum ?? '', name: s.name ?? '', url: s.url };
  }
  return null;
}

/** Show the contract's actions for the selected node; route the chosen one (read = direct, write = gated). */
export async function runNodeActions(item: unknown): Promise<void> {
  const d = describe(item);
  if (!d) { vscode.window.showWarningMessage('Story Agent: no selectable actions for this item.'); return; }

  const picks = actionsForPersona(d.level, PERSONA).map(a => ({ label: a.label, intent: a.intent, write: a.write }));
  const chosen = await vscode.window.showQuickPick(picks, {
    title: `${d.ref || d.name} — actions`,
    placeHolder: 'Select an action — writes run as WorfGate-gated dry-runs you confirm',
  });
  if (!chosen) return;

  if (chosen.intent === 'open') {
    if (d.url) vscode.env.openExternal(vscode.Uri.parse(d.url));
    else vscode.window.showWarningMessage('Story Agent: no Aha URL on this item.');
    return;
  }
  await vscode.commands.executeCommand('workbench.action.chat.open', { query: buildQuery(chosen.intent, d.ref, d.name) });
}
