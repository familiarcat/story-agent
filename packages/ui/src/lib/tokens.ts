/**
 * Shared design tokens — the single source for color / type / spacing across the Story Agent UI.
 *
 * The surfaces grew with ad-hoc inline hex values (crew front-end plan flagged the duplication); these
 * tokens give one place to evolve the look as the UI expands. Roll out incrementally — start with the
 * repeated structural colors, the WorfGate tier palette, and the fonts.
 */
export const color = {
  text: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  border: '#e5e7eb',
  surface: '#fafafa',
  card: '#ffffff',
  primary: '#2563eb', // user / actions
  agent: '#059669', // assistant / success
  accent: '#6366f1', // tool calls
  cost: '#d97706',
  escalation: '#7c3aed',
  // error banner
  errBg: '#fef2f2',
  errBorder: '#fecaca',
  errText: '#991b1b',
} as const;

/** WorfGate governance tiers → palette. green=allow · yellow=remediated · red=blocked. */
export const tier = {
  green: '#059669',
  yellow: '#d97706',
  red: '#dc2626',
} as const;

export const font = {
  sans: 'system-ui, sans-serif',
  mono: 'ui-monospace, monospace',
} as const;

/** 4px base spacing scale → rem. space(2) === '0.5rem'. */
export const space = (n: number): string => `${n * 0.25}rem`;
