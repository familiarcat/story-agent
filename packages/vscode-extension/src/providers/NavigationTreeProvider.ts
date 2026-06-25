import * as vscode from 'vscode';

/**
 * Unified navigation tree (Observation Lounge UI-unification plan §1). One activity-bar tree that
 * surfaces every primary object in the system with consistent labels — the same IA the web
 * dashboards expose. Leaves route into the chat participant (slash commands) or open dashboard pages,
 * so all functionality is reachable from one place.
 */

interface NavLeaf {
  label: string;
  icon: string;
  /** Chat query to run (opens @story-agent with this), OR a dashboard path, OR a command id. */
  chat?: string;
  path?: string;
  command?: string;
  tooltip?: string;
}
interface NavSection {
  label: string;
  icon: string;
  children: NavLeaf[];
}

// The 11-member crew (matches CREW_MISSION_ORDER). Clicking opens chat scoped to that officer's domain.
const CREW: Array<[string, string, string]> = [
  ['Picard', 'Command', 'mission strategy & synthesis'],
  ['Riker', 'Implementation', 'execution sequencing'],
  ['Data', 'Architecture', 'design & decisions'],
  ['Geordi', 'Infrastructure', 'build, deploy, extension'],
  ['Worf', 'Security', 'WorfGate gating & policy'],
  ["O'Brien", 'DevOps', 'CI/CD & operations'],
  ['Yar', 'Quality', 'tests & standards'],
  ['Troi', 'UX', 'stakeholder & clarity'],
  ['Crusher', 'Health', 'diagnostics & monitoring'],
  ['Uhura', 'Communications', 'docs & messaging'],
  ['Quark', 'Cost', 'OpenRouter model routing'],
];

const SECTIONS: NavSection[] = [
  {
    label: 'Assistant', icon: 'sparkle', children: [
      { label: 'Ask the crew', icon: 'comment', chat: '@story-agent ', tooltip: 'Token-optimizing chat (OpenRouter)' },
      { label: 'Autonomous task (/agent)', icon: 'run-all', chat: '@story-agent /agent ', tooltip: 'Agentic loop: read/edit/run over OpenRouter' },
      { label: 'Plan a task (/plan)', icon: 'checklist', chat: '@story-agent /plan ', tooltip: 'Ordered plan, no edits' },
      { label: 'Review changes (/review)', icon: 'git-pull-request', chat: '@story-agent /review', tooltip: 'Read-only review of the working diff' },
      { label: 'Diff review (accept/reject per file)', icon: 'diff', command: 'story-agent.reviewChanges', tooltip: 'Inspect & revert the agent\'s edits per file' },
      { label: 'Inline chat (Ctrl+I on a selection)', icon: 'comment', command: 'story-agent.inlineChat', tooltip: 'Ask about the selected code — Quark-optimized' },
    ],
  },
  {
    label: 'Crew', icon: 'organization',
    children: CREW.map(([name, domain, tip]) => ({
      label: `${name} — ${domain}`, icon: 'account', tooltip: tip,
      chat: `@story-agent ask ${name} (${domain}): `,
    })),
  },
  {
    label: 'Missions / Observation Lounge', icon: 'beaker', children: [
      { label: 'Prepare a story (/prepare)', icon: 'rocket', chat: '@story-agent /prepare ', tooltip: 'Load an Aha story → execution brief' },
      { label: 'Open Observation Lounge', icon: 'eye', path: '/observation-lounge' },
      { label: 'System posture (/symphony)', icon: 'pulse', chat: '@story-agent /symphony', tooltip: 'firm→client→project + WorfGate + tools' },
    ],
  },
  {
    label: 'Stories & Sprints (Aha)', icon: 'list-tree', children: [
      { label: 'Dashboard', icon: 'browser', path: '/dashboard' },
      { label: 'Sprint board', icon: 'calendar', path: '/sprint' },
      { label: 'Story status (/status)', icon: 'info', chat: '@story-agent /status ' },
    ],
  },
  {
    label: 'Cost (Quark)', icon: 'graph', children: [
      { label: 'Cost & routing', icon: 'dashboard', path: '/dashboard' },
      { label: 'Posture snapshot (/symphony)', icon: 'pulse', chat: '@story-agent /symphony' },
    ],
  },
  {
    label: 'Security (WorfGate)', icon: 'shield', children: [
      { label: 'Posture & credentials (/symphony)', icon: 'key', chat: '@story-agent /symphony' },
    ],
  },
  {
    label: 'RAG / Memory', icon: 'database', children: [
      { label: 'Crew memories', icon: 'history', path: '/crew' },
      { label: 'Chat (RAG-grounded)', icon: 'comment-discussion', path: '/chat' },
    ],
  },
];

type Node = { kind: 'section'; section: NavSection } | { kind: 'leaf'; leaf: NavLeaf };

export class NavigationTreeProvider implements vscode.TreeDataProvider<Node> {
  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'section') {
      const item = new vscode.TreeItem(node.section.label, vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon(node.section.icon);
      return item;
    }
    const { leaf } = node;
    const item = new vscode.TreeItem(leaf.label, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(leaf.icon);
    item.tooltip = leaf.tooltip;
    if (leaf.chat) {
      item.command = { command: 'story-agent.runChatCommand', title: leaf.label, arguments: [leaf.chat] };
    } else if (leaf.path) {
      item.command = { command: 'story-agent.openDashboardPath', title: leaf.label, arguments: [leaf.path] };
    } else if (leaf.command) {
      item.command = { command: leaf.command, title: leaf.label };
    }
    return item;
  }
  getChildren(node?: Node): Node[] {
    if (!node) return SECTIONS.map(section => ({ kind: 'section', section }));
    if (node.kind === 'section') return node.section.children.map(leaf => ({ kind: 'leaf', leaf }));
    return [];
  }
}
