'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';

/**
 * ROIIndicator — Return on Investment tracker
 *
 * Displays the relationship between cost, delivered stories, and velocity trends.
 * Shows: Stories Delivered, Cost Per Story, Velocity Trend
 *
 * @example
 * ```tsx
 * <ROIIndicator
 *   acceptedStories={12}
 *   totalCost={4500}
 *   velocity={3}
 * />
 * ```
 */

export interface ROIIndicatorProps {
  /** Number of accepted/delivered stories */
  acceptedStories: number;
  /** Total cost in USD */
  totalCost: number;
  /** Velocity trend: 1 = stable, >1 = increasing, <1 = decreasing */
  velocity: number;
  /** Optional previous velocity for comparison */
  previousVelocity?: number;
}

/**
 * Get trend indicator icon
 */
function getTrendIcon(current: number, previous?: number): string {
  if (!previous) return '→';
  if (current > previous) return '↑';
  if (current < previous) return '↓';
  return '→';
}

/**
 * Get trend color
 */
function getTrendColor(current: number, previous?: number): string {
  if (!previous) return color.accent;
  if (current > previous) return color.agent;
  if (current < previous) return color.errText;
  return color.accent;
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ROIIndicator({
  acceptedStories,
  totalCost,
  velocity,
  previousVelocity,
}: ROIIndicatorProps): React.ReactElement {
  const costPerStory = acceptedStories > 0 ? totalCost / acceptedStories : 0;
  const trendIcon = getTrendIcon(velocity, previousVelocity);
  const trendColor = getTrendColor(velocity, previousVelocity);

  return (
    <div
      style={{
        background: color.card,
        border: `1px solid ${color.border}`,
        borderRadius: 'var(--radius)',
        padding: space(6),
        fontFamily: font.sans,
        color: color.text,
      }}
    >
      <h3
        style={{
          margin: `0 0 ${space(4)} 0`,
          fontSize: '0.875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Return on Investment
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: space(4),
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Stories Delivered
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1.5rem',
              color: color.text,
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {acceptedStories}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Cost Per Story
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1.25rem',
              color: color.text,
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {formatCurrency(costPerStory)}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Velocity Trend
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1.5rem',
              color: trendColor,
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {trendIcon} {velocity.toFixed(2)}
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: space(4),
          paddingTop: space(4),
          borderTop: `1px solid ${color.border}`,
          fontSize: '0.8rem',
          color: color.muted,
        }}
      >
        <p style={{ margin: 0 }}>
          {acceptedStories > 0
            ? `Delivering stories at ${velocity.toFixed(1)}x baseline rate · ${formatCurrency(totalCost)} invested`
            : 'No stories delivered yet'}
        </p>
      </div>
    </div>
  );
}

export default ROIIndicator;
