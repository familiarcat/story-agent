'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';

/**
 * CostBreakdownPanel — Cost attribution and budget tracking
 *
 * Shows cost breakdown including crew hours, cumulative spend, budget remaining, and ROI.
 * Displays cost per crew role and budget variance indicators.
 *
 * @example
 * ```tsx
 * <CostBreakdownPanel
 *   hierarchyLevel="sprint"
 *   spend={2500}
 *   budget={3000}
 *   crewHours={{ architect: 8, developer: 20, qa: 5 }}
 * />
 * ```
 */

export type HierarchyLevel = 'client' | 'project' | 'mission' | 'sprint' | 'story' | 'task';

export interface CrewHoursBreakdown {
  [role: string]: number;
}

export interface CostBreakdownPanelProps {
  hierarchyLevel: HierarchyLevel;
  spend: number;
  budget: number;
  crewHours: CrewHoursBreakdown;
  ratePerHour?: number;
  onExpand?: () => void;
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

/**
 * Calculate budget variance percentage
 */
function calculateVariance(spent: number, budgeted: number): number {
  if (budgeted === 0) return 0;
  return ((spent / budgeted) * 100 - 100).toFixed(1) as unknown as number;
}

export function CostBreakdownPanel({
  hierarchyLevel,
  spend,
  budget,
  crewHours,
  ratePerHour = 150,
  onExpand,
}: CostBreakdownPanelProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  const handleExpand = () => {
    setExpanded(!expanded);
    if (onExpand) {
      onExpand();
    }
  };

  const remaining = budget - spend;
  const variance = calculateVariance(spend, budget);
  const remainingPercent = (remaining / budget) * 100;
  const totalHours = Object.values(crewHours).reduce((sum, hours) => sum + hours, 0);
  const roi = spend > 0 ? (totalHours / spend) * 100 : 0;

  const varianceColor =
    remaining > 0 ? color.agent : remaining > -budget * 0.1 ? color.cost : color.errText;

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
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: space(4),
          cursor: 'pointer',
        }}
        onClick={handleExpand}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--type-size-h2, 1.25rem)',
            textTransform: 'uppercase',
            fontFamily: font.sans,
          }}
        >
          Cost Breakdown
        </h2>
        <span
          style={{
            fontSize: '0.875rem',
            color: varianceColor,
            fontWeight: 700,
          }}
        >
          {variance > 0 ? '+' : ''}{variance.toFixed(1)}% of budget
        </span>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: space(4),
          marginBottom: space(4),
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Total Spend
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
            {formatCurrency(spend)}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Budget Remaining
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1.25rem',
              color: varianceColor,
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {formatCurrency(remaining)} ({remainingPercent.toFixed(0)}%)
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Total Hours
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
            {totalHours.toFixed(1)}h
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            ROI (hrs/$1k)
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1.25rem',
              color: roi > 1 ? color.agent : color.cost,
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {roi.toFixed(2)}
          </p>
        </div>
      </div>

      {expanded && Object.keys(crewHours).length > 0 && (
        <div style={{ marginTop: space(4), paddingTop: space(4), borderTop: `1px solid ${color.border}` }}>
          <h3 style={{ margin: `0 0 ${space(2)} 0`, fontSize: '0.875rem', fontWeight: 700 }}>
            Crew Hours Breakdown
          </h3>
          <ul style={{ margin: 0, paddingLeft: space(4), fontSize: '0.8rem', color: color.text }}>
            {Object.entries(crewHours).map(([role, hours]) => (
              <li key={role} style={{ marginBottom: space(1) }}>
                {role}: {hours.toFixed(1)}h ≈ {formatCurrency(hours * ratePerHour)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default CostBreakdownPanel;
