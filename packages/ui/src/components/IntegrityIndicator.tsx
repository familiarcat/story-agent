'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';
import StatusBadge from './StatusBadge';

/**
 * IntegrityIndicator — Data integrity status display
 *
 * Shows whether data is valid, orphaned, or has broken references.
 * Provides visual feedback and detailed messages about data health.
 *
 * @example
 * ```tsx
 * <IntegrityIndicator
 *   status="valid"
 *   message="All references valid and in sync"
 * />
 * ```
 */

export type IntegrityStatus = 'valid' | 'orphaned' | 'broken';

export interface IntegrityIndicatorProps {
  /** The integrity status */
  status: IntegrityStatus;
  /** Detailed message explaining the status */
  message: string;
  /** Optional list of issues (for broken or orphaned) */
  issues?: string[];
  /** Optional click handler */
  onClick?: () => void;
}

const INTEGRITY_ICONS: Record<IntegrityStatus, string> = {
  valid: '✅',
  orphaned: '⚠️',
  broken: '🔴',
};

const INTEGRITY_LABELS: Record<IntegrityStatus, string> = {
  valid: 'Valid',
  orphaned: 'Orphaned',
  broken: 'Broken References',
};

export function IntegrityIndicator({
  status,
  message,
  issues = [],
  onClick,
}: IntegrityIndicatorProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space(2),
      }}
    >
      <StatusBadge
        variant="integrity"
        status={status}
        label={INTEGRITY_LABELS[status]}
        icon={INTEGRITY_ICONS[status]}
        onClick={onClick}
        ariaLabel={`Data integrity: ${status}`}
      />
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: color.text,
          fontFamily: font.sans,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {issues.length > 0 && (
        <ul
          style={{
            margin: 0,
            paddingLeft: space(4),
            fontSize: '0.8rem',
            color: color.muted,
            fontFamily: font.mono,
          }}
        >
          {issues.map((issue, index) => (
            <li key={index} style={{ marginBottom: space(1) }}>
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default IntegrityIndicator;
