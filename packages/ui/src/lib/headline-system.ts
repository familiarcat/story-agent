/**
 * Functional headline taxonomy (Troi-led arbitration layer).
 *
 * Purpose:
 * - Keep UI language operationally clear (method) while preserving LCARS tone (art).
 * - Provide a single naming contract screens can reuse.
 */

export const headlineSystem = {
  panels: {
    laneSnapshot: 'Lane State Snapshot',
    modelDistribution: 'Model Spend Distribution',
    recentEvents: 'Recent Cost Events',
    signalLost: 'Signal Disruption',
  },
  stats: {
    crewCostUsd: 'Crew Cost (USD)',
    crewDecisionCount: 'Crew Decisions (Count)',
    delegationRatePct: 'Delegation Rate (%)',
    totalCostTurns: (turns: number) => `Total Cost (${turns} Turns)`,
    savingsVsBaseline: (baselineModel: string) => `Savings vs Baseline (${baselineModel})`,
    tokenThroughput: 'Token Throughput (In/Out)',
  },
  scenarios: {
    observedState: 'Observed State',
    efficiencyStepUp: 'Efficiency Step-Up',
    operatingTarget: 'Operating Target',
    stressEnvelope: 'Stress-Test Envelope',
  },
  arbitration: {
    owner: 'Troi',
    principle: 'Questions and final wording converge through empathy + operational clarity.',
  },
} as const;

export function normalizeModelLabel(model: string): string {
  const short = model.split('/')[1] ?? model;
  return short.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
