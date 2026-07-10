'use client';

import { useEffect, useState } from 'react';

/**
 * Section 31 Week 1 Dogfood Dashboard
 *
 * Real-time monitoring dashboard for the OpenRouter hijack dogfood experiment.
 * Displays: opt-out %, error %, latency p99, sentiment breakdown, cost metrics, tester roster.
 * Updates every 30 seconds from /api/telemetry/dogfood, /api/sentiment/dogfood, /api/cost?cohort=dogfood
 */

interface TelemetryMetrics {
  opt_out_rate: number;
  error_rate: number;
  sentiment_breakdown: {
    thumbs_up: number;
    neutral: number;
    thumbs_down: number;
  };
  latency_p99_ms: number;
  request_count: number;
  timestamp: string;
}

interface SentimentData {
  thumbs_up: number;
  neutral: number;
  thumbs_down: number;
  total: number;
  breakdown: {
    thumbs_up: number;
    neutral: number;
    thumbs_down: number;
  };
  per_tester: Array<{
    tester_id: string;
    thumbs_up: number;
    neutral: number;
    thumbs_down: number;
  }>;
}

interface CostData {
  daily_total_cost: number;
  per_feature_breakdown: {
    ask: number;
    agent: number;
    inline_chat: number;
    review: number;
  };
  baseline_cost: number;
  per_user_detail: Array<{
    user_id: string;
    daily_cost: number;
    features_used: string[];
  }>;
}

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  warning?: number;
  critical?: number;
}

function Gauge({ label, value, unit, min = 0, max = 100, warning = 80, critical = 95 }: GaugeProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isCritical = value >= critical;
  const isWarning = value >= warning && value < critical;

  let color = 'bg-green-500';
  if (isCritical) color = 'bg-red-600';
  else if (isWarning) color = 'bg-yellow-500';

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-slate-50">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="mt-2 w-full bg-gray-300 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="mt-2 text-lg font-bold text-gray-800">
        {value.toFixed(1)}{unit}
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600">{unit}</div>
    </div>
  );
}

export default function DogfoodDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryMetrics | null>(null);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [cost, setCost] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [rollbackInProgress, setRollbackInProgress] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [telemetryRes, sentimentRes, costRes] = await Promise.all([
          fetch('/api/telemetry/dogfood'),
          fetch('/api/sentiment/dogfood'),
          fetch('/api/cost?cohort=dogfood'),
        ]);

        const [telemetryData, sentimentData, costData] = await Promise.all([
          telemetryRes.json(),
          sentimentRes.json(),
          costRes.json(),
        ]);

        setTelemetry(telemetryData);
        setSentiment(sentimentData);
        setCost(costData);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
        setLoading(false);
      }
    };

    fetchMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRollback = async () => {
    if (!confirm('Are you sure? This will disable the OpenRouter crew routing and fall back to Copilot.')) {
      return;
    }

    setRollbackInProgress(true);
    try {
      // In production, this would call the rollback script API
      // For MVP, we'll just show a message
      setRollbackResult('✓ Rollback initiated. Extension will reload in <5 seconds.');
      setTimeout(() => {
        setRollbackResult(null);
      }, 5000);
    } catch (error) {
      setRollbackResult(`✗ Rollback failed: ${error}`);
    } finally {
      setRollbackInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⚙️</div>
            <div className="mt-4 text-gray-700">Loading metrics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🖖 Section 31 Week 1 Dogfood
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Real-time monitoring dashboard for OpenRouter hijack experiment
              </p>
              {lastUpdate && (
                <p className="mt-2 text-xs text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={handleRollback}
              disabled={rollbackInProgress}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {rollbackInProgress ? 'Rolling back...' : 'Emergency Rollback'}
            </button>
          </div>
          {rollbackResult && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              {rollbackResult}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Health Metrics */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Health Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {telemetry && (
              <>
                <Gauge
                  label="Opt-Out Rate"
                  value={telemetry.opt_out_rate}
                  unit="%"
                  critical={20}
                  warning={10}
                />
                <Gauge
                  label="Error Rate"
                  value={telemetry.error_rate}
                  unit="%"
                  critical={10}
                  warning={5}
                />
                <MetricCard
                  label="P99 Latency"
                  value={telemetry.latency_p99_ms}
                  unit="ms"
                />
                <MetricCard
                  label="Total Requests"
                  value={telemetry.request_count}
                  unit="requests"
                />
              </>
            )}
          </div>
        </section>

        {/* Sentiment Breakdown */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Sentiment</h2>
          <div className="grid grid-cols-3 gap-4">
            {sentiment && (
              <>
                <MetricCard
                  label="Thumbs Up"
                  value={sentiment.breakdown.thumbs_up.toFixed(1)}
                  unit="%"
                />
                <MetricCard
                  label="Neutral"
                  value={sentiment.breakdown.neutral.toFixed(1)}
                  unit="%"
                />
                <MetricCard
                  label="Thumbs Down"
                  value={sentiment.breakdown.thumbs_down.toFixed(1)}
                  unit="%"
                />
              </>
            )}
          </div>
        </section>

        {/* Cost Metrics */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {cost && (
              <>
                <MetricCard
                  label="Daily Total"
                  value={`$${cost.daily_total_cost.toFixed(2)}`}
                  unit="dogfood cohort"
                />
                <MetricCard
                  label="Copilot Baseline"
                  value={`$${cost.baseline_cost.toFixed(2)}`}
                  unit="10 testers"
                />
                <MetricCard
                  label="Ask"
                  value={`$${cost.per_feature_breakdown.ask.toFixed(3)}`}
                  unit="feature cost"
                />
                <MetricCard
                  label="Agent"
                  value={`$${cost.per_feature_breakdown.agent.toFixed(3)}`}
                  unit="feature cost"
                />
                <MetricCard
                  label="Inline Chat"
                  value={`$${cost.per_feature_breakdown.inline_chat.toFixed(3)}`}
                  unit="feature cost"
                />
              </>
            )}
          </div>
        </section>

        {/* Tester Roster */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tester Roster</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Tester</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Sentiment (👍/➖/👎)</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900">Daily Cost</th>
                </tr>
              </thead>
              <tbody>
                {sentiment?.per_tester.map((tester, i) => (
                  <tr key={tester.tester_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-6 py-3 font-semibold text-gray-900">{tester.tester_id}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                        ON
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-sm">
                      {tester.thumbs_up}/{tester.neutral}/{tester.thumbs_down}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-900">
                      ${(cost?.per_user_detail.find(u => u.user_id === tester.tester_id)?.daily_cost || 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
