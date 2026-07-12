/**
 * CrewStatusWidget — Real-Time Status Display (WORKSTREAM 3)
 *
 * Displays active crew tasks in real time on the dashboard home page.
 * Polls /api/crew/execution-status every 500ms for live updates.
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
  unknown: '👤',
};

export function CrewStatusWidget() {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleUpdates, setVisibleUpdates] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/crew/execution-status?limit=10');
        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();
        if (data.success) {
          setStatus(data);
          setError(null);

          // Track new updates for fade-out effect
          const newTaskIds = [
            ...data.active_tasks,
            ...data.completed_tasks,
          ].map((t: any) => `${t.crew_id}_${t.task}`);

          setVisibleUpdates(prev => {
            const updated = [...new Set([...newTaskIds, ...prev])];
            return updated.slice(0, 5); // Keep max 5 visible
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 500);
    return () => clearInterval(interval);
  }, []);

  if (!status || loading) {
    return (
      <div className="p-4 bg-gray-900 rounded border border-blue-500 text-blue-400 text-sm">
        Loading crew status...
      </div>
    );
  }

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-900 text-green-300';
      case 'blocked':
      case 'failed':
        return 'bg-red-900 text-red-300';
      case 'retry':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const crewEmoji = (crewId: string) => {
    return (
      CREW_EMOJIS[crewId.toLowerCase()] ||
      CREW_EMOJIS[Object.keys(CREW_EMOJIS)[0]]
    );
  };

  return (
    <div className="space-y-4">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-blue-900 p-3 rounded border border-blue-600">
          <div className="text-blue-300">Tasks Today</div>
          <div className="text-xl font-bold text-blue-100">
            {status.aggregate.today_count}
          </div>
        </div>
        <div className="bg-green-900 p-3 rounded border border-green-600">
          <div className="text-green-300">Success Rate</div>
          <div className="text-xl font-bold text-green-100">
            {(status.aggregate.today_success_rate * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-purple-900 p-3 rounded border border-purple-600">
          <div className="text-purple-300">Cost</div>
          <div className="text-xl font-bold text-purple-100">
            ${status.aggregate.today_cost_usd.toFixed(2)}
          </div>
        </div>
        <div className="bg-yellow-900 p-3 rounded border border-yellow-600">
          <div className="text-yellow-300">Active</div>
          <div className="text-xl font-bold text-yellow-100">
            {status.aggregate.active_tasks_count}
          </div>
        </div>
      </div>

      {/* Active Tasks */}
      {status.active_tasks.length > 0 && (
        <div className="bg-gray-800 p-4 rounded border border-yellow-500">
          <h3 className="text-yellow-400 font-bold mb-2 text-sm">
            🟡 In Progress ({status.active_tasks.length})
          </h3>
          <div className="space-y-2">
            {status.active_tasks.map((task, i) => (
              <div
                key={i}
                className="text-xs bg-gray-700 p-2 rounded flex justify-between items-center"
              >
                <div>
                  <span className="text-lg mr-2">{crewEmoji(task.crew_id)}</span>
                  <span className="text-gray-300">{task.task.substring(0, 40)}</span>
                </div>
                <div className="text-yellow-300">
                  {task.elapsed_seconds}s / {task.progress_step}/4
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed Tasks */}
      {status.completed_tasks.length > 0 && (
        <div className="bg-gray-800 p-4 rounded border border-green-500">
          <h3 className="text-green-400 font-bold mb-2 text-sm">
            ✅ Completed ({status.completed_tasks.length})
          </h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {status.completed_tasks.slice(0, 3).map((task, i) => (
              <div key={i} className="text-xs bg-gray-700 p-2 rounded">
                <div className="flex justify-between">
                  <div>
                    <span className="text-lg mr-2">{crewEmoji(task.crew_id)}</span>
                    <span className={statusBadgeColor(task.status)}>
                      {task.status === 'success' ? '✓' : '✗'}
                    </span>
                    <span className="text-gray-300 ml-2">
                      {task.task.substring(0, 35)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {task.duration_seconds.toFixed(1)}s
                  </span>
                </div>
                {task.error && (
                  <div className="text-red-400 text-xs mt-1">
                    Error: {task.error.substring(0, 50)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900 p-3 rounded border border-red-600 text-red-300 text-xs">
          Error: {error}
        </div>
      )}

      {/* Empty State */}
      {status.active_tasks.length === 0 &&
        status.completed_tasks.length === 0 && (
          <div className="bg-gray-900 p-4 rounded border border-gray-700 text-gray-400 text-sm text-center">
            🖖 Crew is ready. No tasks in progress.
          </div>
        )}
    </div>
  );
}
