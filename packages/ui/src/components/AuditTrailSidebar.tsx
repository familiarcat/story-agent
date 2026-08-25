'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';

/**
 * AuditTrailSidebar — Audit trail timeline display
 *
 * Shows a scrollable sidebar with audit entries displaying who did what when.
 * Format: "2026-08-25 14:30 | Riker | Approved PR #123 | ..."
 *
 * @example
 * ```tsx
 * <AuditTrailSidebar
 *   auditEntries={[
 *     {
 *       timestamp: new Date('2026-08-25T14:30:00'),
 *       actor: 'Riker',
 *       action: 'Approved PR',
 *       details: '#123'
 *     }
 *   ]}
 * />
 * ```
 */

export interface AuditTrailEntry {
  timestamp: Date;
  actor: string;
  action: string;
  details?: string;
}

export interface AuditTrailSidebarProps {
  /** Array of audit trail entries */
  auditEntries: AuditTrailEntry[];
  /** Optional title */
  title?: string;
  /** Maximum height before scrolling */
  maxHeight?: string;
}

function formatTimestamp(date: Date): string {
  const dateStr = date.toLocaleDateString('en-US', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${dateStr} ${timeStr}`;
}

export function AuditTrailSidebar({
  auditEntries,
  title = 'Audit Trail',
  maxHeight = '400px',
}: AuditTrailSidebarProps): React.ReactElement {
  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space(2),
        padding: space(4),
        borderLeft: `2px solid ${color.border}`,
        background: color.surface,
        borderRadius: 'var(--radius)',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: color.text,
          fontFamily: font.sans,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space(2),
          maxHeight,
          overflowY: 'auto',
          paddingRight: space(2),
        }}
      >
        {auditEntries.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: color.muted,
              fontStyle: 'italic',
            }}
          >
            No audit entries
          </p>
        ) : (
          auditEntries.map((entry, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: space(1),
                paddingBottom: space(2),
                borderBottom:
                  index < auditEntries.length - 1
                    ? `1px solid ${color.border}`
                    : 'none',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontFamily: font.mono,
                  color: color.muted,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {formatTimestamp(entry.timestamp)}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontFamily: font.mono,
                  color: color.text,
                  fontWeight: 600,
                }}
              >
                {entry.actor}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontFamily: font.sans,
                  color: color.text,
                }}
              >
                {entry.action}
                {entry.details && (
                  <span style={{ color: color.accent, marginLeft: space(1) }}>
                    · {entry.details}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default AuditTrailSidebar;
