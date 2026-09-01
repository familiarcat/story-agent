'use client';

import { useState, useCallback } from 'react';
import { PMSprint } from '@story-agent/shared';

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
 * SprintSelector Component
 * Dropdown or tabs to select active sprint.
 */

interface SprintSelectorProps {
  projectId: UUID;
  activeSprint?: UUID;
  onSelectSprint: (sprintId: UUID) => void;
}

function SprintSelector({ projectId, activeSprint, onSelectSprint }: SprintSelectorProps) {
  return (
    <div className="sprint-selector">
      <label htmlFor="sprint-select">Sprint:</label>
      <select
        id="sprint-select"
        value={activeSprint || ''}
        onChange={(e) => onSelectSprint(e.target.value as UUID)}
        className="select-input"
      >
        <option value="">Loading sprints...</option>
        {/* TODO: Integrate useSprints hook to render sprint options */}
      </select>
    </div>
  );
}

/**
 * KanbanBoard Component
 * Story kanban with columns for each state.
 */

interface KanbanBoardProps {
  projectId: UUID;
  sprintId?: UUID;
}

function KanbanBoard({ projectId, sprintId }: KanbanBoardProps) {
  const states = ['draft', 'ready', 'in_progress', 'review', 'complete'];

  return (
    <div className="kanban-board">
      {states.map((state) => (
        <KanbanColumn key={state} state={state} sprintId={sprintId} />
      ))}
    </div>
  );
}

/**
 * KanbanColumn Component
 * Single column in kanban (one story state).
 */

interface KanbanColumnProps {
  state: string;
  sprintId?: UUID;
}

function KanbanColumn({ state, sprintId }: KanbanColumnProps) {
  return (
    <div className={`kanban-column kanban-column-${state}`}>
      <h3 className="column-title">{state.replace(/_/g, ' ').toUpperCase()}</h3>
      <div className="column-content">
        {/* TODO: Integrate useStoryList hook with state filter */}
        {/* Render story cards here with drag-drop support */}
        <p className="empty-column">No stories</p>
      </div>
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
      // TODO: Integrate useMutation(createStory)
      console.log('Create story:', { title, priority, sprintId, projectId });
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
