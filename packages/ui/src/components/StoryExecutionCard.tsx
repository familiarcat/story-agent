/**
 * StoryExecutionCard - Display story with real-time crew execution state
 */

'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { CrewMemberBadge } from './CrewMemberBadge';
import type { StoryRecord } from '@story-agent/shared';

interface StoryExecutionCardProps {
  story: StoryRecord;
}

export function StoryExecutionCard({ story }: StoryExecutionCardProps) {
  const { state, isConnected, isLoading, error } = useWebSocket(story.storyId);

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{story.storyId}: {story.storyTitle}</h3>
          </div>
        </div>
        <div className="mt-4 text-center text-gray-500">Loading crew state...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <h3 className="font-semibold text-lg text-red-900">{story.storyId}: {story.storyTitle}</h3>
        <div className="mt-2 text-sm text-red-700">Error: {error}</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <h3 className="font-semibold text-lg">{story.storyId}: {story.storyTitle}</h3>
        <div className="mt-4 text-gray-500 text-sm">Crew not started yet</div>
      </div>
    );
  }

  const getPhaseColor = (phase: string): string => {
    switch (phase) {
      case 'phase_1_execution':
        return 'bg-blue-50 border-blue-200';
      case 'phase_2_revision':
        return 'bg-amber-50 border-amber-200';
      case 'complete':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusEmoji = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '🔄';
      case 'blocked':
        return '🛑';
      case 'complete':
        return '🎉';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const progressPercent = 
    state.crewExecutions.length > 0
      ? Math.round(
          (state.crewExecutions.filter(c => c.status === 'complete').length / 
            state.crewExecutions.length) * 100
        )
      : 0;

  return (
    <div 
      className={`border rounded-lg p-4 shadow-sm transition-all ${getPhaseColor(state.phase)}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{story.storyId}</h3>
          <p className="text-sm text-gray-600">{story.storyTitle}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl">{getStatusEmoji(state.status)}</div>
          <div className="text-xs text-gray-500 capitalize">{state.phase.replace(/_/g, ' ')}</div>
        </div>
      </div>

      {/* Next Step */}
      <div className="mb-3 p-2 bg-white bg-opacity-50 rounded text-sm font-medium">
        {state.nextStep}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Crew Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Crew Members Grid */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {state.crewExecutions.map(execution => (
          <CrewMemberBadge key={execution.crewId} execution={execution} />
        ))}
      </div>

      {/* Blockers */}
      {state.blockers && state.blockers.length > 0 && (
        <div className="mb-2 p-2 bg-red-100 rounded text-sm text-red-800">
          <strong>Blockers:</strong>
          <ul className="mt-1 list-disc list-inside">
            {state.blockers.map((blocker, idx) => (
              <li key={idx}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata Footer */}
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>💰 ${state.totalCostUsd.toFixed(4)}</span>
        <span>⏱️ {Math.round(state.totalExecutionTimeMs / 1000)}s</span>
        <span>🔄 {state.broadcastCount} updates</span>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mt-2 text-xs text-orange-600 font-medium">
          ⚠️ WebSocket disconnected (updates may be delayed)
        </div>
      )}
    </div>
  );
}
