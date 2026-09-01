'use client';

import { useState, useCallback } from 'react';
import { PMProject } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

/**
 * ProjectList Component
 * 
 * Displays a paginated list of projects with CRUD actions.
 * Integrates with useProjectList hook for data fetching and mutations.
 */

export interface ProjectListProps {
  clientId: UUID;
  onSelectProject?: (project: PMProject) => void;
}

export function ProjectList({ clientId, onSelectProject }: ProjectListProps) {
  const [offset, setOffset] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handlePrevPage = useCallback(() => {
    setOffset(Math.max(0, offset - 20));
  }, [offset]);

  const handleNextPage = useCallback(() => {
    setOffset(offset + 20);
  }, [offset]);

  const handleSelectProject = useCallback(
    (project: PMProject) => {
      onSelectProject?.(project);
    },
    [onSelectProject]
  );

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>Projects</h2>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
          New Project
        </button>
      </div>

      {showCreateForm && (
        <CreateProjectForm
          clientId={clientId}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      <div className="project-list-table">
        {/* TODO: Integrate useProjectList hook */}
        {/* Table will render projects here */}
        <p className="empty-state">Loading projects...</p>
      </div>

      <div className="project-list-pagination">
        <button onClick={handlePrevPage} disabled={offset === 0} className="btn-secondary">
          ← Previous
        </button>
        <span className="page-indicator">Page {offset / 20 + 1}</span>
        <button onClick={handleNextPage} className="btn-secondary">
          Next →
        </button>
      </div>
    </div>
  );
}

/**
 * CreateProjectForm Component
 * Nested form for creating a new project.
 */

interface CreateProjectFormProps {
  clientId: UUID;
  onSuccess?: () => void;
}

function CreateProjectForm({ clientId, onSuccess }: CreateProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Integrate useMutation(createProject)
      console.log('Create project:', { name, description, clientId });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-project-form">
      <div className="form-group">
        <label htmlFor="name">Project Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Project"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Project description..."
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}
