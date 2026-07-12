/**
 * GET /api/cost/anomalies — Cost Anomaly Detection Results
 * POST /api/cost/anomalies/trigger-test — Manual test trigger for development
 *
 * Section 31 Week 1 QUARK Task 4.3
 */

// Type: Cost anomaly detection result
interface CostAnomaly {
  user_id: string;
  date: string;
  actual_cost: number;
  expected_cost: number;
  deviation_percent: number;
  std_devs_above_mean: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suspected_cause: string;
}

// Mock anomaly generator for UI testing
function generateMockAnomalies(): CostAnomaly[] {
  return [
    {
      user_id: 'user-001',
      date: new Date().toISOString().split('T')[0],
      actual_cost: 0.25,
      expected_cost: 0.20,
      deviation_percent: 25,
      std_devs_above_mean: 1.5,
      severity: 'warning',
      message: 'Cost slightly elevated: $0.25 (expected $0.20, +25%)',
      suspected_cause: 'Longer conversation than average',
    },
  ];
}

// Slack alert formatter
function formatSlackAlert(anomaly: CostAnomaly, baseline: number): string {
  return `[${anomaly.severity.toUpperCase()}] ${anomaly.message} | Cause: ${anomaly.suspected_cause}`;
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cohort = url.searchParams.get('cohort') || 'dogfood';
  const hoursBack = parseInt(url.searchParams.get('hours') || '24');

  try {
    // MVP: return mock anomalies
    // In production: query database for real cost data, calculate baselines, detect anomalies
    const anomalies = generateMockAnomalies();

    return Response.json(
      {
        cohort,
        time_window_hours: hoursBack,
        anomalies,
        summary: {
          total_anomalies: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length,
          warning: anomalies.filter(a => a.severity === 'warning').length,
          alerts_sent: anomalies.length,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'max-age=300, s-maxage=300', // 5-min cache
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/cost/anomalies failed:', error);
    return Response.json(
      { error: 'Failed to fetch cost anomalies', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Test action: trigger a mock alert for testing
    if (action === 'trigger-test-alert') {
      const testAnomaly: CostAnomaly = {
        user_id: 'Data',
        date: new Date().toISOString().split('T')[0],
        actual_cost: 0.48,
        expected_cost: 0.20,
        deviation_percent: 140,
        std_devs_above_mean: 2.5,
        severity: 'critical',
        message: 'Cost anomaly detected: $0.48 (expected $0.20, +140%)',
        suspected_cause: 'Extended session duration with high-token-cost operations',
      };

      const slackMessage = formatSlackAlert(testAnomaly, 0.20);
      console.log('[TEST ALERT TRIGGERED]', slackMessage);

      return Response.json({
        triggered: true,
        anomaly: testAnomaly,
        slack_message: slackMessage,
        note: 'This is a test alert. In production, this would be posted to #section-31-dogfood',
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/cost/anomalies failed:', error);
    return Response.json(
      { error: 'Failed to process anomaly request', details: String(error) },
      { status: 500 }
    );
  }
}
