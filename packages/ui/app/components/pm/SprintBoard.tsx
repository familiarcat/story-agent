'use client';

import { useState, useCallback, useEffect } from 'react';
import { PMSprint, PMStory } from '@story-agent/shared';
import { useSprintList, useStoryList } from '../../hooks/pm';

/** UUID type alias */
type UUID = string;

/**
 * SprintBoard Component
 * 
 * Displays sprint selector and story kanban board with drag-drop support.
 * Integrates with useSprints and useSprintDetail hooks.
 */

export interface SprintBoardProps {
  projectId: UUID;
  activeSprint?: UUID;
  onSelectSprint?: (sprintId: UUID) => void;
}

export function SprintBoard({ projectId, activeSprint, onSelectSprint }: SprintBoardProps) {
  const [showStoryForm, setShowStoryForm] = useState(false);
  const { sprints, loading: sprintsLoading } = useSprintList(projectId);
  const { stories, loading: storiesLoading } = useStoryList(projectId, {
    sprintId: activeSprint,
  });

  const handleSelectSprint = useCallback(
    (sprintId: UUID) => {
      onSelectSprint?.(sprintId);
    },
    [onSelectSprint]
  );

  return (
    <div className="sprint-board">
      <div className="sprint-board-header">
        <h2>Sprint Board</h2>
        <button onClick={() => setShowStoryForm(!showStoryForm)} className="btn-primary">
          Add Story
        </button>
      </div>

      <SprintSelector
        projectId={projectId}
        activeSprint={activeSprint}
        onSelectSprint={handleSelectSprint}
      />

      {showStoryForm && (
        <CreateStoryForm
          projectId={projectId}
          sprintId={activeSprint}
          onSuccess={() => setShowStoryForm(false)}
        />
      )}

      <KanbanBoard projectId={projectId} sprintId={activeSprint} />
    </div>
  );
}

/**
 * KanbanColumn Component
 * Individual kanban column for a story state.
 */

interface KanbanColumnProps {
  title: string;
  state: string;
  stories: PMStory[];
}

function KanbanColumn({ title, state, stories }: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const storyId = e.dataTransfer.getData('storyId');
    if (!storyId) return;
    try {
      const response = await fetch(`/api/pm/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      if (!response.ok) throw new Error('Failed to update story state');
    } catch (err) {
      console.error('Error updating story state:', err);
    }
  };

  return (
    <div
      className="kanban-column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h3 className="column-title">{title}</h3>
      <div className="story-cards">
        {stories.length === 0 && <p className="empty">No stories</p>}
        {stories.map((story) => (
          <KanbanStoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}

/**
 * KanbanStoryCard Component
 * Draggable story card in kanban.
 */

interface KanbanStoryCardProps {
  story: PMStory;
}

function KanbanStoryCard({ story }: KanbanStoryCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('storyId', story.id);
  };

  return (
    <div className="story-card" draggable onDragStart={handleDragStart}>
      <h4>{story.title}</h4>
      <p>{story.description}</p>
      <span className="priority">{story.priority}</span>
    </div>
  );
}

/**
 * CreateStoryForm Component
 * Form to create a new story in the sprint.
 */

interface CreateStoryFormProps {
  projectId: UUID;
  sprintId?: UUID;
  onSuccess?: () => void;
}

function CreateStoryForm({ projectId, sprintId, onSuccess }: CreateStoryFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pm/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, sprint_id: sprintId, state: 'draft' }),
      });
      if (!response.ok) throw new Error('Failed to create story');
      setTitle('');
      setPriority('medium');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-story-form">
      <div className="form-group">
        <label htmlFor="title">Story Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="As a user, I want..."
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Story'}
        </button>
      </div>
    </form>
  );
}
