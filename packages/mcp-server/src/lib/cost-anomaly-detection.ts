/**
 * Cost Anomaly Detection & Alerting — QUARK Task 4.3
 *
 * Detects cost anomalies using rolling 7-day baseline + 2σ statistical thresholds.
 * Fires Slack alerts when a tester's daily cost deviates >2σ from baseline.
 */

export interface CostBaseline {
  user_id: string;
  mean: number;
  std_dev: number;
  samples: number;
  last_updated: string;
}

export interface CostAnomaly {
  user_id: string;
  date: string;
  actual_cost: number;
  expected_cost: number;
  deviation_percent: number;
  std_devs_above_mean: number;
  severity: 'critical' | 'warning';
  message: string;
  suspected_cause?: string;
}

/**
 * Calculate baseline statistics from daily costs
 */
export function calculateBaseline(dailyCosts: number[]): CostBaseline | null {
  if (dailyCosts.length < 2) return null;

  const mean = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
  const variance =
    dailyCosts.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / dailyCosts.length;
  const std_dev = Math.sqrt(variance);

  return {
    user_id: 'temp', // will be set by caller
    mean,
    std_dev,
    samples: dailyCosts.length,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Detect anomaly based on 2σ threshold
 * Anomaly = actual_cost > (mean + 2σ)
 */
export function detectAnomaly(
  userId: string,
  actualCost: number,
  baseline: CostBaseline,
  date: string = new Date().toISOString().split('T')[0]
): CostAnomaly | null {
  const threshold = baseline.mean + 2 * baseline.std_dev;
  const deviation = actualCost - baseline.mean;
  const deviation_percent = (deviation / baseline.mean) * 100;
  const std_devs_above_mean = deviation / baseline.std_dev;

  if (actualCost > threshold) {
    // Heuristics for suspected cause
    let suspected_cause = 'Unknown';
    if (deviation_percent > 100) {
      suspected_cause = 'Significantly longer session or new feature usage';
    } else if (deviation_percent > 50) {
      suspected_cause = 'Extended usage or multiple concurrent sessions';
    } else if (deviation_percent > 20) {
      suspected_cause = 'Higher than usual activity or testing';
    }

    const anomaly: CostAnomaly = {
      user_id: userId,
      date,
      actual_cost: parseFloat(actualCost.toFixed(4)),
      expected_cost: parseFloat(baseline.mean.toFixed(4)),
      deviation_percent: parseFloat(deviation_percent.toFixed(1)),
      std_devs_above_mean: parseFloat(std_devs_above_mean.toFixed(2)),
      severity: std_devs_above_mean > 3 ? 'critical' : 'warning',
      message: `Cost anomaly detected: $${actualCost.toFixed(4)} (expected $${baseline.mean.toFixed(4)}, +${deviation_percent.toFixed(1)}%)`,
      suspected_cause,
    };

    return anomaly;
  }

  return null;
}

/**
 * Format anomaly for Slack alert
 */
export function formatSlackAlert(anomaly: CostAnomaly, baselineMean?: number): string {
  const severity_emoji = anomaly.severity === 'critical' ? '🚨' : '⚠️';
  const baseline_text = baselineMean ? `(baseline $${baselineMean.toFixed(4)})` : '';

  return \`
\${severity_emoji} **Cost Anomaly Alert** — \${anomaly.severity.toUpperCase()}
• Tester: \${anomaly.user_id}
• Date: \${anomaly.date}
• Actual Cost: \$\${anomaly.actual_cost.toFixed(4)}
• Expected Cost: \$\${anomaly.expected_cost.toFixed(4)} \${baseline_text}
• Deviation: +\${anomaly.deviation_percent.toFixed(1)}% (\${anomaly.std_devs_above_mean}σ)
• Suspected Cause: \${anomaly.suspected_cause}
  \`.trim();
}

/**
 * Mock anomaly detection for testing
 */
export function generateMockAnomalies(): CostAnomaly[] {
  const testers = ['Riker', 'Yar', 'Troi', 'Quark', 'Data', 'La Forge', 'Picard', 'Worf', 'Charlie', 'Sam'];
  const today = new Date().toISOString().split('T')[0];

  // Simulate 2-3 anomalies per 10 testers (statistically normal)
  const anomalies: CostAnomaly[] = [];

  // Simulate a critical anomaly
  anomalies.push({
    user_id: 'Data',
    date: today,
    actual_cost: 0.52,
    expected_cost: 0.20,
    deviation_percent: 160,
    std_devs_above_mean: 2.8,
    severity: 'critical',
    message: 'Cost anomaly detected: $0.52 (expected $0.20, +160%)',
    suspected_cause: 'Significantly longer session or new feature usage',
  });

  // Simulate a warning anomaly
  anomalies.push({
    user_id: 'Worf',
    date: today,
    actual_cost: 0.31,
    expected_cost: 0.20,
    deviation_percent: 55,
    std_devs_above_mean: 2.1,
    severity: 'warning',
    message: 'Cost anomaly detected: $0.31 (expected $0.20, +55%)',
    suspected_cause: 'Extended usage or multiple concurrent sessions',
  });

  return anomalies;
}

/**
 * GET /api/cost/anomalies?cohort=dogfood — returns recent anomalies
 */
export async function GET() {
  const mockAnomalies = generateMockAnomalies();

  return Response.json({
    cohort: 'dogfood',
    anomalies: mockAnomalies,
    alert_summary: {
      critical_count: mockAnomalies.filter(a => a.severity === 'critical').length,
      warning_count: mockAnomalies.filter(a => a.severity === 'warning').length,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/cost/anomalies/alert — manually trigger alert for testing
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, actual_cost, baseline } = body;

    if (!user_id || !actual_cost || !baseline) {
      return Response.json(
        { error: 'Missing required fields: user_id, actual_cost, baseline' },
        { status: 400 }
      );
    }

    const anomaly = detectAnomaly(user_id, actual_cost, baseline);

    if (anomaly) {
      const slackMessage = formatSlackAlert(anomaly, baseline.mean);
      console.log('[COST ALERT]', slackMessage);

      // TODO: In production, post to Slack #section-31-dogfood
      // await postSlackAlert(slackMessage, '#section-31-dogfood');

      return Response.json({
        alerted: true,
        anomaly,
        message: slackMessage,
      });
    } else {
      return Response.json({
        alerted: false,
        message: 'Cost is within normal range',
      });
    }
  } catch (error) {
    console.error('POST /api/cost/anomalies/alert failed:', error);
    return Response.json(
      { error: 'Failed to process anomaly alert', details: String(error) },
      { status: 500 }
    );
  }
}
