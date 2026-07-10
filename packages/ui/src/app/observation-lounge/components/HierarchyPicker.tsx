'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildClientProjectMap, type ClientNode } from './ClientProjectMap';
import { EMPTY_SELECTION, type HierarchySelection } from './types';

type AhaSprintLite = { id: string; name: string };
// /api/aha/sprint-stories items (AhaSprintStory) carry referenceNum but no separate id,
// so referenceNum serves as both storyId and storyReferenceNum.
type SprintStoryLite = { referenceNum: string; name: string };

type LoadState = 'idle' | 'loading-map' | 'loading-sprints' | 'loading-stories' | 'ready' | 'error';

export type HierarchyPickerProps = {
  onSelectionChange: (sel: HierarchySelection) => void;
  onCreateStoryIntent: (sprintId: string) => void;
  initialSelection?: Partial<HierarchySelection>;
};

export default function HierarchyPicker({
  onSelectionChange,
  onCreateStoryIntent,
  initialSelection,
}: HierarchyPickerProps) {
  const [map, setMap] = useState<{ clients: ClientNode[] } | null>(null);
  const [selection, setSelection] = useState<HierarchySelection>({
    ...EMPTY_SELECTION,
    ...initialSelection,
  });
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sprints, setSprints] = useState<AhaSprintLite[]>([]);
  const [stories, setStories] = useState<SprintStoryLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading-map');
    setError(null);
    buildClientProjectMap()
      .then((result) => {
        if (cancelled) return;
        setMap(result);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load clients');
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySelection = useCallback(
    (next: HierarchySelection) => {
      setSelection(next);
      onSelectionChange(next);
    },
    [onSelectionChange],
  );

  const handleClientChange = (clientId: string) => {
    setSprints([]);
    setStories([]);
    applySelection({
      ...EMPTY_SELECTION,
      clientId: clientId || null,
    });
  };

  const handleProjectChange = (projectId: string) => {
    setSprints([]);
    setStories([]);
    const next: HierarchySelection = {
      ...EMPTY_SELECTION,
      clientId: selection.clientId,
      projectId: projectId || null,
    };
    applySelection(next);
    if (!projectId) return;
    setLoadState('loading-sprints');
    setError(null);
    fetch(`/api/aha/sprints?projectId=${encodeURIComponent(projectId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load sprints (${res.status})`);
        return (await res.json()) as AhaSprintLite[];
      })
      .then((data) => {
        setSprints(Array.isArray(data) ? data : []);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sprints');
        setLoadState('error');
      });
  };

  const handleSprintChange = (sprintId: string) => {
    setStories([]);
    const next: HierarchySelection = {
      ...EMPTY_SELECTION,
      clientId: selection.clientId,
      projectId: selection.projectId,
      sprintId: sprintId || null,
    };
    applySelection(next);
    if (!sprintId) return;
    setLoadState('loading-stories');
    setError(null);
    fetch(`/api/aha/sprint-stories?releaseId=${encodeURIComponent(sprintId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load stories (${res.status})`);
        return (await res.json()) as { stories: SprintStoryLite[]; totalPoints: number };
      })
      .then((data) => {
        setStories(Array.isArray(data.stories) ? data.stories : []);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load stories');
        setLoadState('error');
      });
  };

  const handleStoryChange = (referenceNum: string) => {
    applySelection({
      ...selection,
      storyId: referenceNum || null,
      storyReferenceNum: referenceNum || null,
    });
  };

  const selectedClient = map?.clients.find((c) => c.id === selection.clientId) ?? null;

  if (loadState === 'loading-map') {
    return <span className="meta">Loading clients…</span>;
  }
  if (loadState === 'error' && !map) {
    return (
      <span className="meta" style={{ color: 'var(--accent4)' }}>
        {error ?? 'Failed to load clients'}
      </span>
    );
  }
  if (!map || map.clients.length === 0) {
    return <span className="meta">No clients available</span>;
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-3)' }}>
      <div className="field">
        <label htmlFor="hp-client">Client</label>
        <select
          id="hp-client"
          className="select"
          value={selection.clientId ?? ''}
          onChange={(e) => handleClientChange(e.target.value)}
        >
          <option value="">Select a client…</option>
          {map.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {selection.clientId && (
        <div className="field">
          <label htmlFor="hp-project">Project</label>
          {selectedClient && selectedClient.projects.length === 0 ? (
            <span className="meta">No projects for this client</span>
          ) : (
            <select
              id="hp-project"
              className="select"
              value={selection.projectId ?? ''}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">Select a project…</option>
              {selectedClient?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.referencePrefix ? `${p.referencePrefix} — ${p.name}` : p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {selection.projectId && (
        <div className="field">
          <label htmlFor="hp-sprint">Sprint</label>
          {loadState === 'loading-sprints' ? (
            <span className="meta">Loading sprints…</span>
          ) : sprints.length === 0 ? (
            <span className="meta">No sprints in this project</span>
          ) : (
            <select
              id="hp-sprint"
              className="select"
              value={selection.sprintId ?? ''}
              onChange={(e) => handleSprintChange(e.target.value)}
            >
              <option value="">Select a sprint…</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {selection.sprintId && (
        <>
          <div className="field">
            <label htmlFor="hp-story">Story</label>
            {loadState === 'loading-stories' ? (
              <span className="meta">Loading stories…</span>
            ) : stories.length === 0 ? (
              <span className="meta">No stories in this sprint</span>
            ) : (
              <select
                id="hp-story"
                className="select"
                value={selection.storyReferenceNum ?? ''}
                onChange={(e) => handleStoryChange(e.target.value)}
              >
                <option value="">Select a story…</option>
                {stories.map((s) => (
                  <option key={s.referenceNum} value={s.referenceNum}>
                    {s.referenceNum} — {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="cluster">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => selection.sprintId && onCreateStoryIntent(selection.sprintId)}
            >
              ＋ New story in this sprint
            </button>
          </div>
        </>
      )}

      {loadState === 'error' && error && (
        <span className="meta" style={{ color: 'var(--accent4)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
