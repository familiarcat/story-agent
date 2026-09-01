/**
 * PM System Validation Schemas
 * Phase 1: Zod validation for all input types
 */

import { z } from 'zod';
import type {
  WorkflowType,
  ProjectVisibility,
  ProjectStatus,
  SprintState,
  StoryState,
  TaskState,
  Priority,
  SizeCategory,
} from './pm-types';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');
// Accept either a UUID or an integer ID (as string)
export const IDSchema = z.union([
  z.string().uuid(),
  z.string().regex(/^\d+$/, 'Must be a valid ID'),
]);

export const WorkflowTypeSchema = z.enum(['scrum', 'kanban', 'hybrid']);
export const ProjectVisibilitySchema = z.enum(['private', 'team', 'public']);
export const ProjectStatusSchema = z.enum(['planning', 'active', 'archived']);

export const SprintStateSchema = z.enum(['planning', 'active', 'review', 'complete']);
export const StoryStateSchema = z.enum(['open', 'in_progress', 'review', 'done', 'blocked', 'archived']);
export const TaskStateSchema = z.enum(['open', 'in_progress', 'done', 'blocked']);

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']).default('medium');
export const SizeCategorySchema = z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional();

export const RFC3339DateSchema = z.string().datetime('Invalid RFC3339 date');

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255).describe('Project name'),
  description: z.string().max(2000).optional().describe('Project description'),
  workflow_type: WorkflowTypeSchema.default('scrum').describe('Workflow type: scrum, kanban, or hybrid'),
  visibility: ProjectVisibilitySchema.default('team').describe('Project visibility: private, team, or public'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  workflow_type: WorkflowTypeSchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  status: ProjectStatusSchema.optional(),
}).strict();

// ============================================================================
// SPRINT SCHEMAS
// ============================================================================

export const CreateSprintSchema = z.object({
  name: z.string().min(1).max(255).describe('Sprint name'),
  description: z.string().max(2000).optional().describe('Sprint description'),
  start_date: RFC3339DateSchema.optional().describe('Sprint start date (RFC3339)'),
  end_date: RFC3339DateSchema.optional().describe('Sprint end date (RFC3339)'),
  capacity: z.number().int().positive('Capacity must be positive').optional().describe('Sprint capacity (story points or hours)'),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) < new Date(data.end_date);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['end_date'] }
);

export const UpdateSprintSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  state: SprintStateSchema.optional(),
  start_date: RFC3339DateSchema.optional(),
  end_date: RFC3339DateSchema.optional(),
  capacity: z.number().int().positive().optional(),
}).strict().refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) < new Date(data.end_date);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['end_date'] }
);

// ============================================================================
// STORY SCHEMAS
// ============================================================================

export const CreateStorySchema = z.object({
  title: z.string().min(1).max(255).describe('Story title'),
  description: z.string().max(5000).optional().describe('Story description/acceptance criteria'),
  sprint_id: UUIDSchema.optional().describe('Sprint ID (if part of a sprint)'),
  story_points: z.number().int().positive('Story points must be positive').optional().describe('Story points (Scrum)'),
  size_category: SizeCategorySchema.describe('Size category: xs, sm, md, lg, xl (Kanban)'),
  priority: PrioritySchema.describe('Priority: low, medium, high, critical'),
});

export const UpdateStorySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  sprint_id: UUIDSchema.optional().nullable().describe('Set to null to remove from sprint'),
  state: StoryStateSchema.optional(),
  assignee_id: UUIDSchema.optional().nullable(),
  story_points: z.number().int().positive().optional(),
  size_category: SizeCategorySchema,
  priority: PrioritySchema.optional(),
  is_blocked: z.boolean().optional(),
  blocked_reason: z.string().max(500).optional(),
  blocked_by: UUIDSchema.optional().nullable(),
}).strict();

export const StateChangeSchema = z.object({
  state: StoryStateSchema.describe('New state for the story'),
  reason: z.string().max(500).optional().describe('Reason for state change (logged to audit trail)'),
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255).describe('Task title'),
  description: z.string().max(2000).optional().describe('Task description'),
  effort_hours: z.number().positive('Effort must be positive').optional().describe('Estimated effort in hours'),
  priority: PrioritySchema.describe('Priority: low, medium, high, critical'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  state: TaskStateSchema.optional(),
  assignee_id: UUIDSchema.optional().nullable(),
  effort_hours: z.number().positive().optional(),
  priority: PrioritySchema.optional(),
  is_blocked: z.boolean().optional(),
  blocked_by: UUIDSchema.optional().nullable(),
}).strict();

// ============================================================================
// ATTACHMENT & COMMENT SCHEMAS
// ============================================================================

export const CreateAttachmentSchema = z.object({
  name: z.string().min(1).max(255).describe('Attachment name'),
  url: z.string().url('Invalid URL format').describe('Attachment URL'),
  type: z.enum(['link', 'image', 'document', 'github_pr', 'jira_issue']).describe('Attachment type'),
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000).describe('Comment content'),
});

// ============================================================================
// LIST & FILTER SCHEMAS
// ============================================================================

export const ListPaginationSchema = z.object({
  offset: z.number().int().nonnegative().default(0).describe('Pagination offset'),
  limit: z.number().int().positive().max(100).default(20).describe('Pagination limit (max 100)'),
});

export const ListStoriesFilterSchema = ListPaginationSchema.extend({
  sprint_id: IDSchema.optional().describe('Filter by sprint'),
  state: StoryStateSchema.optional().describe('Filter by state'),
  assignee_id: UUIDSchema.optional().describe('Filter by assignee'),
  priority: PrioritySchema.optional().describe('Filter by priority'),
  is_blocked: z.boolean().optional().describe('Filter by blocked status'),
  search: z.string().max(255).optional().describe('Full-text search on title/description'),
});

export const ListTasksFilterSchema = ListPaginationSchema.extend({
  state: TaskStateSchema.optional().describe('Filter by state'),
  assignee_id: UUIDSchema.optional().describe('Filter by assignee'),
  priority: PrioritySchema.optional().describe('Filter by priority'),
  is_blocked: z.boolean().optional().describe('Filter by blocked status'),
});

// ============================================================================
// STATE MACHINE VALIDATION
// ============================================================================

/**
 * Validates story state transitions
 * @param current Current story state
 * @param next Desired story state
 * @returns true if transition is valid
 */
export function isValidStoryTransition(current: StoryState, next: StoryState): boolean {
  const validTransitions: Record<StoryState, StoryState[]> = {
    'open': ['in_progress', 'blocked', 'archived'],
    'in_progress': ['review', 'blocked', 'open'],
    'review': ['done', 'in_progress', 'blocked'],
    'done': ['archived'],
    'blocked': ['open', 'in_progress'],
    'archived': []
  };
  
  return validTransitions[current]?.includes(next) ?? false;
}

/**
 * Validates task state transitions
 * @param current Current task state
 * @param next Desired task state
 * @returns true if transition is valid
 */
export function isValidTaskTransition(current: TaskState, next: TaskState): boolean {
  const validTransitions: Record<TaskState, TaskState[]> = {
    'open': ['in_progress', 'blocked'],
    'in_progress': ['done', 'blocked', 'open'],
    'done': [],
    'blocked': ['open', 'in_progress']
  };
  
  return validTransitions[current]?.includes(next) ?? false;
}

/**
 * Validates sprint state transitions
 * @param current Current sprint state
 * @param next Desired sprint state
 * @returns true if transition is valid
 */
export function isValidSprintTransition(current: SprintState, next: SprintState): boolean {
  const validTransitions: Record<SprintState, SprintState[]> = {
    'planning': ['active'],
    'active': ['review'],
    'review': ['complete'],
    'complete': []
  };
  
  return validTransitions[current]?.includes(next) ?? false;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detects cyclical dependencies in task/story blocking
 * @param id Entity ID
 * @param blockedBy Entity that blocks this one
 * @param allBlocks Map of all blocking relationships
 * @returns true if cycle is detected
 */
export function detectCyclicalDependency(
  id: string,
  blockedBy: string | undefined,
  allBlocks: Map<string, string | undefined>
): boolean {
  if (!blockedBy) return false;
  
  let current: string | undefined = blockedBy;
  const visited = new Set<string>();
  
  while (current && !visited.has(current)) {
    if (current === id) return true; // Cycle detected
    visited.add(current);
    current = allBlocks.get(current);
  }
  
  return false;
}

// ============================================================================
// EXPORT VALIDATION HELPERS
// ============================================================================

export const PMValidation = {
  // Schemas
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateSprintSchema,
  UpdateSprintSchema,
  CreateStorySchema,
  UpdateStorySchema,
  StateChangeSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateAttachmentSchema,
  CreateCommentSchema,
  ListStoriesFilterSchema,
  ListTasksFilterSchema,
  
  // Validators
  isValidStoryTransition,
  isValidTaskTransition,
  isValidSprintTransition,
  detectCyclicalDependency,
};
