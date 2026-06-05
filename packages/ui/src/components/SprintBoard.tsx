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
import type { Story, Sprint } from '@/lib/agile';

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

const statusColors = {
  backlog: 'bg-gray-100 border-gray-300',
  ready: 'bg-blue-50 border-blue-300',
  in_progress: 'bg-yellow-50 border-yellow-300',
  in_review: 'bg-purple-50 border-purple-300',
  complete: 'bg-green-50 border-green-300',
  blocked: 'bg-red-100 border-red-400',
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
  const [sprint, setSprint] = useState<Sprint | null>(null);
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

    const daysRemaining = sprint
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
    return <div className="p-8 text-center text-gray-500">Loading sprint...</div>;
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
    <div className="space-y-6 p-6">
      {/* Sprint Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{sprint?.name || 'Current Sprint'}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {sprint?.startDate} → {sprint?.endDate}
              {sprintStats.daysRemaining > 0 && ` (${sprintStats.daysRemaining} days left)`}
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600">
            Sprint Settings
          </button>
        </div>

        {/* Sprint Stats */}
        <div className="grid grid-cols-6 gap-4">
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
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Sprint Progress</span>
            <span className="text-xs text-gray-600">
              {sprintStats.completedPoints} / {sprintStats.totalPoints} points
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{
                width: `${Math.round((sprintStats.completedPoints / sprintStats.totalPoints) * 100) || 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-6 gap-4">
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">🛑 Blockers Detected</h3>
          <div className="space-y-2">
            {groupedStories.blocked.map(story => (
              <div key={story.id} className="text-sm text-red-800">
                <strong>{story.title}</strong>
                {story.blockers.length > 0 && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {story.blockers.map((blocker, idx) => (
                      <li key={idx} className="text-xs">
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
    <div className="bg-gray-50 rounded-lg p-3 h-fit">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">
          {statusLabels[status as keyof typeof statusLabels]} {status.replace(/_/g, ' ')}
        </h3>
        <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded">
          {count}
        </span>
      </div>

      <div className="space-y-2">
        {stories.map(story => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>

      <div className="mt-3 p-2 border-2 border-dashed border-gray-300 rounded text-center text-xs text-gray-500 hover:bg-white cursor-pointer transition">
        + Add Story
      </div>
    </div>
  );
}

function StoryCard({ story }: { story: StoryCardData }) {
  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div
      className={`p-3 rounded border-l-4 cursor-pointer hover:shadow-md transition ${statusColors[story.status]}`}
    >
      {/* Story header */}
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm flex-1 line-clamp-2">{story.title}</h4>
        {story.hasDecisionPending && <span className="text-xs">⚖️</span>}
      </div>

      {/* Story details */}
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-medium">{story.points} pts</span>
          <span>{story.assignee}</span>
        </div>

        {/* Crew progress bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Crew Progress</span>
            <span className="font-medium">{story.crewProgress}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${story.crewProgress}%` }}
            />
          </div>
        </div>

        {/* Risk indicator */}
        {story.riskLevel !== 'low' && (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${riskColors[story.riskLevel]}`}>
            {story.riskLevel} risk
          </span>
        )}

        {/* Due date */}
        <div className="text-gray-500">Due: {story.dueDate}</div>
      </div>

      {/* Blockers */}
      {story.blockers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <span className="text-xs font-medium text-red-600">🛑 {story.blockers.length} blocker(s)</span>
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
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-900',
    green: 'bg-green-100 text-green-900',
    yellow: 'bg-yellow-100 text-yellow-900',
    red: 'bg-red-100 text-red-900',
    blue: 'bg-blue-100 text-blue-900',
  };

  return (
    <div className={`p-3 rounded text-center ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
    </div>
  );
}
