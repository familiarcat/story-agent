'use client';

import { useState, useCallback, useEffect } from 'react';
import { PMProject } from '@story-agent/shared';
import { useProjectList } from '../../hooks/pm';

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
  const { projects, loading, error, refetch } = useProjectList(clientId, { offset, limit: 20 });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handlePrevPage = useCallback(() => {
    setOffset(Math.max(0, offset - 20));
  }, [offset]);

  const handleNextPage = useCallback(() => {
    setOffset(offset + 20);
  }, [offset]);

  const handleCreateProject = useCallback(
    async (name: string, description: string) => {
      setIsCreating(true);
      setCreateError(null);
      try {
        const response = await fetch('/api/pm/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, client_id: clientId }),
        });
        if (!response.ok) throw new Error('Failed to create project');
        await refetch(0);
        setShowCreateForm(false);
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : 'Error creating project');
      } finally {
        setIsCreating(false);
      }
    },
    [clientId, refetch]
  );

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
          onCreateProject={handleCreateProject}
          isCreating={isCreating}
          error={createError}
        />
      )}

      <div className="project-list-table">
        {error && <div className="error-message">{error}</div>}
        {loading && <p className="loading">Loading projects...</p>}
        {!loading && projects.length === 0 && <p className="empty-state">No projects found</p>}
        {!loading && projects.length > 0 && (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} onClick={() => onSelectProject?.(project)} className="project-row">
                  <td className="project-name">{project.name}</td>
                  <td className="project-description">{project.description}</td>
                  <td className="project-status">{project.status}</td>
                  <td className="project-action">
                    <button className="btn-link">Open →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  onCreateProject: (name: string, description: string) => Promise<void>;
  isCreating?: boolean;
  error?: string | null;
}

function CreateProjectForm({ clientId, onSuccess, onCreateProject, isCreating = false, error }: CreateProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreateProject(name, description);
    setName('');
    setDescription('');
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="create-project-form">
      {error && <div className="error-message">{error}</div>}
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
