/**
 * status-badge-utils.ts — Utilities for status badges and audit trail
 *
 * Pure functions for mapping status values to colors, icons, and formatted strings.
 */

import type { StatusBadgeVariant } from '../components/StatusBadge';

/**
 * Get color code for a status string
 * @param status The status value
 * @param variant The badge variant for context
 * @returns Color string (hex or CSS var)
 */
export function getStatusColor(status: string, variant: StatusBadgeVariant): string {
  const lower = status.toLowerCase();

  // Success states
  if (
    lower.includes('success') ||
    lower.includes('passed') ||
    lower.includes('valid') ||
    lower.includes('active') ||
    lower.includes('deployed')
  ) {
    return 'var(--success)';
  }

  // Warning states
  if (lower.includes('warning') || lower.includes('orphan') || lower.includes('pending')) {
    return 'var(--warning)';
  }

  // Error states
  if (lower.includes('error') || lower.includes('failed') || lower.includes('broken') || lower.includes('blocked')) {
    return 'var(--error)';
  }

  return 'var(--info)';
}

/**
 * Get icon for a status string
 * @param status The status value
 * @returns Emoji or symbol string
 */
export function getStatusIcon(status: string): string {
  const lower = status.toLowerCase();

  if (
    lower.includes('success') ||
    lower.includes('passed') ||
    lower.includes('valid') ||
    lower.includes('deployed')
  ) {
    return '✅';
  }

  if (lower.includes('warning') || lower.includes('orphan') || lower.includes('pending')) {
    return '⚠️';
  }

  if (lower.includes('error') || lower.includes('failed') || lower.includes('broken')) {
    return '❌';
  }

  if (lower.includes('info') || lower.includes('active')) {
    return 'ℹ️';
  }

  return '•';
}

/**
 * Format an audit trail entry into a display string
 * @param timestamp Date of the entry
 * @param actor Person who performed action
 * @param action Action performed
 * @param details Optional additional details
 * @returns Formatted audit entry string
 */
export function formatAuditEntry(
  timestamp: Date,
  actor: string,
  action: string,
  details?: string
): string {
  const dateStr = timestamp.toLocaleDateString('en-US', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = [`${dateStr} ${timeStr}`, actor, action];
  if (details) {
    parts.push(details);
  }

  return parts.join(' | ');
}

/**
 * Get a human-readable status label
 * @param status The status value
 * @returns Display label
 */
export function getStatusLabel(status: string): string {
  return status
    .split(/(?=[A-Z])/)
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Check if status is a success state
 * @param status The status value
 * @returns Boolean
 */
export function isSuccessStatus(status: string): boolean {
  const lower = status.toLowerCase();
  return (
    lower.includes('success') ||
    lower.includes('passed') ||
    lower.includes('valid') ||
    lower.includes('deployed') ||
    lower.includes('active')
  );
}

/**
 * Check if status is an error state
 * @param status The status value
 * @returns Boolean
 */
export function isErrorStatus(status: string): boolean {
  const lower = status.toLowerCase();
  return (
    lower.includes('error') || lower.includes('failed') || lower.includes('broken') || lower.includes('blocked')
  );
}

/**
 * Check if status is a warning state
 * @param status The status value
 * @returns Boolean
 */
export function isWarningStatus(status: string): boolean {
  const lower = status.toLowerCase();
  return lower.includes('warning') || lower.includes('orphan') || lower.includes('pending');
}
