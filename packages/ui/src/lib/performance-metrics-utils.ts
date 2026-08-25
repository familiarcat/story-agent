/**
 * performance-metrics-utils.ts — Utilities for performance metric evaluation
 *
 * Pure functions for calculating latency percentiles, evaluating metric health,
 * and suggesting performance optimizations.
 */

export type MetricHealth = 'green' | 'yellow' | 'red';

/**
 * Calculate a percentile value from an array of numbers
 * @param latencies Array of latency values in milliseconds
 * @param percentile The percentile to calculate (0-100)
 * @returns The latency at the given percentile
 */
export function calculateLatencyPercentile(latencies: number[], percentile: number): number {
  if (latencies.length === 0) return 0;

  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate average latency
 * @param latencies Array of latency values in milliseconds
 * @returns Average latency
 */
export function calculateAverageLatency(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sum = latencies.reduce((a, b) => a + b, 0);
  return sum / latencies.length;
}

/**
 * Calculate standard deviation of latencies
 * @param latencies Array of latency values in milliseconds
 * @returns Standard deviation
 */
export function calculateLatencyStdDev(latencies: number[]): number {
  if (latencies.length === 0) return 0;

  const avg = calculateAverageLatency(latencies);
  const squaredDiffs = latencies.map((val) => Math.pow(val - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / latencies.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Evaluate metric health based on value and thresholds
 * @param value The metric value
 * @param thresholds Object with greenThreshold and yellowThreshold
 * @param isLowerBetter Whether lower values are better (default: true)
 * @returns Health status
 */
export function evaluateMetricHealth(
  value: number,
  thresholds: { greenThreshold: number; yellowThreshold: number },
  isLowerBetter: boolean = true
): MetricHealth {
  if (isLowerBetter) {
    if (value <= thresholds.greenThreshold) return 'green';
    if (value <= thresholds.yellowThreshold) return 'yellow';
    return 'red';
  } else {
    if (value >= thresholds.greenThreshold) return 'green';
    if (value >= thresholds.yellowThreshold) return 'yellow';
    return 'red';
  }
}

/**
 * Suggest optimizations based on performance metrics
 * @param metrics Object with performance metrics
 * @returns Array of optimization suggestions
 */
export function suggestOptimizations(metrics: {
  cacheAge?: number;
  latencyP95?: number;
  latencyP99?: number;
  errorRate?: number;
  throughput?: number;
}): string[] {
  const suggestions: string[] = [];

  if (metrics.cacheAge && metrics.cacheAge > 300) {
    suggestions.push(
      'Cache is stale; consider increasing TTL or implementing cache invalidation strategy'
    );
  }

  if (metrics.latencyP95 && metrics.latencyP95 > 500) {
    suggestions.push('High P95 latency detected; review database indexes and query optimization');
  }

  if (metrics.latencyP99 && metrics.latencyP99 > 2000) {
    suggestions.push(
      'Very high P99 latency; implement request batching or consider distributed caching'
    );
  }

  if (metrics.errorRate && metrics.errorRate > 1) {
    suggestions.push('Error rate above baseline; investigate recent code changes or resource limits');
  }

  if (metrics.throughput && metrics.throughput < 100) {
    suggestions.push('Low throughput; consider connection pooling or load balancing improvements');
  }

  return suggestions;
}

/**
 * Get health icon for metric status
 * @param health The health status
 * @returns Emoji icon
 */
export function getMetricHealthIcon(health: MetricHealth): string {
  const icons: Record<MetricHealth, string> = {
    green: '✅',
    yellow: '⚠️',
    red: '❌',
  };
  return icons[health];
}

/**
 * Format latency value for display
 * @param ms Latency in milliseconds
 * @returns Formatted string
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Categorize latency into buckets
 * @param ms Latency in milliseconds
 * @returns Category string
 */
export function categorizeLatency(ms: number): string {
  if (ms < 50) return 'Excellent';
  if (ms < 100) return 'Good';
  if (ms < 200) return 'Fair';
  if (ms < 500) return 'Poor';
  if (ms < 1000) return 'Very Poor';
  return 'Unacceptable';
}
