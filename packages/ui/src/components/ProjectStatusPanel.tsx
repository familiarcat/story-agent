/**
 * ProjectStatusPanel — Figma→token pilot (crew Observation Lounge, RAG mem 128).
 *
 * PM dashboard status widget proving the token→variable→component loop end-to-end: every color,
 * space, radius, and font resolves through the LCARS token contract (@/lib/tokens → var(--*)), which
 * is Figma-synced via Tokens Studio (design/tokens/lcars.tokens.json → globals.css). NO hardcoded hex.
 *
 * `statusToken()` is exported + pure so the token binding is unit-testable in the node test env.
 */
'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';
import { statusToken, STATUS_LABEL, type ProjectStatus } from './ProjectStatusPanel.tokens';

export type { ProjectStatus } from './ProjectStatusPanel.tokens';
export { statusToken } from './ProjectStatusPanel.tokens';

export interface ProjectStatusRow {
  id: string;
  name: string;
  status: ProjectStatus;
  /** 0–100 crew completion for this project's active work. */
  progress: number;
}

interface ProjectStatusPanelProps {
  title?: string;
  rows: ProjectStatusRow[];
  /** real-time-updates feature: show a live pulse when the feed is streaming. */
  live?: boolean;
}

export function ProjectStatusPanel({ title = 'Project Status', rows, live = false }: ProjectStatusPanelProps) {
  return (
    <section
      style={{
        background: color.card,
        border: `1px solid ${color.border}`,
        borderRadius: 'var(--radius)',
        padding: space(6),
        fontFamily: font.sans,
        color: color.text,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space(4) }}>
        <h2 style={{ margin: 0, fontSize: 'var(--type-size-h2, 1.25rem)', textTransform: 'var(--uppercase)' as React.CSSProperties['textTransform'] }}>{title}</h2>
        {live && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: space(1), fontFamily: font.mono, fontSize: '0.75rem', color: color.agent }}>
            <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-elbow)', background: color.agent, display: 'inline-block' }} />
            LIVE
          </span>
        )}
      </header>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: space(2) }}>
        {rows.map((row) => (
          <li
            key={row.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space(4),
              background: color.surface, border: `1px solid ${color.border}`, borderRadius: 'var(--radius)',
              padding: `${space(2)} ${space(4)}`,
            }}
          >
            <span style={{ fontFamily: font.mono, fontSize: '0.85rem' }}>{row.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: space(3) }}>
              <span
                aria-label={`progress ${row.progress}%`}
                style={{ width: 96, height: 6, borderRadius: 'var(--radius)', background: color.surface, border: `1px solid ${color.border}`, overflow: 'hidden' }}
              >
                <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, row.progress))}%`, background: statusToken(row.status) }} />
              </span>
              <span
                style={{
                  fontFamily: font.mono, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
                  padding: `${space(1)} ${space(2)}`, borderRadius: 'var(--radius-elbow)',
                  color: statusToken(row.status), border: `1px solid ${statusToken(row.status)}`,
                }}
              >
                {STATUS_LABEL[row.status]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ProjectStatusPanel;
