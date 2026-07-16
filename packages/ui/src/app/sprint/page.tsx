'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AhaProject, AhaSprint, AhaSprintStory } from '@story-agent/shared';
import { ClientScopeSelector } from '@/components/ClientScopeSelector';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ComponentLoadingRegion } from '@/components/ComponentLoadingRegion';
import { GravityVelocityMini } from '@/components/GravityVelocityMini';
import { SprintCalendarPlanner } from '@/components/SprintCalendarPlanner';
import { useAhaEvents } from '@/hooks/useAhaEvents';

type SprintView = {
  sprint: AhaSprint;
  stories: AhaSprintStory[];
};

function PointsBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? 'var(--ok)' : pct >= 50 ? 'var(--accent4)' : 'var(--warn)', borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{done}/{total} pts ({pct}%)</span>
    </div>
  );
}

export default function SprintPage() {
  const [projects, setProjects] = useState<AhaProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [sprints, setSprints] = useState<AhaSprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [sprintView, setSprintView] = useState<SprintView | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlBusy, setControlBusy] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [newStoryName, setNewStoryName] = useState('');
  const [newStoryDescription, setNewStoryDescription] = useState('');
  const [newTaskStoryRef, setNewTaskStoryRef] = useState('');
  const [newTaskName, setNewTaskName] = useState('');

  useEffect(() => {
    setLoadingProjects(true);
    fetch('/api/aha/projects')
      .then((res) => res.json())
      .then((data: AhaProject[]) => {
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => {
        setLoadingProjects(false);
      });
  }, []);

  const loadSprints = useCallback(async (projectId: string) => {
    setLoadingSprints(true);
    setError(null);
    try {
      const res = await fetch(`/api/aha/sprints?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json() as AhaSprint[];
      setSprints(data);
      if (data.length > 0) setSelectedSprintId(data[0].id);
    } catch {
      setError('Failed to load sprints');
    } finally {
      setLoadingSprints(false);
    }
  }, []);

  const loadSprintStories = useCallback(async (releaseId: string, sprint: AhaSprint) => {
    setLoadingStories(true);
    setError(null);
    try {
      const res = await fetch(`/api/aha/sprint-stories?releaseId=${encodeURIComponent(releaseId)}`);
      const data = await res.json() as { stories: AhaSprintStory[]; totalPoints: number };
      setSprintView({ sprint, stories: data.stories });
    } catch {
      setError('Failed to load sprint stories');
    } finally {
      setLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) void loadSprints(selectedProjectId);
  }, [selectedProjectId, loadSprints]);

  useEffect(() => {
    const sprint = sprints.find(s => s.id === selectedSprintId);
    if (selectedSprintId && sprint) void loadSprintStories(selectedSprintId, sprint);
    else setSprintView(null);
  }, [selectedSprintId, sprints, loadSprintStories]);

  // Cross-surface sync: refetch when another surface (MCP crew, extension) changed Aha.
  useAhaEvents(events => {
    if (events.some(e => e.resourceType === 'release') && selectedProjectId) void loadSprints(selectedProjectId);
    const sprint = sprints.find(s => s.id === selectedSprintId);
    if (events.some(e => e.resourceType === 'story') && selectedSprintId && sprint) void loadSprintStories(selectedSprintId, sprint);
  }, { resourceTypes: ['story', 'release'] });

  const statusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('complete') || s.includes('ship')) return 'var(--ok)';
    if (s.includes('progress') || s.includes('review')) return 'var(--accent4)';
    if (s.includes('block')) return 'var(--danger)';
    return 'var(--text-dim)';
  };

  const postWithConfirm = useCallback(async (resource: 'sprint' | 'story' | 'task', payload: Record<string, unknown>) => {
    const dryRun = await fetch(`/api/aha/resource/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actor: 'dashboard' }),
    });
    const dryRunData = await dryRun.json();
    if (!dryRun.ok) throw new Error(dryRunData.error || `Dry-run failed (${dryRun.status})`);

    const confirmed = window.confirm(`WorfGate preview for ${resource}:\n\n${JSON.stringify(dryRunData.proposed ?? dryRunData, null, 2).slice(0, 700)}\n\nApply this change?`);
    if (!confirmed) return null;

    const apply = await fetch(`/api/aha/resource/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actor: 'dashboard', confirm: true }),
    });
    const applyData = await apply.json();
    if (!apply.ok) throw new Error(applyData.error || `Apply failed (${apply.status})`);
    return applyData;
  }, []);

  const onCreateSprint = useCallback(async () => {
    if (!selectedProjectId || !newSprintName.trim()) return;
    setControlBusy(true);
    setError(null);
    try {
      await postWithConfirm('sprint', {
        mode: 'create',
        projectId: selectedProjectId,
        name: newSprintName.trim(),
        startDate: newSprintStart || undefined,
        endDate: newSprintEnd || undefined,
      });
      setNewSprintName('');
      setNewSprintStart('');
      setNewSprintEnd('');
      await loadSprints(selectedProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create sprint');
    } finally {
      setControlBusy(false);
    }
  }, [selectedProjectId, newSprintName, newSprintStart, newSprintEnd, postWithConfirm, loadSprints]);

  const onCreateStory = useCallback(async () => {
    if (!selectedSprintId || !newStoryName.trim()) return;
    setControlBusy(true);
    setError(null);
    try {
      await postWithConfirm('story', {
        mode: 'create',
        releaseId: selectedSprintId,
        name: newStoryName.trim(),
        description: newStoryDescription || undefined,
      });
      setNewStoryName('');
      setNewStoryDescription('');
      const sprint = sprints.find(s => s.id === selectedSprintId);
      if (sprint) await loadSprintStories(selectedSprintId, sprint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create story');
    } finally {
      setControlBusy(false);
    }
  }, [selectedSprintId, newStoryName, newStoryDescription, postWithConfirm, sprints, loadSprintStories]);

  const onCreateTask = useCallback(async () => {
    if (!newTaskStoryRef.trim() || !newTaskName.trim()) return;
    setControlBusy(true);
    setError(null);
    try {
      await postWithConfirm('task', {
        mode: 'create',
        featureRef: newTaskStoryRef.trim(),
        name: newTaskName.trim(),
      });
      setNewTaskName('');
      const sprint = sprints.find(s => s.id === selectedSprintId);
      if (sprint && selectedSprintId) await loadSprintStories(selectedSprintId, sprint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setControlBusy(false);
    }
  }, [newTaskStoryRef, newTaskName, postWithConfirm, sprints, selectedSprintId, loadSprintStories]);

  return (
    <div style={{ maxWidth: 1000 }}>
      <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sprint' }]} />

      <ClientScopeSelector title="Client Scope For Sprint Planning" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Sprint Board</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            View sprints, story point capacity, and agile ritual dates from Aha.
          </p>
        </div>
        <a href="/observation-lounge" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          + New Mission
        </a>
      </div>

      {/* Project + Sprint selectors */}
      <ComponentLoadingRegion
        loading={loadingProjects || loadingSprints}
        source="Sprint Board"
        summary={loadingProjects ? 'Loading Aha projects and default sprint context.' : 'Loading sprint releases for selected project.'}
        minHeight={130}
      >
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.85rem 1rem' }}>
          <label>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 4 }}>Aha Project</div>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              disabled={loadingProjects}
              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.875rem' }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.referencePrefix ? ` (${p.referencePrefix})` : ''}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 4 }}>Sprint / Release</div>
            <select
              value={selectedSprintId}
              onChange={e => setSelectedSprintId(e.target.value)}
              disabled={loadingSprints || sprints.length === 0}
              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.875rem' }}
            >
              {sprints.length === 0 && <option value="">No sprints found</option>}
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.startDate ? ` · ${s.startDate}` : ''}</option>)}
            </select>
          </label>
        </div>
      </ComponentLoadingRegion>

      <div className="card" style={{ marginBottom: '1rem', display: 'grid', gap: '0.85rem' }}>
        <div style={{ fontWeight: 700 }}>Aha Control Panel (Dashboard)</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Full control actions are Worf-gated: each mutation runs dry-run preview, then applies on confirmation.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Create Sprint in selected project</div>
            <input value={newSprintName} onChange={e => setNewSprintName(e.target.value)} placeholder="Sprint name" style={{ padding: '0.4rem 0.5rem' }} />
            <input value={newSprintStart} onChange={e => setNewSprintStart(e.target.value)} placeholder="Start YYYY-MM-DD" style={{ padding: '0.4rem 0.5rem' }} />
            <input value={newSprintEnd} onChange={e => setNewSprintEnd(e.target.value)} placeholder="End YYYY-MM-DD" style={{ padding: '0.4rem 0.5rem' }} />
            <button className="btn btn-secondary" disabled={controlBusy || !selectedProjectId || !newSprintName.trim()} onClick={onCreateSprint}>Create Sprint</button>
          </div>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Create Story in selected sprint</div>
            <input value={newStoryName} onChange={e => setNewStoryName(e.target.value)} placeholder="Story name" style={{ padding: '0.4rem 0.5rem' }} />
            <input value={newStoryDescription} onChange={e => setNewStoryDescription(e.target.value)} placeholder="Description (optional)" style={{ padding: '0.4rem 0.5rem' }} />
            <button className="btn btn-secondary" disabled={controlBusy || !selectedSprintId || !newStoryName.trim()} onClick={onCreateStory}>Create Story</button>
          </div>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Create Task under a story</div>
            <input value={newTaskStoryRef} onChange={e => setNewTaskStoryRef(e.target.value)} placeholder="Story ref (e.g. PROD-22)" style={{ padding: '0.4rem 0.5rem' }} />
            <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Task name" style={{ padding: '0.4rem 0.5rem' }} />
            <button className="btn btn-secondary" disabled={controlBusy || !newTaskStoryRef.trim() || !newTaskName.trim()} onClick={onCreateTask}>Create Task</button>
          </div>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

      {/* Sprint summary card */}
      {sprintView && (
        <>
          <ComponentLoadingRegion
            loading={loadingStories}
            source="Sprint Board"
            summary={`Loading stories and metrics for ${sprintView.sprint.name}.`}
            minHeight={320}
          >
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{sprintView.sprint.name}</div>
                  {sprintView.sprint.startDate && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {sprintView.sprint.startDate} → {sprintView.sprint.endDate ?? 'no end date'}
                      {sprintView.sprint.startDate && sprintView.sprint.endDate && (() => {
                        const start = new Date(sprintView.sprint.startDate!);
                        const end = new Date(sprintView.sprint.endDate!);
                        const days = Math.round((end.getTime() - start.getTime()) / 86400000);
                        return ` · ${days} days`;
                      })()}
                    </div>
                  )}
                </div>
                <a href={sprintView.sprint.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>Open in Aha ↗</a>
              </div>
              <PointsBar done={sprintView.sprint.doneStoryPoints} total={sprintView.sprint.totalStoryPoints} />
              <GravityVelocityMini stories={sprintView.stories} donePoints={sprintView.sprint.doneStoryPoints} />
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                <span>📋 {sprintView.sprint.featureCount} stories</span>
                <span>✅ {sprintView.sprint.doneStoryPoints} pts done</span>
                <span>🔄 {sprintView.sprint.remainingStoryPoints} pts remaining</span>
                <span>📊 {sprintView.sprint.totalStoryPoints} pts total capacity</span>
              </div>
            </div>

            <SprintCalendarPlanner
              sprintId={sprintView.sprint.id}
              sprintName={sprintView.sprint.name}
              startDate={sprintView.sprint.startDate}
              endDate={sprintView.sprint.endDate}
              stories={sprintView.stories}
            />
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th style={{ textAlign: 'center' }}>Points</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sprintView.stories.map(s => (
                    <tr key={s.referenceNum}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{s.referenceNum}</td>
                      <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.storyPoints ?? '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: statusColor(s.workflowStatus) }}>
                          {s.workflowStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem' }}>Aha ↗</a>
                          <a
                            href={`/observation-lounge?ref=${encodeURIComponent(s.referenceNum)}`}
                            style={{ fontSize: '0.78rem' }}
                          >
                            Start →
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sprintView.stories.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>No stories in this sprint.</div>
              )}
            </div>
          </ComponentLoadingRegion>
        </>
      )}
    </div>
  );
}
