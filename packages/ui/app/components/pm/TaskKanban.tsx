'use client';

import { useState } from 'react';
import { useTaskList } from '../../hooks/pm';

/** UUID type alias */
type UUID = string;

/**
 * TaskKanban Component
 * 
 * Task-level kanban board within a story (todo → in_progress → done).
 * Supports drag-drop state changes.
 */

export interface TaskKanbanProps {
  storyId: UUID;
}

export function TaskKanban({ storyId }: TaskKanbanProps) {
  const { tasks, loading } = useTaskList(storyId);
  const states = ['todo', 'in_progress', 'done'];

  if (loading) return <p>Loading tasks...</p>;

  return (
    <div className="task-kanban">
      <div className="task-kanban-board">
        {states.map((state) => (
          <TaskColumn
            key={state}
            state={state}
            tasks={tasks.filter((t) => t.state === state)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * TaskColumn Component
 * Single column for task state.
 */

interface TaskColumnProps {
  state: string;
  tasks: any[];
}

function TaskColumn({ state, tasks }: TaskColumnProps) {
  const [dragOverId, setDragOverId] = useState<UUID | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    fetch(`/api/pm/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }).catch(err => console.error('Error updating task:', err));
  };

  return (
    <div className={`task-column task-column-${state}`}>
      <h4 className="column-title">{state.replace(/_/g, ' ').toUpperCase()}</h4>
      <div
        className="column-content"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnter={() => setDragOverId(state as UUID)}
        onDragLeave={() => setDragOverId(null)}
      >
        {tasks.length === 0 ? (
          <p className="empty-column">No tasks</p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} {...task} />)
        )}
      </div>

      {state === 'todo' && (
        <button className="btn-add-task">
          + Add Task
        </button>
      )}
    </div>
  );
}

/**
 * TaskCard Component
 * Single task in kanban.
 */

interface TaskCardProps {
  id: UUID;
  title: string;
  effort?: number;
  priority: string;
  isBlocked?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

function TaskCard({ id, title, effort, priority, isBlocked, onDragStart }: TaskCardProps) {
  return (
    <div
      className={`task-card task-priority-${priority}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer?.setData('taskId', id);
        onDragStart?.(e);
      }}
    >
      <div className="task-card-header">
        <h5>{title}</h5>
        {isBlocked && <span className="blocked-badge">BLOCKED</span>}
      </div>
      {effort && <p className="task-effort">{effort}h</p>}
    </div>
  );
}
