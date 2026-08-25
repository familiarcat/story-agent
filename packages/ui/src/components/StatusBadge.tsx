'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';

/**
 * StatusBadge — Unified status indicator component
 *
 * Displays status information with consistent styling across different contexts.
 * Supports multiple variants: permission, integrity, test, deployment, health.
 *
 * @example
 * ```tsx
 * <StatusBadge
 *   variant="integrity"
 *   status="valid"
 *   label="Data Integrity"
 *   icon="✅"
 * />
 * ```
 */

export type StatusBadgeVariant = 'permission' | 'integrity' | 'test' | 'deployment' | 'health';
export type StatusType = 'success' | 'warning' | 'error' | 'info';

export interface StatusBadgeProps {
  /** The badge variant determines styling and context */
  variant: StatusBadgeVariant;
  /** The status value (e.g., 'valid', 'passed', 'active') */
  status: string;
  /** Display label */
  label: string;
  /** Optional icon (emoji or symbol) */
  icon?: string;
  /** Optional custom color override */
  badgeColor?: string;
  /** Optional additional details shown on hover */
  detail?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Accessibility role */
  role?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

/**
 * Map status strings to visual types
 */
function getStatusType(status: string): StatusType {
  const lower = status.toLowerCase();
  if (lower.includes('success') || lower.includes('passed') || lower.includes('valid') || lower.includes('active')) {
    return 'success';
  }
  if (lower.includes('warning') || lower.includes('orphan') || lower.includes('pending')) {
    return 'warning';
  }
  if (lower.includes('error') || lower.includes('failed') || lower.includes('broken') || lower.includes('blocked')) {
    return 'error';
  }
  return 'info';
}

/**
 * Get color for a status type
 */
function getStatusColor(statusType: StatusType): string {
  switch (statusType) {
    case 'success':
      return color.agent;
    case 'warning':
      return color.cost;
    case 'error':
      return color.errText;
    case 'info':
    default:
      return color.accent || color.accent;
  }
}

/**
 * Get background color for a status type (lighter shade)
 */
function getStatusBackgroundColor(statusType: StatusType): string {
  switch (statusType) {
    case 'success':
      return 'rgba(76, 175, 80, 0.1)';
    case 'warning':
      return 'rgba(255, 193, 7, 0.1)';
    case 'error':
      return 'rgba(244, 67, 54, 0.1)';
    case 'info':
    default:
      return 'rgba(33, 150, 243, 0.1)';
  }
}

export function StatusBadge({
  variant,
  status,
  label,
  icon,
  badgeColor,
  detail,
  onClick,
  role = 'status',
  ariaLabel,
}: StatusBadgeProps): React.ReactElement {
  const statusType = getStatusType(status);
  const statusColor = badgeColor || getStatusColor(statusType);
  const bgColor = getStatusBackgroundColor(statusType);

  return (
    <div
      role={role}
      aria-label={ariaLabel || `${label}: ${status}`}
      title={detail}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space(2),
        padding: `${space(1)} ${space(3)}`,
        borderRadius: 'var(--radius)',
        backgroundColor: bgColor,
        border: `1px solid ${statusColor}`,
        fontFamily: font.mono,
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: statusColor,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (onClick) {
          el.style.backgroundColor = statusColor;
          el.style.color = '#000';
          el.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.backgroundColor = bgColor;
        el.style.color = statusColor;
        el.style.transform = 'scale(1)';
      }}
    >
      {icon && <span style={{ fontSize: '0.875rem' }}>{icon}</span>}
      <span>
        {label}
        {status && <span style={{ opacity: 0.8, marginLeft: space(1) }}>— {status}</span>}
      </span>
    </div>
  );
}

export default StatusBadge;
