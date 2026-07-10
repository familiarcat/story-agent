'use client';

import { useState } from 'react';
import { WorfGateModal } from '@/components/WorfGateModal';
import { useWorfGatedAction } from '../hooks/useWorfGatedAction';

interface CreateStoryFlowProps {
  sprintId: string;
  sprintName?: string | null;
  onCreated: (story: { referenceNum: string; name: string }) => void;
  onCancel: () => void;
}

export function CreateStoryFlow({ sprintId, sprintName, onCreated, onCancel }: CreateStoryFlowProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { pendingAction, trigger, onConfirm, onCancel: cancelModal, lastError } = useWorfGatedAction();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    trigger({
      actionType: 'create-story',
      label: `Create Story in ${sprintName ?? sprintId}`,
      payload: { releaseId: sprintId, name: name.trim(), description },
      endpoint: '/api/aha/create-story',
    });
  };

  const handleConfirm = (result: unknown) => {
    onConfirm(result);
    const story = (result as { story?: { referenceNum?: string; name?: string } } | null)?.story;
    if (story?.referenceNum && story?.name) {
      onCreated({ referenceNum: story.referenceNum, name: story.name });
    }
  };

  return (
    <div className="card">
      <form className="stack" onSubmit={submit}>
        <div className="cluster">
          <span className="meta">New story</span>
          <span className="tag">{sprintName ?? sprintId}</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="create-story-name">Name</label>
          <input
            id="create-story-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Story name"
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="create-story-description">Description</label>
          <textarea
            id="create-story-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should this story deliver?"
          />
        </div>

        {lastError ? (
          <span className="tag worf-gate-error">{lastError}</span>
        ) : null}

        <div className="cluster">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Create story (Worf-gated)
          </button>
        </div>
      </form>

      <WorfGateModal action={pendingAction} onConfirm={handleConfirm} onCancel={cancelModal} />
    </div>
  );
}
