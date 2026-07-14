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
export type WebviewThemeId = 'lcars' | 'dark' | 'light' | 'vscode';

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

// Explicit cross-surface theme parity with packages/ui/src/app/globals.css.
export const WEBVIEW_THEME_BINDINGS: Record<Exclude<WebviewThemeId, 'vscode'>, Record<SemanticTokenName, string>> = {
  lcars: {
    text: '#ffd9b3',
    muted: '#bcbce8',
    border: '#8a6a8a',
    surface: '#000000',
    card: '#16161f',
    accent: '#cc99cc',
    primary: '#99ccff',
    ok: '#99cc99',
    warn: '#ffcc66',
    danger: '#cc6666',
    onAccent: '#000000',
  },
  dark: {
    text: '#eef1f6',
    muted: '#bcc6d6',
    border: '#3b4759',
    surface: '#0b0e14',
    card: '#151a23',
    accent: '#22c55e',
    primary: '#38bdf8',
    ok: '#22c55e',
    warn: '#f59e0b',
    danger: '#ef4444',
    onAccent: '#ffffff',
  },
  light: {
    text: '#0f172a',
    muted: '#4b5563',
    border: '#cbd2dc',
    surface: '#f9fafb',
    card: '#ffffff',
    accent: '#059669',
    primary: '#0891b2',
    ok: '#16a34a',
    warn: '#d97706',
    danger: '#dc2626',
    onAccent: '#ffffff',
  },
};

export function tokenCssBlock(bindings: Record<SemanticTokenName, string>): string {
  const decls = SEMANTIC_TOKEN_NAMES.map((name) => `--sa-${name}: ${bindings[name]};`).join(' ');
  return `:root{${decls}}`;
}

export function getWebviewBindings(theme: WebviewThemeId = 'vscode'): Record<SemanticTokenName, string> {
  if (theme === 'vscode') return VSCODE_TOKEN_BINDINGS;
  return WEBVIEW_THEME_BINDINGS[theme];
}

// Worf security ruling: token injection must be a static nonce'd style block; never external stylesheets.
export function webviewTokenStyle(nonce: string, theme: WebviewThemeId = 'vscode'): string {
  return `<style nonce="${nonce}">${tokenCssBlock(getWebviewBindings(theme))}</style>`;
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
