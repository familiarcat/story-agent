/**
 * Cross-surface UI token contract — Troi-led UI-UNIFY-TIERS lounge ruling (option a: one semantic
 * contract, dual bindings). The same semantic token names bind to the dashboard's CSS-variable
 * theme contract (globals.css --text/--surface/…) and to the VS Code webview's --vscode-* vars.
 * Consumers reference tokens as `--sa-<name>` (see saVar/tokenCssBlock).
 */
export const SEMANTIC_TOKEN_NAMES = [
  'text',
  'muted',
  'border',
  'surface',
  'card',
  'accent',
  'primary',
  'ok',
  'warn',
  'danger',
  'onAccent',
] as const;
export type SemanticTokenName = (typeof SEMANTIC_TOKEN_NAMES)[number];

export const DASHBOARD_TOKEN_BINDINGS: Record<SemanticTokenName, string> = {
  text: 'var(--text)',
  muted: 'var(--text-dim)',
  border: 'var(--border)',
  surface: 'var(--bg)',
  card: 'var(--surface)',
  accent: 'var(--accent3)',
  primary: 'var(--accent4)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  onAccent: 'var(--on-accent)',
};

export const VSCODE_TOKEN_BINDINGS: Record<SemanticTokenName, string> = {
  text: 'var(--vscode-foreground)',
  muted: 'var(--vscode-descriptionForeground)',
  border: 'var(--vscode-panel-border)',
  surface: 'var(--vscode-editor-background)',
  card: 'var(--vscode-sideBar-background)',
  accent: 'var(--vscode-textLink-foreground)',
  primary: 'var(--vscode-button-background)',
  ok: 'var(--vscode-testing-iconPassed)',
  warn: 'var(--vscode-editorWarning-foreground)',
  danger: 'var(--vscode-errorForeground)',
  onAccent: 'var(--vscode-button-foreground)',
};

export function tokenCssBlock(bindings: Record<SemanticTokenName, string>): string {
  const decls = SEMANTIC_TOKEN_NAMES.map((name) => `--sa-${name}: ${bindings[name]};`).join(' ');
  return `:root{${decls}}`;
}

// Worf security ruling: token injection must be a static nonce'd style block; never external stylesheets.
export function webviewTokenStyle(nonce: string): string {
  return `<style nonce="${nonce}">${tokenCssBlock(VSCODE_TOKEN_BINDINGS)}</style>`;
}

export function saVar(name: SemanticTokenName): string {
  return `var(--sa-${name})`;
}

export function space(n: number): string {
  return `${n * 4}px`;
}

export const TIER_ICONS = {
  firm: 'organization',
  client: 'briefcase',
  project: 'project',
  epic: 'layers',
  story: 'book',
  task: 'checklist',
  sprint: 'milestone',
  release: 'milestone',
} as const;
export type TierName = keyof typeof TIER_ICONS;

export function formatRefLabel(ref: string | null | undefined, name: string): string {
  return ref ? `${ref} · ${name}` : name;
}
