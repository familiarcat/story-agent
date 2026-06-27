/**
 * Shared design tokens — bridged to the semantic CSS-variable theme contract (globals.css, crew
 * theme-system mission RAG MEM 50). Values resolve to var(--*) so anything consuming these tokens is
 * THEME-DRIVEN (lcars / dark / light) with no edits. `onAccent` is text on an accent fill.
 */
export const color = {
  text: 'var(--text)',
  muted: 'var(--text-dim)',
  faint: 'var(--text-dim)',
  border: 'var(--border)',
  surface: 'var(--bg)',
  card: 'var(--surface)',
  primary: 'var(--accent4)', // user / actions
  agent: 'var(--ok)', // assistant / success
  accent: 'var(--accent3)', // tool calls
  cost: 'var(--warn)',
  escalation: 'var(--accent3)',
  onAccent: 'var(--on-accent)',
  // error banner
  errBg: 'var(--surface-2)',
  errBorder: 'var(--border)',
  errText: 'var(--danger)',
} as const;

/** WorfGate governance tiers → palette. green=allow · yellow=remediated · red=blocked. */
export const tier = {
  green: 'var(--ok)',
  yellow: 'var(--warn)',
  red: 'var(--danger)',
} as const;

export const font = {
  sans: 'var(--font)',
  mono: 'ui-monospace, monospace',
} as const;

/** 4px base spacing scale → rem. space(2) === '0.5rem'. */
export const space = (n: number): string => `${n * 0.25}rem`;
