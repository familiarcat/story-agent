/**
 * Native PM System Types
 * Phase 1: Core Engine
 * 
 * Universal PM data contracts - matches database schema
 * These types are used across:
 * - Database client (packages/shared/src/pm-client.ts)
 * - API endpoints (packages/ui/app/api/pm/*)
 * - UI components (packages/ui/src/components/PM/*)
 * - MCP tools (packages/mcp-server/src/tools/pm-*)
 */

import { z } from 'zod';

// ============================================================================
// BASE TYPES
// ============================================================================

export type UUID = string & { readonly __brand: 'UUID' };

export type WorkflowType = 'scrum' | 'kanban' | 'hybrid';
export type ProjectVisibility = 'private' | 'team' | 'public';
export type ProjectStatus = 'planning' | 'active' | 'archived';

export type SprintState = 'planning' | 'active' | 'review' | 'complete';
export type StoryState = 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'archived';
export type TaskState = 'open' | 'in_progress' | 'done' | 'blocked';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type SizeCategory = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type AuditAction = 'create' | 'update' | 'delete' | 'state_change' | 'assign';
export type EntityType = 'project' | 'sprint' | 'story' | 'task';

export type AttachmentType = 'link' | 'image' | 'document' | 'github_pr' | 'jira_issue';

// ============================================================================
// PROJECT
// ============================================================================

export interface PMProject {
  id: UUID;
  client_id: UUID;
  name: string;
  description?: string;
  workflow_type: WorkflowType;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  created_by: UUID;
  created_at: string; // RFC3339
  updated_at: string; // RFC3339
}

export type CreateProjectInput = Pick<PMProject, 'name' | 'description' | 'workflow_type' | 'visibility'>;

export type UpdateProjectInput = Partial<Pick<PMProject, 'name' | 'description' | 'workflow_type' | 'visibility' | 'status'>>;

// ============================================================================
// SPRINT
// ============================================================================

export interface PMSprint {
  id: UUID;
  project_id: UUID;
  name: string;
  description?: string;
  state: SprintState;
  start_date?: string; // RFC3339
  end_date?: string; // RFC3339
  capacity?: number; // story points or hours
  created_by: UUID;
  created_at: string; // RFC3339
  updated_at: string; // RFC3339
}

export type CreateSprintInput = Pick<PMSprint, 'name' | 'description' | 'start_date' | 'end_date' | 'capacity'>;

export type UpdateSprintInput = Partial<Pick<PMSprint, 'name' | 'description' | 'state' | 'start_date' | 'end_date' | 'capacity'>>;

// ============================================================================
// STORY
// ============================================================================

export interface PMStory {
  id: UUID;
  project_id: UUID;
  sprint_id?: UUID;
  title: string;
  description?: string;
  state: StoryState;
  assignee_id?: UUID;
  story_points?: number; // Scrum
  size_category?: SizeCategory; // Kanban
  priority: Priority;
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_by?: UUID; // ID of blocking story
  created_by: UUID;
  created_at: string; // RFC3339
  updated_at: string; // RFC3339
}

export type CreateStoryInput = Pick<PMStory, 'title' | 'description' | 'sprint_id' | 'story_points' | 'size_category' | 'priority'>;

export type UpdateStoryInput = Partial<Pick<PMStory, 'title' | 'description' | 'sprint_id' | 'state' | 'assignee_id' | 'story_points' | 'size_category' | 'priority' | 'is_blocked' | 'blocked_reason' | 'blocked_by'>>;

export type StateChangeInput = {
  state: StoryState;
  reason?: string;
};

// ============================================================================
// TASK
// ============================================================================

export interface PMTask {
  id: UUID;
  story_id: UUID;
  title: string;
  description?: string;
  state: TaskState;
  assignee_id?: UUID;
  effort_hours?: number;
  priority: Priority;
  is_blocked: boolean;
  blocked_by?: UUID; // ID of blocking task
  created_by: UUID;
  created_at: string; // RFC3339
  updated_at: string; // RFC3339
}

export type CreateTaskInput = Pick<PMTask, 'title' | 'description' | 'effort_hours' | 'priority'>;

export type UpdateTaskInput = Partial<Pick<PMTask, 'title' | 'description' | 'state' | 'assignee_id' | 'effort_hours' | 'priority' | 'is_blocked' | 'blocked_by'>>;

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface PMAuditLog {
  id: UUID;
  entity_type: EntityType;
  entity_id: UUID;
  action: AuditAction;
  actor_id: UUID;
  timestamp: string; // RFC3339
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// ATTACHMENTS & COMMENTS
// ============================================================================

export interface PMStoryAttachment {
  id: UUID;
  story_id: UUID;
  name: string;
  url: string;
  type: AttachmentType;
  created_by: UUID;
  created_at: string; // RFC3339
}

export type CreateAttachmentInput = Pick<PMStoryAttachment, 'name' | 'url' | 'type'>;

export interface PMStoryComment {
  id: UUID;
  story_id: UUID;
  content: string;
  created_by: UUID;
  created_at: string; // RFC3339
  updated_at: string; // RFC3339
}

export type CreateCommentInput = Pick<PMStoryComment, 'content'>;

// ============================================================================
// AGGREGATE TYPES (for responses)
// ============================================================================

export interface SprintWithStories extends PMSprint {
  stories: PMStory[];
  story_count: number;
  completed_count: number;
  in_progress_count: number;
}

export interface StoryWithTasks extends PMStory {
  tasks: PMTask[];
  task_count: number;
  completed_tasks: number;
  blocked_tasks: number;
  attachments: PMStoryAttachment[];
  comments: PMStoryComment[];
}

export interface ProjectMetrics {
  project_id: UUID;
  total_stories: number;
  total_tasks: number;
  completed_stories: number;
  in_progress_stories: number;
  blocked_stories: number;
  completion_rate: number; // 0-1
  velocity?: number; // story points per sprint (Scrum only)
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export type APIResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
};

export type ListResponse<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

export type ConflictType = 'cyclical_dependency' | 'state_transition_invalid' | 'concurrent_edit' | 'blocked_state_change';

export interface ConflictDetected {
  type: ConflictType;
  entities: UUID[];
  message: string;
  resolution?: string; // guidance for user
}

// ============================================================================
// WORKFLOW STATE MACHINE
// ============================================================================

export const VALID_STORY_TRANSITIONS: Record<StoryState, StoryState[]> = {
  'open': ['in_progress', 'blocked', 'archived'],
  'in_progress': ['review', 'blocked', 'open'],
  'review': ['done', 'in_progress', 'blocked'],
  'done': ['archived'],
  'blocked': ['open', 'in_progress'],
  'archived': []
};

export const VALID_TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  'open': ['in_progress', 'blocked'],
  'in_progress': ['done', 'blocked', 'open'],
  'done': [],
  'blocked': ['open', 'in_progress']
};

export const VALID_SPRINT_TRANSITIONS: Record<SprintState, SprintState[]> = {
  'planning': ['active'],
  'active': ['review'],
  'review': ['complete'],
  'complete': []
};

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

/**
 * Type-safe PM system with:
 * 
 * 1. Universal data model (matches database schema exactly)
 * 2. State machine validation (VALID_*_TRANSITIONS)
 * 3. Input/Output types for API contracts
 * 4. Multi-tenant isolation (client_id everywhere)
 * 5. Audit trail (created_by, created_at, updated_at, PMAuditLog)
 * 6. Conflict detection (ConflictDetected type)
 * 7. Aggregate types for UI efficiency (SprintWithStories, StoryWithTasks)
 * 
 * Next: See pm-validation.ts for Zod schemas
 *       See pm-client.ts for database operations
 */
