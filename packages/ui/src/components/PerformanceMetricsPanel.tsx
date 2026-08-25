'use client';

import React from 'react';
import { color, space, font } from '@/lib/tokens';

/**
 * PerformanceMetricsPanel — Performance monitoring dashboard
 *
 * Shows performance metrics including cache age, query latency percentiles (p50/p95/p99),
 * and optimization suggestions when thresholds are exceeded.
 *
 * @example
 * ```tsx
 * <PerformanceMetricsPanel
 *   hierarchyLevel="sprint"
 *   metrics={{
 *     cacheAge: 120,
 *     latencyP50: 45,
 *     latencyP95: 320,
 *     latencyP99: 890
 *   }}
 * />
 * ```
 */

export type HierarchyLevel = 'client' | 'project' | 'mission' | 'sprint' | 'story' | 'task';

export interface PerformanceMetrics {
  cacheAge: number; // seconds
  latencyP50: number; // milliseconds
  latencyP95: number; // milliseconds
  latencyP99: number; // milliseconds
  errorRate?: number; // percentage
}

export interface PerformanceMetricsPanelProps {
  hierarchyLevel: HierarchyLevel;
  metrics: PerformanceMetrics;
  onExpand?: () => void;
}

type MetricHealth = 'green' | 'yellow' | 'red';

/**
 * Determine health status for a metric
 */
function getMetricHealth(value: number, type: string): MetricHealth {
  if (type === 'cache') {
    if (value < 300) return 'green';
    if (value < 600) return 'yellow';
    return 'red';
  }

  if (type === 'latencyP50') {
    if (value < 100) return 'green';
    if (value < 200) return 'yellow';
    return 'red';
  }

  if (type === 'latencyP95') {
    if (value < 500) return 'green';
    if (value < 1000) return 'yellow';
    return 'red';
  }

  if (type === 'latencyP99') {
    if (value < 2000) return 'green';
    if (value < 5000) return 'yellow';
    return 'red';
  }

  return 'yellow';
}

/**
 * Get health color
 */
function getHealthColor(health: MetricHealth): string {
  switch (health) {
    case 'green':
      return color.agent;
    case 'yellow':
      return color.cost;
    case 'red':
      return color.errText;
  }
}

/**
 * Get optimization suggestions
 */
function getOptimizations(metrics: PerformanceMetrics): string[] {
  const suggestions: string[] = [];

  if (metrics.cacheAge > 300) {
    suggestions.push('Consider increasing cache TTL or implementing cache warming');
  }

  if (metrics.latencyP95 > 500) {
    suggestions.push('Database queries may need optimization or indexing review');
  }

  if (metrics.latencyP99 > 2000) {
    suggestions.push('Implement request batching or query result caching');
  }

  if (metrics.errorRate && metrics.errorRate > 1) {
    suggestions.push('Error rate above baseline; investigate recent deployments');
  }

  return suggestions;
}

export function PerformanceMetricsPanel({
  hierarchyLevel,
  metrics,
  onExpand,
}: PerformanceMetricsPanelProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  const handleExpand = () => {
    setExpanded(!expanded);
    if (onExpand) {
      onExpand();
    }
  };

  const cacheHealth = getMetricHealth(metrics.cacheAge, 'cache');
  const p50Health = getMetricHealth(metrics.latencyP50, 'latencyP50');
  const p95Health = getMetricHealth(metrics.latencyP95, 'latencyP95');
  const p99Health = getMetricHealth(metrics.latencyP99, 'latencyP99');

  const optimizations = getOptimizations(metrics);
  const hasIssues =
    cacheHealth === 'red' || p50Health === 'red' || p95Health === 'red' || p99Health === 'red';

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
          Performance Metrics
        </h2>
        {hasIssues && (
          <span style={{ fontSize: '0.875rem', color: color.errText, fontWeight: 700 }}>
            ⚠️ Issues detected
          </span>
        )}
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
            Cache Age
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1rem',
              color: getHealthColor(cacheHealth),
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {metrics.cacheAge}s {cacheHealth === 'green' ? '✅' : cacheHealth === 'yellow' ? '⚠️' : '❌'}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Latency P50
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1rem',
              color: getHealthColor(p50Health),
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {metrics.latencyP50}ms {p50Health === 'green' ? '✅' : p50Health === 'yellow' ? '⚠️' : '❌'}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Latency P95
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1rem',
              color: getHealthColor(p95Health),
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {metrics.latencyP95}ms {p95Health === 'green' ? '✅' : p95Health === 'yellow' ? '⚠️' : '❌'}
          </p>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: color.muted, textTransform: 'uppercase' }}>
            Latency P99
          </p>
          <p
            style={{
              margin: `${space(1)} 0 0 0`,
              fontSize: '1rem',
              color: getHealthColor(p99Health),
              fontWeight: 700,
              fontFamily: font.mono,
            }}
          >
            {metrics.latencyP99}ms {p99Health === 'green' ? '✅' : p99Health === 'yellow' ? '⚠️' : '❌'}
          </p>
        </div>
      </div>

      {expanded && optimizations.length > 0 && (
        <div style={{ marginTop: space(4), paddingTop: space(4), borderTop: `1px solid ${color.border}` }}>
          <h3 style={{ margin: `0 0 ${space(2)} 0`, fontSize: '0.875rem', fontWeight: 700 }}>
            Optimization Suggestions
          </h3>
          <ul style={{ margin: 0, paddingLeft: space(4), fontSize: '0.8rem', color: color.text }}>
            {optimizations.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: space(1) }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default PerformanceMetricsPanel;
