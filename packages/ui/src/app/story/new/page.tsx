'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useAhaEvents } from '@/hooks/useAhaEvents';

type AhaProject = { id: string; name: string; referencePrefix: string | null; url: string };
type AhaStory = { referenceNum: string; name: string; workflowStatus: string; url: string };

export default function NewStoryPage() {
  const [projects, setProjects] = useState<AhaProject[]>([]);
  const [stories, setStories] = useState<AhaStory[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [repoFullName, setRepoFullName] = useState('client-int/product-profile-ui');
  const [baseBranch, setBaseBranch] = useState('dev');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedReference, setSelectedReference] = useState('');

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      setError(null);
      try {
        const res = await fetch('/api/aha/projects');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load projects');
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error loading projects');
      } finally {
        setLoadingProjects(false);
      }
    };
    void loadProjects();
  }, []);

  const loadStories = useCallback(async (projectId: string) => {
    setLoadingStories(true);
    setError(null);
    try {
      const res = await fetch(`/api/aha/stories?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load stories');
      setStories(data);
      setSelectedReference(prev =>
        prev && (data as AhaStory[]).some(s => s.referenceNum === prev) ? prev : (data[0]?.referenceNum ?? '')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error loading stories');
    } finally {
      setLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    void loadStories(selectedProjectId);
  }, [selectedProjectId, loadStories]);

  // Cross-surface sync: refetch when another surface (MCP crew, extension) changed a story in Aha.
  useAhaEvents(() => {
    if (selectedProjectId) void loadStories(selectedProjectId);
  }, { resourceTypes: ['story'] });

  const onImport = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/stories/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceNum: selectedReference,
          repoFullName,
          baseBranch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setSuccess(`Imported ${data.storyId}: ${data.title}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error importing story');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'New Story' }]} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Import Story from Aha</h1>
      <p style={{ marginBottom: '1.25rem', color: 'var(--text)' }}>
        Select an Aha project and feature, then import it into the story lifecycle tracker.
      </p>

      <div className="card" style={{ display: 'grid', gap: '0.9rem' }}>
        <label>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Repository (owner/name)</div>
          <input value={repoFullName} onChange={e => setRepoFullName(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
        </label>

        <label>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Preferred Base Branch</div>
          <input value={baseBranch} onChange={e => setBaseBranch(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
        </label>

        <label>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Aha Project</div>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={loadingProjects || projects.length === 0}
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}{project.referencePrefix ? ` (${project.referencePrefix})` : ''}
              </option>
            ))}
          </select>
          {selectedProject && (
            <a href={selectedProject.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>
              Open project in Aha ↗
            </a>
          )}
        </label>

        <label>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Story</div>
          <select
            value={selectedReference}
            onChange={e => setSelectedReference(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={loadingStories || stories.length === 0}
          >
            {stories.map(story => (
              <option key={story.referenceNum} value={story.referenceNum}>
                {story.referenceNum}: {story.name} [{story.workflowStatus}]
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={onImport} disabled={!selectedReference || importing}>
            {importing ? 'Importing…' : 'Import Story'}
          </button>
          <a className="btn btn-secondary" href="/dashboard">Back to Dashboard</a>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--ok)', fontSize: '0.9rem' }}>{success}</div>}
      </div>
    </div>
  );
}
