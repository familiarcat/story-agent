'use client';

import { useState, useCallback, useEffect } from 'react';
import { PMStory, PMStoryAttachment, PMStoryComment, PMAuditLog } from '@story-agent/shared';
import { useStoryWithTasks, useAttachments, useComments, useAuditLog } from '../../hooks/pm';
import { TaskKanban } from './TaskKanban';
import { CommentThread } from './CommentThread';

/** UUID type alias */
type UUID = string;

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
  const { story, loading: storyLoading } = useStoryWithTasks(storyId);
  const { attachments, loading: attachmentsLoading } = useAttachments(storyId);
  const { comments, loading: commentsLoading } = useComments(storyId);
  const { auditLogs, loading: auditLoading } = useAuditLog(storyId);

  const handleUpdateStory = async (updates: Partial<PMStory>) => {
    try {
      const response = await fetch(`/api/pm/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update story');
      setEditMode(false);
    } catch (err) {
      console.error('Error updating story:', err);
    }
  };

  if (storyLoading || !story) {
    return <div className="story-detail loading">Loading story...</div>;
  }

  return (
    <div className="story-detail">
      <div className="story-detail-header">
        <div className="story-header-content">
          <h1>{story.title}</h1>
          <div className="story-badges">
            <span className="badge priority">{story.priority}</span>
            <span className="badge state">{story.state}</span>
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
          <StoryMetadata story={story} editMode={editMode} onUpdate={handleUpdateStory} />

          <section className="story-section">
            <h3>Tasks</h3>
            <TaskKanban storyId={storyId} />
          </section>

          <section className="story-section">
            <h3>Attachments</h3>
            <AttachmentsSection storyId={storyId} attachments={attachments} loading={attachmentsLoading} />
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

          {showAuditTrail && <AuditTrail auditLogs={auditLogs} loading={auditLoading} />}
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
  story: PMStory;
  editMode: boolean;
  onUpdate: (updates: Partial<PMStory>) => Promise<void>;
}

function StoryMetadata({ story, editMode, onUpdate }: StoryMetadataProps) {
  const [editData, setEditData] = useState<Partial<PMStory>>(story);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(editData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="story-metadata">
      <div className="metadata-field">
        <label>Description</label>
        {editMode ? (
          <textarea
            value={editData.description || ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Story description..."
          />
        ) : (
          <p>{story.description || 'No description'}</p>
        )}
      </div>

      <div className="metadata-field">
        <label>Priority</label>
        {editMode ? (
          <select value={editData.priority || ''} onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        ) : (
          <p>{story.priority}</p>
        )}
      </div>

      <div className="metadata-field">
        <label>State</label>
        {editMode ? (
          <select value={editData.state || ''} onChange={(e) => setEditData({ ...editData, state: e.target.value as any })}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="archived">Archived</option>
          </select>
        ) : (
          <p>{story.state}</p>
        )}
      </div>

      {editMode && (
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Changes'}
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
  attachments: PMStoryAttachment[];
  loading: boolean;
}

function AttachmentsSection({ storyId, attachments, loading }: AttachmentsSectionProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`/api/pm/attachments?story_id=${storyId}`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="attachments-section">
      <div className="upload-zone">
        <label>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={uploading}
          />
          {uploading ? 'Uploading...' : 'Click to upload files'}
        </label>
      </div>

      <div className="attachments-list">
        {loading ? (
          <p>Loading attachments...</p>
        ) : attachments.length === 0 ? (
          <p className="empty-state">No attachments</p>
        ) : (
          <ul>
            {attachments.map((att) => (
              <li key={att.id}>
                <a href={att.url} target="_blank" rel="noreferrer">
                  {att.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * AuditTrail Component
 * View change history for the story.
 */

interface AuditTrailProps {
  auditLogs: PMAuditLog[];
  loading: boolean;
}

function AuditTrail({ auditLogs, loading }: AuditTrailProps) {
  return (
    <div className="audit-trail">
      <h4>Change History</h4>
      <div className="audit-entries">
        {loading ? (
          <p>Loading history...</p>
        ) : auditLogs.length === 0 ? (
          <p className="empty-state">No changes recorded</p>
        ) : (
          <ul>
            {auditLogs.map((log) => (
              <li key={log.id} className="audit-entry">
                <span className="action">{log.action}</span>
                <span className="user">by {log.actor_id}</span>
                <span className="timestamp">{new Date(log.timestamp).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
