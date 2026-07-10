'use client';

import { useEffect, useState } from 'react';
import type { HierarchySelection } from './types';

type StoryDetail = {
  referenceNum: string;
  name: string;
  description: string;
  acceptanceCriteria: string;
  url: string;
  workflowStatus: string;
};

/** Strip Aha HTML bodies to plain text (DOM-free; safe for SSR). */
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface StoryDetailFormProps {
  selection: HierarchySelection;
  clientName?: string | null;
  projectName?: string | null;
  sprintName?: string | null;
  onUse: (referenceNum: string) => void;
}

export function StoryDetailForm({
  selection,
  clientName,
  projectName,
  sprintName,
  onUse,
}: StoryDetailFormProps) {
  const { storyReferenceNum } = selection;
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storyReferenceNum) {
      setStory(null);
      setError(null);
      setLoading(false);
      return;
    }
    let stale = false;
    setLoading(true);
    setError(null);
    setStory(null);
    fetch(`/api/aha/story?reference=${encodeURIComponent(storyReferenceNum)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
        return body as StoryDetail;
      })
      .then((data) => {
        if (!stale) setStory(data);
      })
      .catch((err: unknown) => {
        if (!stale) setError(err instanceof Error ? err.message : 'Failed to load story');
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [storyReferenceNum]);

  const contextTags = (
    <div className="cluster">
      {clientName ? (
        <span className="tag">
          <span className="meta" style={{ marginRight: 'var(--space-1)' }}>Client</span>
          {clientName}
        </span>
      ) : null}
      {projectName ? (
        <span className="tag">
          <span className="meta" style={{ marginRight: 'var(--space-1)' }}>Project</span>
          {projectName}
        </span>
      ) : null}
      {sprintName ? (
        <span className="tag">
          <span className="meta" style={{ marginRight: 'var(--space-1)' }}>Sprint</span>
          {sprintName}
        </span>
      ) : null}
    </div>
  );

  if (!storyReferenceNum) {
    return (
      <div className="card">
        <div className="stack">
          {(clientName || projectName || sprintName) ? contextTags : null}
          <p className="meta">Select a story — or create one in the chosen sprint.</p>
        </div>
      </div>
    );
  }

  const description = story ? stripHtml(story.description) : '';
  const acceptance = story ? stripHtml(story.acceptanceCriteria) : '';

  return (
    <div className="card">
      <div className="stack">
        {(clientName || projectName || sprintName) ? contextTags : null}

        {loading ? <p className="meta">Loading {storyReferenceNum}…</p> : null}
        {error ? (
          <p className="meta" style={{ color: 'var(--danger)' }}>
            Failed to load {storyReferenceNum}: {error}
          </p>
        ) : null}

        {story ? (
          <>
            <div className="cluster">
              <span className="tag">{story.referenceNum}</span>
              {story.workflowStatus ? <span className="badge">{story.workflowStatus}</span> : null}
            </div>
            <h3>{story.name}</h3>

            <div className="stack" style={{ gap: 'var(--space-1)' }}>
              <span className="meta">Description</span>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {description || <span className="meta">No description.</span>}
              </p>
            </div>

            {acceptance ? (
              <div className="stack" style={{ gap: 'var(--space-1)' }}>
                <span className="meta">Acceptance criteria</span>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{acceptance}</p>
              </div>
            ) : null}

            {story.url ? (
              <a
                href={story.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent2)', fontSize: 'var(--text-sm)' }}
              >
                Open in Aha ↗
              </a>
            ) : null}

            <div className="cluster">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onUse(story.referenceNum)}
              >
                Use this story →
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
