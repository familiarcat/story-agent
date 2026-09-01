'use client';

import { useState, useCallback } from 'react';
import { PMStoryComment } from '@story-agent/shared';

/** UUID type alias */
type UUID = string;

/**
 * CommentThread Component
 * 
 * Comment thread view for stories.
 * Displays list of comments and provides form to add new comments.
 */

export interface CommentThreadProps {
  storyId: UUID;
}

export function CommentThread({ storyId }: CommentThreadProps) {
  const [comments, setComments] = useState<PMStoryComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddComment = useCallback(
    async (content: string) => {
      setLoading(true);
      setError(null);

      try {
        // TODO: Integrate useMutation(addComment)
        console.log('Add comment:', { content, storyId });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to post comment');
      } finally {
        setLoading(false);
      }
    },
    [storyId]
  );

  return (
    <div className="comment-thread">
      <div className="comments-list">
        {/* TODO: Integrate useComments hook to render comments */}
        {comments.length === 0 && <p className="empty-state">No comments yet</p>}
        
        {/* Render all comments */}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
          />
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      <CommentForm
        onSubmit={(content) => handleAddComment(content)}
        loading={loading}
        placeholder="Add a comment..."
      />
    </div>
  );
}

/**
 * CommentItem Component
 * Single comment display.
 */

interface CommentItemProps {
  comment: PMStoryComment;
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="comment-item">
      <div className="comment-header">
        <strong className="author">{comment.created_by}</strong>
        <span className="timestamp">{new Date(comment.created_at).toLocaleDateString()}</span>
      </div>

      <div className="comment-content">
        <p>{comment.content}</p>
      </div>
    </div>
  );
}

/**
 * CommentForm Component
 * Input form for creating comments.
 */

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  loading?: boolean;
  placeholder?: string;
  isReply?: boolean;
}

function CommentForm({ onSubmit, loading, placeholder, isReply }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`comment-form ${isReply ? 'reply' : ''}`}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || 'Add a comment...'}
        disabled={loading || isSubmitting}
      />
      <button
        type="submit"
        disabled={loading || isSubmitting || !content.trim()}
        className="btn-primary"
      >
        {isSubmitting ? 'Posting...' : 'Post'}
      </button>
    </form>
  );
}
