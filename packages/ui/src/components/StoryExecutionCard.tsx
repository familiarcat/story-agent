/**
 * StoryExecutionCard - Display story with real-time crew execution state
 */

'use client';

import type { CSSProperties } from 'react';
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
      <div className="card">
        <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3>{story.storyId}: {story.storyTitle}</h3>
          </div>
        </div>
        <div className="meta" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>Loading crew state...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          borderColor: 'var(--danger)',
          background: 'color-mix(in srgb, var(--danger) 12%, var(--surface))',
        }}
      >
        <h3 style={{ color: 'var(--danger)' }}>{story.storyId}: {story.storyTitle}</h3>
        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="card">
        <h3>{story.storyId}: {story.storyTitle}</h3>
        <div className="meta" style={{ marginTop: 'var(--space-4)' }}>Crew not started yet</div>
      </div>
    );
  }

  const getPhaseColor = (phase: string): CSSProperties => {
    switch (phase) {
      case 'phase_1_execution':
        return {
          background: 'color-mix(in srgb, var(--accent4) 12%, var(--surface))',
          borderColor: 'var(--accent4)',
        };
      case 'phase_2_revision':
        return {
          background: 'color-mix(in srgb, var(--warn) 12%, var(--surface))',
          borderColor: 'var(--warn)',
        };
      case 'complete':
        return {
          background: 'color-mix(in srgb, var(--ok) 12%, var(--surface))',
          borderColor: 'var(--ok)',
        };
      default:
        return { background: 'var(--surface)', borderColor: 'var(--border)' };
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
    <div className="card" style={{ transition: 'all 0.15s ease', ...getPhaseColor(state.phase) }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div>
          <h3>{story.storyId}</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)' }}>{story.storyTitle}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-2xl)' }}>{getStatusEmoji(state.status)}</div>
          <div className="meta" style={{ textTransform: 'capitalize' }}>{state.phase.replace(/_/g, ' ')}</div>
        </div>
      </div>

      {/* Next Step */}
      <div
        style={{
          marginBottom: 'var(--space-3)',
          padding: 'var(--space-2)',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}
      >
        {state.nextStep}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div
          className="meta"
          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}
        >
          <span>Crew Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div
          style={{
            width: '100%',
            background: 'var(--surface-2)',
            borderRadius: '9999px',
            height: 'var(--space-2)',
          }}
        >
          <div
            style={{
              background: 'var(--ok)',
              height: 'var(--space-2)',
              borderRadius: '9999px',
              transition: 'all 0.15s ease',
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Crew Members Grid */}
      <div
        style={{
          marginBottom: 'var(--space-3)',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 'var(--space-2)',
        }}
      >
        {state.crewExecutions.map(execution => (
          <CrewMemberBadge key={execution.crewId} execution={execution} />
        ))}
      </div>

      {/* Blockers */}
      {state.blockers && state.blockers.length > 0 && (
        <div
          style={{
            marginBottom: 'var(--space-2)',
            padding: 'var(--space-2)',
            background: 'color-mix(in srgb, var(--danger) 18%, var(--surface))',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            color: 'var(--danger)',
          }}
        >
          <strong>Blockers:</strong>
          <ul style={{ marginTop: 'var(--space-1)', listStyle: 'disc inside' }}>
            {state.blockers.map((blocker, idx) => (
              <li key={idx}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata Footer */}
      <div
        className="meta"
        style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>💰 ${state.totalCostUsd.toFixed(4)}</span>
        <span>⏱️ {Math.round(state.totalExecutionTimeMs / 1000)}s</span>
        <span>🔄 {state.broadcastCount} updates</span>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div
          style={{
            marginTop: 'var(--space-2)',
            fontSize: 'var(--text-xs)',
            color: 'var(--warn)',
            fontWeight: 500,
          }}
        >
          ⚠️ WebSocket disconnected (updates may be delayed)
        </div>
      )}
    </div>
  );
}
