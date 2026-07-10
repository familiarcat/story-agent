/**
 * Shared design tokens — bridged to the semantic CSS-variable theme contract (globals.css, crew
 * theme-system mission RAG MEM 50), with semantic names sourced from the cross-surface
 * @story-agent/shared/ui-tokens contract (UI-UNIFY-TIERS lounge ruling). Values resolve to var(--*)
 * so anything consuming these tokens is THEME-DRIVEN (lcars / dark / light) with no edits.
 * `onAccent` is text on an accent fill.
 */
import { DASHBOARD_TOKEN_BINDINGS } from '@story-agent/shared/ui-tokens';

export const color = {
  text: DASHBOARD_TOKEN_BINDINGS.text,
  muted: DASHBOARD_TOKEN_BINDINGS.muted,
  faint: 'var(--text-dim)',
  border: DASHBOARD_TOKEN_BINDINGS.border,
  surface: DASHBOARD_TOKEN_BINDINGS.surface,
  card: DASHBOARD_TOKEN_BINDINGS.card,
  primary: DASHBOARD_TOKEN_BINDINGS.primary, // user / actions
  agent: 'var(--ok)', // assistant / success
  accent: DASHBOARD_TOKEN_BINDINGS.accent, // tool calls
  cost: 'var(--warn)',
  escalation: 'var(--accent3)',
  onAccent: DASHBOARD_TOKEN_BINDINGS.onAccent,
  // error banner
  errBg: 'var(--surface-2)',
  errBorder: 'var(--border)',
  errText: DASHBOARD_TOKEN_BINDINGS.danger,
} as const;

/** WorfGate governance tiers → palette. green=allow · yellow=remediated · red=blocked. */
export const tier = {
  green: DASHBOARD_TOKEN_BINDINGS.ok,
  yellow: DASHBOARD_TOKEN_BINDINGS.warn,
  red: DASHBOARD_TOKEN_BINDINGS.danger,
} as const;

export const font = {
  sans: 'var(--font)',
  mono: 'ui-monospace, monospace',
} as const;

/** 4px base spacing scale → rem. space(2) === '0.5rem'. */
export const space = (n: number): string => `${n * 0.25}rem`;
