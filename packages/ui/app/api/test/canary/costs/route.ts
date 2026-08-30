/**
 * QUARK Workstream: Cost Monitoring (SIMULATED)
 *
 * GET /api/test/canary/costs
 * Returns synthetic cost data with anomaly detection
 *
 * Response: { status, daily_total, mean, std_dev, threshold_current, alert_status }
 */

export async function GET() {
  try {
    // Synthetic cost data (baseline $0.78/user/day for 6,000 users)
    const baselineCostPerUser = 0.78;
    const totalUsers = 6000;
    const baselineDailyTotal = baselineCostPerUser * totalUsers;

    // Generate realistic 5-day history
    const dailyCosts = [
      baselineDailyTotal,           // Day 1: $4,680
      baselineDailyTotal + 20,      // Day 2: $4,700
      baselineDailyTotal + 40,      // Day 3: $4,720
      baselineDailyTotal + 20,      // Day 4: $4,700
      baselineDailyTotal,           // Day 5: $4,680
    ];

    const mean = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
    const variance = dailyCosts.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / dailyCosts.length;
    const stdDev = Math.sqrt(variance);

    // Thresholds
    const thresholds = {
      GREEN_MAX: mean + stdDev,
      YELLOW_MIN: mean + stdDev,
      YELLOW_MAX: mean + 2 * stdDev,
      RED_MIN: mean + 2 * stdDev,
    };

    // Current cost (simulate today)
    const currentCost = dailyCosts[dailyCosts.length - 1];

    // Determine alert status
    let alertStatus = 'GREEN';
    if (currentCost > thresholds.RED_MIN) alertStatus = 'RED';
    else if (currentCost > thresholds.YELLOW_MIN) alertStatus = 'YELLOW';

    console.log(`[TEST::QUARK] Cost monitoring check:
      baseline: $${baselineDailyTotal.toFixed(2)}/day
      current: $${currentCost.toFixed(2)}
      mean: $${mean.toFixed(2)}
      std_dev: $${stdDev.toFixed(2)}
      thresholds: GREEN ≤ $${thresholds.GREEN_MAX.toFixed(2)}, YELLOW $${thresholds.YELLOW_MIN.toFixed(2)}-$${thresholds.YELLOW_MAX.toFixed(2)}, RED > $${thresholds.RED_MIN.toFixed(2)}
      status: ${alertStatus}
      timestamp: ${new Date().toISOString()}
    `);

    return Response.json(
      {
        status: alertStatus,
        daily_total: currentCost.toFixed(2),
        mean: mean.toFixed(2),
        std_dev: stdDev.toFixed(2),
        thresholds,
        alert_status: alertStatus,
        synthetic_data: true,
        environment: 'test',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[TEST::QUARK] Error:', error);
    return Response.json(
      { error: 'Failed to retrieve cost data', details: String(error) },
      { status: 500 }
    );
  }
}
