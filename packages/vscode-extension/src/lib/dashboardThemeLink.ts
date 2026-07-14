import * as vscode from 'vscode';

export type DashboardThemeId = 'lcars' | 'dark' | 'light';

export function getConfiguredDashboardTheme(): DashboardThemeId | undefined {
  const value = (vscode.workspace.getConfiguration('storyAgent').get<string>('uiTheme') ?? '').trim();
  if (value === 'lcars' || value === 'dark' || value === 'light') return value;
  return undefined;
}

export function withDashboardTheme(url: string): string {
  const theme = getConfiguredDashboardTheme();
  if (!theme) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('theme', theme);
    return parsed.toString();
  } catch {
    return url;
  }
}
