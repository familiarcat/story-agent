/**
 * ProjectStatusPanel — pure token bindings (no JSX), so the LCARS token contract is unit-testable
 * in the UI's node test env. Figma→token pilot (crew Observation Lounge, RAG mem 128).
 */
import { color } from '@/lib/tokens';

export type ProjectStatus = 'pending' | 'implementing' | 'pr_open' | 'merged' | 'blocked';

/** Pure status → LCARS token binding. Every value is a `var(--*)` token — never a literal color. */
export function statusToken(status: ProjectStatus): string {
  switch (status) {
    case 'pending': return color.muted;      // var(--text-dim)
    case 'implementing': return color.cost;  // var(--warn)
    case 'pr_open': return color.primary;    // var(--accent4)
    case 'merged': return color.agent;       // var(--ok)
    case 'blocked': return color.errText;    // var(--danger)
  }
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  pending: 'PENDING',
  implementing: 'IMPLEMENTING',
  pr_open: 'PR OPEN',
  merged: 'MERGED',
  blocked: 'BLOCKED',
};
