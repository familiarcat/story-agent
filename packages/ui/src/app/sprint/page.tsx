'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AhaProject, AhaSprint, AhaSprintStory } from '@story-agent/shared';

type SprintView = {
  sprint: AhaSprint;
  stories: AhaSprintStory[];
};

function PointsBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 7, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#059669' : pct >= 50 ? '#2563eb' : '#f59e0b', borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{done}/{total} pts ({pct}%)</span>
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

  useEffect(() => {
    setLoadingProjects(true);
    fetch('/api/aha/projects')
      .then(r => r.json())
      .then((data: AhaProject[]) => {
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoadingProjects(false));
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

  const statusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('complete') || s.includes('ship')) return '#059669';
    if (s.includes('progress') || s.includes('review')) return '#2563eb';
    if (s.includes('block')) return '#dc2626';
    return '#6b7280';
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <a href="/dashboard" style={{ color: '#6b7280', fontSize: '0.85rem' }}>← Dashboard</a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Sprint Board</h1>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '4px 0 0' }}>
            View sprints, story point capacity, and agile ritual dates from Aha.
          </p>
        </div>
        <a href="/observation-lounge" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          + New Mission
        </a>
      </div>

      {/* Project + Sprint selectors */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.85rem 1rem' }}>
        <label>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 4 }}>Aha Project</div>
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
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 4 }}>Sprint / Release</div>
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

      {error && <div style={{ color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

      {/* Sprint summary card */}
      {sprintView && (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{sprintView.sprint.name}</div>
                {sprintView.sprint.startDate && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
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
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
              <span>📋 {sprintView.sprint.featureCount} stories</span>
              <span>✅ {sprintView.sprint.doneStoryPoints} pts done</span>
              <span>🔄 {sprintView.sprint.remainingStoryPoints} pts remaining</span>
              <span>📊 {sprintView.sprint.totalStoryPoints} pts total capacity</span>
            </div>
          </div>

          {/* Stories table */}
          {loadingStories ? (
            <div className="card" style={{ color: '#6b7280', textAlign: 'center' }}>Loading stories…</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No stories in this sprint.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
