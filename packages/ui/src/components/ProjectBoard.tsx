/**
 * ProjectBoard - Display all stories in a project with crew execution status
 */

'use client';

import { useEffect, useState } from 'react';
import { StoryExecutionCard } from './StoryExecutionCard';
import type { ProjectRecord, StoryRecord } from '@story-agent/shared';

interface ProjectBoardProps {
  projectId: string;
  projectName: string;
}

export function ProjectBoard({ projectId, projectName }: ProjectBoardProps) {
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStories() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/stories?projectId=${projectId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch stories: ${response.statusText}`);
        }
        const data = await response.json();
        setStories(data.stories || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stories');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStories();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">{projectName}</h1>
        <div className="text-gray-500">Loading stories...</div>
      </div>
    );
  }

  const completedStories = stories.filter(s => s.status === 'merged').length;
  const activeStories = stories.filter(s => !['merged', 'blocked', 'pending'].includes(s.status)).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{projectName}</h1>
        <div className="flex gap-6 text-sm">
          <div className="text-gray-600">
            <strong>{stories.length}</strong> total stories
          </div>
          <div className="text-blue-600">
            <strong>{activeStories}</strong> active
          </div>
          <div className="text-green-600">
            <strong>{completedStories}</strong> completed
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {stories.length === 0 ? (
        <div className="text-gray-500">No stories in this project yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {stories.map(story => (
            <StoryExecutionCard key={story.storyId} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
