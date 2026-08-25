'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';

/**
 * HealthStatusPanel — System health display with drill-down diagnostics
 *
 * Shows system health at the current hierarchy level with expandable drill-down
 * diagnostics. Displays: Overall Health, CI Status, Test Pass Rate, Deployment Status.
 *
 * @example
 * ```tsx
 * <HealthStatusPanel
 *   hierarchyLevel="project"
 *   data={{
 *     overallHealth: 'green',
 *     ciStatus: 'passed',
 *     testPassRate: 98.5,
 *     deploymentStatus: 'prod'
 *   }}
 * />
 * ```
 */

export type HealthLevel = 'green' | 'yellow' | 'red';
export type HierarchyLevel = 'client' | 'project' | 'mission' | 'sprint' | 'story' | 'task';

export interface HealthMetrics {
  overallHealth: HealthLevel;
  ciStatus: 'passed' | 'failed';
  testPassRate: number;
  deploymentStatus: 'dev' | 'staging' | 'prod' | 'none';
  lastUpdated?: Date;
}

export interface HealthStatusPanelProps {
  hierarchyLevel: HierarchyLevel;
  data: HealthMetrics;
  onExpand?: () => void;
}

const HEALTH_COLORS: Record<HealthLevel, string> = {
  green: 'var(--success)',
  yellow: 'var(--warning)',
  red: 'var(--error)',
};

const HEALTH_LABELS: Record<HealthLevel, string> = {
  green: 'Healthy',
  yellow: 'Warning',
  red: 'Critical',
};

export function HealthStatusPanel({
  hierarchyLevel,
  data,
  onExpand,
}: HealthStatusPanelProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  const handleExpand = () => {
    setExpanded(!expanded);
    if (onExpand) {
      onExpand();
    }
  };

  const healthColor = HEALTH_COLORS[data.overallHealth];
  const healthLabel = HEALTH_LABELS[data.overallHealth];

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
          Health Status
        </h2>
        <span
          style={{
            fontSize: '0.875rem',
            color: healthColor,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: space(2),
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: healthColor,
              display: 'inline-block',
            }}
          />
          {healthLabel}
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
            CI Status
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1rem',
              color: data.ciStatus === 'passed' ? color.agent : color.errText,
              fontWeight: 700,
            }}
          >
            {data.ciStatus === 'passed' ? '✅ Passed' : '❌ Failed'}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Test Pass Rate
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1rem',
              color:
                data.testPassRate >= 95
                  ? color.agent
                  : data.testPassRate >= 80
                    ? color.cost
                    : color.errText,
              fontWeight: 700,
            }}
          >
            {data.testPassRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div style={{ marginBottom: space(4) }}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
          Deployment
        </p>
        <p style={{ margin: `${space(1)} 0 0 0`, fontSize: '0.9rem', color: color.text }}>
          {data.deploymentStatus === 'prod'
            ? '🚀 Production'
            : data.deploymentStatus === 'staging'
              ? '🧪 Staging'
              : data.deploymentStatus === 'dev'
                ? '🔨 Development'
                : 'Not Deployed'}
        </p>
      </div>

      {data.lastUpdated && (
        <p style={{ margin: 0, fontSize: '0.7rem', color: color.muted, fontFamily: font.mono }}>
          Updated: {data.lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {expanded && (
        <div style={{ marginTop: space(4), paddingTop: space(4), borderTop: `1px solid ${color.border}` }}>
          <h3 style={{ margin: `0 0 ${space(2)} 0`, fontSize: '0.875rem', fontWeight: 700 }}>
            Diagnostics
          </h3>
          <ul style={{ margin: 0, paddingLeft: space(4), fontSize: '0.8rem', color: color.text }}>
            <li>Overall health score: {data.overallHealth === 'green' ? '90+' : data.overallHealth === 'yellow' ? '70-89' : '< 70'}</li>
            <li>CI pipeline: {data.ciStatus === 'passed' ? 'All checks passing' : 'Review failed checks'}</li>
            <li>Test reliability: {data.testPassRate >= 95 ? 'Excellent' : data.testPassRate >= 80 ? 'Good' : 'Needs improvement'}</li>
          </ul>
        </div>
      )}
    </section>
  );
}

export default HealthStatusPanel;
