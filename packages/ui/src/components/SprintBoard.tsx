/**
 * Sprint Board - Main PM view showing all stories in current sprint
 *
 * Key metrics:
 * - Sprint progress (velocity tracking)
 * - Story status at a glance
 * - Crew execution state for each story
 * - Timeline and budget risks
 * - Blockers and decisions pending
 */

'use client';

import React, { useEffect, useState } from 'react';
import type { AgileSprint } from '@story-agent/shared';

interface SprintBoardProps {
  projectId: string;
  sprintId?: string;
}

interface StoryCardData {
  id: string;
  title: string;
  status: 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'complete' | 'blocked';
  assignee: string;
  points: number;
  dueDate: string;
  crewProgress: number; // 0-100% of crew members done
  blockers: string[];
  hasDecisionPending: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const statusColors: Record<StoryCardData['status'], React.CSSProperties> = {
  backlog: { background: 'var(--surface-2)', borderLeftColor: 'var(--border)' },
  ready: {
    background: 'color-mix(in srgb, var(--accent4) 12%, var(--surface))',
    borderLeftColor: 'var(--accent4)',
  },
  in_progress: {
    background: 'color-mix(in srgb, var(--warn) 12%, var(--surface))',
    borderLeftColor: 'var(--warn)',
  },
  in_review: {
    background: 'color-mix(in srgb, var(--accent3) 12%, var(--surface))',
    borderLeftColor: 'var(--accent3)',
  },
  complete: {
    background: 'color-mix(in srgb, var(--ok) 12%, var(--surface))',
    borderLeftColor: 'var(--ok)',
  },
  blocked: {
    background: 'color-mix(in srgb, var(--danger) 18%, var(--surface))',
    borderLeftColor: 'var(--danger)',
  },
};

const statusLabels = {
  backlog: '📋',
  ready: '✅',
  in_progress: '🔄',
  in_review: '👀',
  complete: '🎉',
  blocked: '🛑',
};

export function SprintBoard({ projectId, sprintId }: SprintBoardProps) {
  const [sprint, setSprint] = useState<AgileSprint | null>(null);
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sprintStats, setSprintStats] = useState({
    totalPoints: 0,
    completedPoints: 0,
    inProgressPoints: 0,
    blockedPoints: 0,
    velocity: 0,
    daysRemaining: 0,
  });

  useEffect(() => {
    const fetchSprintData = async () => {
      try {
        const [sprintRes, storiesRes] = await Promise.all([
          fetch(`/api/agile/sprints/${sprintId || 'current'}?projectId=${projectId}`),
          fetch(`/api/agile/stories?projectId=${projectId}&sprintId=${sprintId || 'current'}`),
        ]);

        if (sprintRes.ok) {
          const sprintData = await sprintRes.json();
          setSprint(sprintData.sprint);
        }

        if (storiesRes.ok) {
          const storiesData = await storiesRes.json();
          setStories(storiesData.stories);
          calculateStats(storiesData.stories);
        }
      } catch (err) {
        console.error('Error fetching sprint data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSprintData();
    const interval = setInterval(fetchSprintData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [projectId, sprintId]);

  const calculateStats = (stories: StoryCardData[]) => {
    const stats = stories.reduce(
      (acc, story) => ({
        ...acc,
        totalPoints: acc.totalPoints + story.points,
        completedPoints:
          acc.completedPoints + (story.status === 'complete' ? story.points : 0),
        inProgressPoints:
          acc.inProgressPoints + (story.status === 'in_progress' ? story.points : 0),
        blockedPoints:
          acc.blockedPoints + (story.status === 'blocked' ? story.points : 0),
      }),
      { totalPoints: 0, completedPoints: 0, inProgressPoints: 0, blockedPoints: 0 }
    );

    const daysRemaining = sprint?.endDate
      ? Math.ceil(
          (new Date(sprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    setSprintStats({
      ...stats,
      velocity: stats.completedPoints,
      daysRemaining: Math.max(0, daysRemaining),
    });
  };

  if (isLoading) {
    return (
      <div className="meta" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        Loading sprint...
      </div>
    );
  }

  const groupedStories = {
    backlog: stories.filter(s => s.status === 'backlog'),
    ready: stories.filter(s => s.status === 'ready'),
    in_progress: stories.filter(s => s.status === 'in_progress'),
    in_review: stories.filter(s => s.status === 'in_review'),
    complete: stories.filter(s => s.status === 'complete'),
    blocked: stories.filter(s => s.status === 'blocked'),
  };

  return (
    <div className="stack" style={{ gap: 'var(--content-gap)', padding: 'var(--space-6)' }}>
      {/* Sprint Header */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div>
            <h1 className="h2">{sprint?.name || 'Current Sprint'}</h1>
            <p
              style={{
                color: 'var(--text-dim)',
                fontSize: 'var(--text-sm)',
                marginTop: 'var(--space-1)',
              }}
            >
              {sprint?.startDate} → {sprint?.endDate}
              {sprintStats.daysRemaining > 0 && ` (${sprintStats.daysRemaining} days left)`}
            </p>
          </div>
          <button className="btn btn-primary">
            Sprint Settings
          </button>
        </div>

        {/* Sprint Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <StatBox label="Total Points" value={sprintStats.totalPoints} />
          <StatBox label="Velocity" value={sprintStats.completedPoints} color="green" />
          <StatBox label="In Progress" value={sprintStats.inProgressPoints} color="yellow" />
          <StatBox label="Blocked" value={sprintStats.blockedPoints} color="red" />
          <StatBox
            label="Completion"
            value={`${Math.round((sprintStats.completedPoints / sprintStats.totalPoints) * 100) || 0}%`}
          />
          <StatBox label="Days Left" value={sprintStats.daysRemaining} color="blue" />
        </div>

        {/* Sprint Progress Bar */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-2)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Sprint Progress</span>
            <span className="meta">
              {sprintStats.completedPoints} / {sprintStats.totalPoints} points
            </span>
          </div>
          <div
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              borderRadius: '9999px',
              height: 'var(--space-3)',
            }}
          >
            <div
              style={{
                background: 'var(--ok)',
                height: 'var(--space-3)',
                borderRadius: '9999px',
                transition: 'all 0.15s ease',
                width: `${Math.round((sprintStats.completedPoints / sprintStats.totalPoints) * 100) || 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {Object.entries(groupedStories).map(([status, storyList]) => (
          <StoryColumn
            key={status}
            status={status as keyof typeof groupedStories}
            stories={storyList}
            count={storyList.length}
          />
        ))}
      </div>

      {/* Risks & Blockers */}
      {sprintStats.blockedPoints > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 0,
            padding: 'var(--space-4)',
            background: 'color-mix(in srgb, var(--danger) 12%, var(--surface))',
            borderColor: 'var(--danger)',
          }}
        >
          <h3 style={{ color: 'var(--danger)', marginBottom: 'var(--space-2)' }}>🛑 Blockers Detected</h3>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {groupedStories.blocked.map(story => (
              <div key={story.id} style={{ fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>
                <strong>{story.title}</strong>
                {story.blockers.length > 0 && (
                  <ul
                    className="stack"
                    style={{
                      gap: 'var(--space-1)',
                      marginLeft: 'var(--space-4)',
                      marginTop: 'var(--space-1)',
                      listStyle: 'none',
                    }}
                  >
                    {story.blockers.map((blocker, idx) => (
                      <li key={idx} style={{ fontSize: 'var(--text-xs)' }}>
                        • {blocker}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryColumn({
  status,
  stories,
  count,
}: {
  status: string;
  stories: StoryCardData[];
  count: number;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-3)',
        height: 'fit-content',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: 0 }}>
          {statusLabels[status as keyof typeof statusLabels]} {status.replace(/_/g, ' ')}
        </h3>
        <span className="badge">
          {count}
        </span>
      </div>

      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        {stories.map(story => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>

      <div
        className="meta"
        style={{
          marginTop: 'var(--space-3)',
          padding: 'var(--space-2)',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        + Add Story
      </div>
    </div>
  );
}

function StoryCard({ story }: { story: StoryCardData }) {
  const riskColors: Record<StoryCardData['riskLevel'], React.CSSProperties> = {
    low: {
      background: 'color-mix(in srgb, var(--ok) 18%, var(--surface))',
      color: 'var(--ok)',
    },
    medium: {
      background: 'color-mix(in srgb, var(--warn) 18%, var(--surface))',
      color: 'var(--warn)',
    },
    high: {
      background: 'color-mix(in srgb, var(--danger) 14%, var(--surface))',
      color: 'var(--danger)',
    },
    critical: {
      background: 'color-mix(in srgb, var(--danger) 28%, var(--surface))',
      color: 'var(--danger)',
    },
  };

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius)',
        borderLeft: '4px solid var(--border)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...statusColors[story.status],
      }}
    >
      {/* Story header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-2)',
        }}
      >
        <h4
          style={{
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.title}
        </h4>
        {story.hasDecisionPending && <span style={{ fontSize: 'var(--text-xs)' }}>⚖️</span>}
      </div>

      {/* Story details */}
      <div
        className="stack"
        style={{ gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>{story.points} pts</span>
          <span>{story.assignee}</span>
        </div>

        {/* Crew progress bar */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}
          >
            <span className="meta">Crew Progress</span>
            <span style={{ fontWeight: 500 }}>{story.crewProgress}%</span>
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
                background: 'var(--accent4)',
                height: 'var(--space-2)',
                borderRadius: '9999px',
                transition: 'all 0.15s ease',
                width: `${story.crewProgress}%`,
              }}
            />
          </div>
        </div>

        {/* Risk indicator */}
        {story.riskLevel !== 'low' && (
          <span
            style={{
              display: 'inline-block',
              alignSelf: 'flex-start',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              ...riskColors[story.riskLevel],
            }}
          >
            {story.riskLevel} risk
          </span>
        )}

        {/* Due date */}
        <div className="meta">Due: {story.dueDate}</div>
      </div>

      {/* Blockers */}
      {story.blockers.length > 0 && (
        <div
          style={{
            marginTop: 'var(--space-2)',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--danger)' }}>
            🛑 {story.blockers.length} blocker(s)
          </span>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const colorStyles: Record<string, React.CSSProperties> = {
    gray: { background: 'var(--surface-2)', color: 'var(--text)' },
    green: {
      background: 'color-mix(in srgb, var(--ok) 18%, var(--surface))',
      color: 'var(--ok)',
    },
    yellow: {
      background: 'color-mix(in srgb, var(--warn) 18%, var(--surface))',
      color: 'var(--warn)',
    },
    red: {
      background: 'color-mix(in srgb, var(--danger) 18%, var(--surface))',
      color: 'var(--danger)',
    },
    blue: {
      background: 'color-mix(in srgb, var(--accent4) 18%, var(--surface))',
      color: 'var(--accent4)',
    },
  };

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius)',
        textAlign: 'center',
        ...(colorStyles[color] ?? colorStyles.gray),
      }}
    >
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginTop: 'var(--space-1)' }}>
        {label}
      </div>
    </div>
  );
}
