/**
 * Page: /crew/status
 * Full-screen crew execution status dashboard
 *
 * WORKSTREAM 3: Real-Time Status Display
 */

'use client';

import { useEffect, useState } from 'react';

interface ExecutionOutcome {
  crew_id: string;
  attempt_id: string;
  task_description: string;
  status: string;
  duration_seconds: number;
  confidence_level: string;
  timestamp: string;
  error_message?: string;
}

interface ExecutionStatus {
  active_tasks: Array<{
    crew_id: string;
    task: string;
    status: string;
    elapsed_seconds: number;
    progress_step: number;
  }>;
  completed_tasks: Array<{
    crew_id: string;
    task: string;
    status: string;
    duration_seconds: number;
    confidence: string;
    error?: string;
  }>;
  recent_outcomes: ExecutionOutcome[];
  aggregate: {
    today_count: number;
    today_success_rate: number;
    today_cost_usd: number;
    active_tasks_count: number;
  };
}

const CREW_EMOJIS: { [key: string]: string } = {
  picard: '🖖',
  riker: '💼',
  data: '🤖',
  geordi: '🔧',
  worf: '⚔️',
  quark: '💰',
  troi: '💭',
  crusher: '⚕️',
  guinan: '🍷',
  laforge: '⚙️',
};

export default function CrewStatusPage() {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/crew/execution-status?limit=50');
        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();
        if (data.success) {
          setStatus(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to load status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = autoRefresh ? setInterval(fetchStatus, 500) : undefined;
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="p-8 bg-black text-blue-400">
        <div className="text-2xl font-bold">🖖 Crew Status</div>
        <div className="mt-4 text-blue-300">Loading...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-8 bg-black text-red-400">
        <div className="text-2xl font-bold">Error</div>
        <div className="mt-4">{error || 'Unknown error'}</div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-900 text-green-300 border-green-600';
      case 'failed':
        return 'bg-red-900 text-red-300 border-red-600';
      case 'blocked':
        return 'bg-orange-900 text-orange-300 border-orange-600';
      case 'retry':
        return 'bg-yellow-900 text-yellow-300 border-yellow-600';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-600';
    }
  };

  const crewEmoji = (crewId: string) => {
    return (
      CREW_EMOJIS[crewId.toLowerCase()] || CREW_EMOJIS['picard']
    );
  };

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-300">🖖 Crew Execution Status</h1>
          <p className="text-gray-400 mt-2">Real-time task execution monitoring</p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded border ${
            autoRefresh
              ? 'bg-green-900 border-green-600 text-green-300'
              : 'bg-gray-700 border-gray-600 text-gray-300'
          }`}
        >
          {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-900 p-6 rounded border border-blue-600">
          <div className="text-blue-300 text-sm">Tasks Today</div>
          <div className="text-4xl font-bold text-blue-100 mt-2">
            {status.aggregate.today_count}
          </div>
        </div>
        <div className="bg-green-900 p-6 rounded border border-green-600">
          <div className="text-green-300 text-sm">Success Rate</div>
          <div className="text-4xl font-bold text-green-100 mt-2">
            {(status.aggregate.today_success_rate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-purple-900 p-6 rounded border border-purple-600">
          <div className="text-purple-300 text-sm">Cost Today</div>
          <div className="text-4xl font-bold text-purple-100 mt-2">
            ${status.aggregate.today_cost_usd.toFixed(2)}
          </div>
        </div>
        <div className="bg-yellow-900 p-6 rounded border border-yellow-600">
          <div className="text-yellow-300 text-sm">Active Tasks</div>
          <div className="text-4xl font-bold text-yellow-100 mt-2">
            {status.aggregate.active_tasks_count}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 p-4 rounded mb-6">
          Error: {error}
        </div>
      )}

      {/* Active Tasks */}
      {status.active_tasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">
            🟡 In Progress ({status.active_tasks.length})
          </h2>
          <div className="grid gap-4">
            {status.active_tasks.map((task, i) => (
              <div
                key={i}
                className="bg-gray-800 border border-yellow-600 p-4 rounded flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{crewEmoji(task.crew_id)}</span>
                    <span className="font-semibold text-white text-lg">
                      {task.crew_id.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-300">{task.task}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Progress: {task.progress_step}/4 ({task.elapsed_seconds}s elapsed)
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-yellow-900 px-3 py-1 rounded text-yellow-300 text-sm">
                    {task.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks Table */}
      {status.recent_outcomes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-green-400 mb-4">
            ✅ Recent Outcomes (Last 20)
          </h2>
          <div className="overflow-x-auto bg-gray-900 rounded border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-4 py-3 text-left text-gray-300">Crew Member</th>
                  <th className="px-4 py-3 text-left text-gray-300">Task</th>
                  <th className="px-4 py-3 text-center text-gray-300">Status</th>
                  <th className="px-4 py-3 text-right text-gray-300">Duration (s)</th>
                  <th className="px-4 py-3 text-center text-gray-300">Confidence</th>
                  <th className="px-4 py-3 text-left text-gray-300">Time</th>
                </tr>
              </thead>
              <tbody>
                {status.recent_outcomes.slice(0, 20).map((outcome, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-700 hover:bg-gray-800 ${
                      outcome.status === 'success'
                        ? 'bg-green-950'
                        : outcome.status === 'failed'
                          ? 'bg-red-950'
                          : 'bg-gray-900'
                    }`}
                  >
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span className="text-lg">{crewEmoji(outcome.crew_id)}</span>
                      <span className="text-gray-200">
                        {outcome.crew_id.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {outcome.task_description.substring(0, 50)}...
                    </td>
                    <td className={`px-4 py-3 text-center ${statusColor(outcome.status)}`}>
                      <span className="px-2 py-1 rounded">
                        {outcome.status === 'success'
                          ? '✓'
                          : outcome.status === 'failed'
                            ? '✗'
                            : '→'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {outcome.duration_seconds.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          outcome.confidence_level === 'high'
                            ? 'text-green-400'
                            : outcome.confidence_level === 'medium'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }
                      >
                        {outcome.confidence_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(outcome.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {status.active_tasks.length === 0 && status.recent_outcomes.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 p-8 rounded text-center text-gray-400">
          🖖 Crew is ready. No execution history yet.
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-700 text-gray-500 text-xs">
        <div>Last updated: {new Date().toLocaleTimeString()}</div>
        <div>Auto-refresh: {autoRefresh ? 'ON (500ms)' : 'OFF'}</div>
      </div>
    </div>
  );
}
