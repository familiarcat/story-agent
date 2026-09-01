'use client';

import { useState, useCallback } from 'react';
import { PMStory } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;
import { TaskKanban } from './TaskKanban';
import { CommentThread } from './CommentThread';

/**
 * StoryDetail Component
 * 
 * Full story view with tasks, attachments, comments, and audit trail.
 * Modal overlay or full-page detail view.
 */

export interface StoryDetailProps {
  storyId: UUID;
  onClose?: () => void;
}

export function StoryDetail({ storyId, onClose }: StoryDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  return (
    <div className="story-detail">
      <div className="story-detail-header">
        <div className="story-header-content">
          {/* TODO: Integrate useStoryWithTasks hook */}
          <h1>Story Title</h1>
          <div className="story-badges">
            {/* Priority badge */}
            {/* State badge */}
            {/* Blocked indicator */}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-close">
            ✕
          </button>
        )}
      </div>

      <div className="story-detail-content">
        <div className="story-main">
          <StoryMetadata storyId={storyId} editMode={editMode} />

          <section className="story-section">
            <h3>Tasks</h3>
            <TaskKanban storyId={storyId} />
          </section>

          <section className="story-section">
            <h3>Attachments</h3>
            <AttachmentsSection storyId={storyId} />
          </section>

          <section className="story-section">
            <h3>Comments</h3>
            <CommentThread storyId={storyId} />
          </section>
        </div>

        <div className="story-sidebar">
          <div className="story-actions">
            <button className="btn-secondary" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Done Editing' : 'Edit'}
            </button>
            <button className="btn-secondary" onClick={() => setShowAuditTrail(!showAuditTrail)}>
              {showAuditTrail ? 'Hide History' : 'View History'}
            </button>
          </div>

          {showAuditTrail && <AuditTrail storyId={storyId} />}
        </div>
      </div>
    </div>
  );
}

/**
 * StoryMetadata Component
 * Editable story fields (description, size, points, etc).
 */

interface StoryMetadataProps {
  storyId: UUID;
  editMode: boolean;
}

function StoryMetadata({ storyId, editMode }: StoryMetadataProps) {
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState(0);
  const [sizeCategory, setSizeCategory] = useState('medium');

  const handleSave = async () => {
    // TODO: Integrate useMutation(updateStory)
    console.log('Save story metadata:', { description, storyPoints, sizeCategory });
  };

  return (
    <div className="story-metadata">
      <div className="metadata-field">
        <label>Description</label>
        {editMode ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Story description..."
          />
        ) : (
          <p>{description || 'No description'}</p>
        )}
      </div>

      <div className="metadata-field">
        <label>Story Points</label>
        {editMode ? (
          <input
            type="number"
            value={storyPoints}
            onChange={(e) => setStoryPoints(parseInt(e.target.value) || 0)}
          />
        ) : (
          <p>{storyPoints}</p>
        )}
      </div>

      <div className="metadata-field">
        <label>Size Category</label>
        {editMode ? (
          <select value={sizeCategory} onChange={(e) => setSizeCategory(e.target.value)}>
            <option value="xs">Extra Small</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        ) : (
          <p>{sizeCategory}</p>
        )}
      </div>

      {editMode && (
        <button onClick={handleSave} className="btn-primary">
          Save Changes
        </button>
      )}
    </div>
  );
}

/**
 * AttachmentsSection Component
 * File upload and attachment list.
 */

interface AttachmentsSectionProps {
  storyId: UUID;
}

function AttachmentsSection({ storyId }: AttachmentsSectionProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // TODO: Integrate file upload logic
    console.log('Files dropped:', e.dataTransfer.files);
  };

  return (
    <div className="attachments-section">
      <div
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <p>Drag and drop files here or click to upload</p>
        <input type="file" multiple style={{ display: 'none' }} />
      </div>

      <div className="attachments-list">
        {/* TODO: Integrate useAttachments hook */}
        <p className="empty-state">No attachments</p>
      </div>
    </div>
  );
}

/**
 * AuditTrail Component
 * View change history for the story.
 */

interface AuditTrailProps {
  storyId: UUID;
}

function AuditTrail({ storyId }: AuditTrailProps) {
  return (
    <div className="audit-trail">
      <h4>Change History</h4>
      {/* TODO: Integrate useAuditLog hook */}
      <div className="audit-entries">
        <p className="empty-state">No changes recorded</p>
      </div>
    </div>
  );
}
