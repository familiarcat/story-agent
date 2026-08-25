/**
 * health-status-utils.ts — Utilities for health status calculations
 *
 * Pure functions for calculating health scores, determining health buckets,
 * and evaluating drill-down diagnostics.
 */

export type HealthBucket = 'green' | 'yellow' | 'red';

export interface HealthMetrics {
  ciPassed: boolean;
  testPassRate: number;
  deploymentStatus: 'prod' | 'staging' | 'dev' | 'none';
  errorRate?: number;
  uptime?: number;
}

export interface DiagnosticEntry {
  metric: string;
  value: string | number;
  status: HealthBucket;
  recommendation?: string;
}

/**
 * Calculate an overall health score (0-100) from metrics
 * @param metrics The health metrics object
 * @returns Health score from 0-100
 */
export function calculateHealthScore(metrics: HealthMetrics): number {
  let score = 100;

  // CI status (40 points)
  if (!metrics.ciPassed) {
    score -= 40;
  }

  // Test pass rate (30 points)
  const testScore = Math.max(0, (metrics.testPassRate - 60) / 0.4);
  score -= Math.max(0, 30 - (testScore / 100) * 30);

  // Deployment status (20 points)
  if (metrics.deploymentStatus === 'none') {
    score -= 20;
  } else if (metrics.deploymentStatus === 'dev') {
    score -= 10;
  }

  // Error rate (10 points)
  if (metrics.errorRate) {
    const errorPenalty = Math.min(10, metrics.errorRate / 0.1);
    score -= errorPenalty;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get health bucket based on score
 * @param score The health score (0-100)
 * @returns Health bucket classification
 */
export function getHealthBucket(score: number): HealthBucket {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

/**
 * Evaluate drill-down diagnostics
 * @param metrics The health metrics
 * @returns Array of diagnostic entries
 */
export function evaluateDrilldownDiagnostics(metrics: HealthMetrics): DiagnosticEntry[] {
  const diagnostics: DiagnosticEntry[] = [];

  diagnostics.push({
    metric: 'CI Pipeline',
    value: metrics.ciPassed ? 'Passing' : 'Failing',
    status: metrics.ciPassed ? 'green' : 'red',
    recommendation: metrics.ciPassed ? undefined : 'Review CI logs for failed checks',
  });

  diagnostics.push({
    metric: 'Test Pass Rate',
    value: `${metrics.testPassRate.toFixed(1)}%`,
    status:
      metrics.testPassRate >= 95
        ? 'green'
        : metrics.testPassRate >= 80
          ? 'yellow'
          : 'red',
    recommendation:
      metrics.testPassRate < 80
        ? 'Increase test coverage and fix failing tests'
        : metrics.testPassRate < 95
          ? 'Continue improving test reliability'
          : undefined,
  });

  diagnostics.push({
    metric: 'Deployment Status',
    value: metrics.deploymentStatus,
    status:
      metrics.deploymentStatus === 'prod'
        ? 'green'
        : metrics.deploymentStatus === 'staging'
          ? 'yellow'
          : 'red',
    recommendation:
      metrics.deploymentStatus === 'none' ? 'Deploy to at least dev environment' : undefined,
  });

  if (metrics.errorRate !== undefined) {
    diagnostics.push({
      metric: 'Error Rate',
      value: `${metrics.errorRate.toFixed(2)}%`,
      status: metrics.errorRate < 1 ? 'green' : metrics.errorRate < 3 ? 'yellow' : 'red',
      recommendation:
        metrics.errorRate > 1 ? 'Investigate recent errors and failed transactions' : undefined,
    });
  }

  if (metrics.uptime !== undefined) {
    diagnostics.push({
      metric: 'Uptime',
      value: `${metrics.uptime.toFixed(2)}%`,
      status: metrics.uptime >= 99.5 ? 'green' : metrics.uptime >= 99 ? 'yellow' : 'red',
      recommendation: metrics.uptime < 99 ? 'Review outage logs and improve reliability' : undefined,
    });
  }

  return diagnostics;
}

/**
 * Get health status label
 * @param bucket The health bucket
 * @returns Human-readable label
 */
export function getHealthLabel(bucket: HealthBucket): string {
  const labels: Record<HealthBucket, string> = {
    green: 'Healthy',
    yellow: 'Degraded',
    red: 'Critical',
  };
  return labels[bucket];
}

/**
 * Get health icon
 * @param bucket The health bucket
 * @returns Emoji icon
 */
export function getHealthIcon(bucket: HealthBucket): string {
  const icons: Record<HealthBucket, string> = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  };
  return icons[bucket];
}
