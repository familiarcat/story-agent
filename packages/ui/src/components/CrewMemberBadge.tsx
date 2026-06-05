/**
 * CrewMemberBadge - Display a single crew member's execution status
 */

'use client';

import type { CrewMemberExecution } from '@story-agent/shared';

interface CrewMemberBadgeProps {
  execution: CrewMemberExecution;
}

export function CrewMemberBadge({ execution }: CrewMemberBadgeProps) {
  const getStatusColor = (status: CrewMemberExecution['status']): string => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'executing':
        return 'bg-blue-100 text-blue-700 animate-pulse';
      case 'complete':
        return 'bg-green-100 text-green-700';
      case 'vetoed':
        return 'bg-red-100 text-red-700';
      case 'error':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: CrewMemberExecution['status']): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'executing':
        return '🔄';
      case 'complete':
        return '✅';
      case 'vetoed':
        return '🛑';
      case 'error':
        return '⚠️';
      default:
        return '❓';
    }
  };

  return (
    <div className={`px-3 py-2 rounded text-sm font-medium ${getStatusColor(execution.status)}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>{getStatusIcon(execution.status)}</span>
          <span>{execution.crewName}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {execution.confidence !== undefined && (
            <span>Confidence: {execution.confidence}%</span>
          )}
          {execution.isVeto && <span className="font-bold">VETO</span>}
        </div>
      </div>
      {execution.findings && (
        <div className="mt-1 text-xs opacity-75 line-clamp-2">{execution.findings}</div>
      )}
      {execution.costUsd !== undefined && (
        <div className="mt-1 text-xs opacity-50">💰 ${execution.costUsd.toFixed(4)}</div>
      )}
    </div>
  );
}
