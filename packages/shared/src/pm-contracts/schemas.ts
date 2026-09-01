/**
 * Universal PM Data Model — Core Schemas
 * 
 * These schemas are the canonical representation of project management concepts
 * independent of any external tool (Jira, Monday, Azure, GitHub, etc.).
 * 
 * Principles:
 * 1. Required fields only (minimal viable state)
 * 2. Optional fields for extensibility (custom_fields, metadata)
 * 3. Multi-tenant isolation (every entity has tenant_id)
 * 4. Immutable audit trail (created_at, updated_at, created_by, audit_trail)
 * 5. RFC3339 timestamps (ISO 8601 for cross-system compatibility)
 */

import { z } from 'zod';

/**
 * RFC3339 timestamp format validator
 * Ensures all timestamps are ISO 8601 compliant for cross-tool sync
 * Examples: 2026-08-25T09:30:00Z, 2026-08-25T09:30:00-07:00
 */
export const RFC3339TimestampSchema = z.string().datetime({ offset: true,
  message: 'Must be valid RFC3339 timestamp (ISO 8601)',
});

/**
 * UUID v4 validator
 */
export const UUIDSchema = z.string().uuid({
  message: 'Must be valid UUID v4',
});

/**
 * Tenant ID validator (scoped to client organization)
 */
export const TenantIdSchema = z.string().min(1).max(255);

/**
 * User ID validator (scoped to auth system)
 */
export const UserIdSchema = z.string().min(1).max(255);

/**
 * State enum: Minimal universal states + optional extensions
 * Minimal: open, in_progress, done
 * Extensions: planning, blocked, archived, review, staging
 */
export const StateEnum = z.enum([
  'open',
  'planning',
  'in_progress',
  'blocked',
  'review',
  'done',
  'archived',
  'staging',
]);

export type State = z.infer<typeof StateEnum>;

/**
 * Audit Trail Entry
 * Immutable record of every state change with full provenance
 */
export const AuditTrailEntrySchema = z.object({
  timestamp: RFC3339TimestampSchema,
  action: z.string().describe('What changed (e.g., "state_changed", "assignee_updated")'),
  actor_id: UserIdSchema.describe('Who made the change'),
  changes: z.record(z.any()).describe('Before/after values: {field: {old, new}}'),
  reason: z.string().optional().describe('Why the change was made (if provided)'),
});

export type AuditTrailEntry = z.infer<typeof AuditTrailEntrySchema>;

/**
 * Sprint Schema
 * Represents a time-boxed container for stories (e.g., "Sprint 42", "Sprint Aug 26-Sept 6")
 * 
 * Required fields:
 * - id: Unique identifier
 * - tenant_id: Multi-tenant isolation
 * - name: Human-readable name
 * - state: Current state (planning, active, review, done)
 * - start_date: Sprint begins (RFC3339)
 * - end_date: Sprint ends (RFC3339)
 * 
 * Optional fields:
 * - capacity: Team capacity for sprint (story points or hours)
 * - metadata: Extensible key-value store for tool-specific data
 */
export const SprintSchema = z.object({
  id: UUIDSchema,
  tenant_id: TenantIdSchema,
  name: z.string().min(1).max(255).describe('Sprint name (e.g., "Sprint 42", "Aug 26-Sept 6")'),
  state: StateEnum.describe('Sprint lifecycle: planning → active → review → done'),
  start_date: RFC3339TimestampSchema.describe('Sprint start (RFC3339)'),
  end_date: RFC3339TimestampSchema.describe('Sprint end (RFC3339)'),
  capacity: z.number().nonnegative().optional().describe('Team capacity (story points or hours)'),
  goal: z.string().optional().describe('Sprint goal/theme'),
  created_at: RFC3339TimestampSchema,
  updated_at: RFC3339TimestampSchema,
  created_by: UserIdSchema,
  metadata: z.record(z.any()).optional().default({}).describe('Extensible custom data'),
  audit_trail: z.array(AuditTrailEntrySchema).optional().default([]).describe('Immutable change log'),
  custom_fields: z.record(z.any()).optional().default({}).describe('Tool-specific fields (Jira custom fields, etc.)'),
});

export type Sprint = z.infer<typeof SprintSchema>;

/**
 * Story Schema
 * Represents a user story, feature, or requirement
 * 
 * Required fields:
 * - id: Unique identifier
 * - tenant_id: Multi-tenant isolation
 * - title: User story title
 * - state: Current state (open, in_progress, blocked, done, etc.)
 * 
 * Optional fields:
 * - sprint_id: Link to parent sprint (null if backlog)
 * - description: Detailed story description
 * - story_points: Estimation (Fibonacci scale or custom)
 * - assignee_id: User assigned to this story
 * - blocked_by: Array of story IDs that block this one (for dependency tracking)
 * - metadata: Extensible key-value store
 * - custom_fields: Tool-specific fields (Jira epic link, Monday item type, etc.)
 */
export const StorySchema = z.object({
  id: UUIDSchema,
  tenant_id: TenantIdSchema,
  title: z.string().min(1).max(500).describe('Story title'),
  description: z.string().optional().describe('Story description (acceptance criteria, context)'),
  state: StateEnum.describe('Story state: open → in_progress → done'),
  sprint_id: UUIDSchema.optional().nullable().describe('Parent sprint (null = backlog)'),
  story_points: z.number().nonnegative().optional().describe('Story point estimate (e.g., 5, 8, 13)'),
  assignee_id: UserIdSchema.optional().describe('User assigned to this story'),
  blocked_by: z.array(UUIDSchema).optional().default([]).describe('Story IDs that block this one'),
  parent_id: UUIDSchema.optional().describe('Parent story (for hierarchical epics/features)'),
  created_at: RFC3339TimestampSchema,
  updated_at: RFC3339TimestampSchema,
  created_by: UserIdSchema,
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Priority level'),
  metadata: z.record(z.any()).optional().default({}).describe('Extensible custom data'),
  audit_trail: z.array(AuditTrailEntrySchema).optional().default([]).describe('Immutable change log'),
  custom_fields: z.record(z.any()).optional().default({}).describe('Tool-specific fields'),
  labels: z.array(z.string()).optional().default([]).describe('Tags/labels for categorization'),
  due_date: RFC3339TimestampSchema.optional().describe('Target completion date'),
});

export type Story = z.infer<typeof StorySchema>;

/**
 * Task Schema
 * Represents a small unit of work within a story
 * 
 * Required fields:
 * - id: Unique identifier
 * - tenant_id: Multi-tenant isolation
 * - title: Task title
 * - state: Current state (open, in_progress, done, etc.)
 * - story_id: Parent story
 * 
 * Optional fields:
 * - assignee_id: User assigned to this task
 * - blocked_by: Tasks that block this one (for dependency tracking)
 * - priority: Task priority
 * - metadata: Extensible data
 */
export const TaskSchema = z.object({
  id: UUIDSchema,
  tenant_id: TenantIdSchema,
  title: z.string().min(1).max(500).describe('Task title'),
  description: z.string().optional().describe('Task description'),
  state: StateEnum.describe('Task state: open → in_progress → done'),
  story_id: UUIDSchema.describe('Parent story (required)'),
  assignee_id: UserIdSchema.optional().describe('User assigned to this task'),
  blocked_by: z.array(UUIDSchema).optional().default([]).describe('Task IDs that block this one'),
  created_at: RFC3339TimestampSchema,
  updated_at: RFC3339TimestampSchema,
  created_by: UserIdSchema,
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Priority level'),
  due_date: RFC3339TimestampSchema.optional().describe('Target completion date'),
  estimated_hours: z.number().positive().optional().describe('Time estimate in hours'),
  metadata: z.record(z.any()).optional().default({}).describe('Extensible custom data'),
  audit_trail: z.array(AuditTrailEntrySchema).optional().default([]).describe('Immutable change log'),
  custom_fields: z.record(z.any()).optional().default({}).describe('Tool-specific fields'),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Conflict Detection Result
 * Used when syncing the same entity from multiple tools
 */
export const ConflictSchema = z.object({
  entity_id: UUIDSchema,
  entity_type: z.enum(['sprint', 'story', 'task']),
  conflict_type: z.enum(['simultaneous_update', 'state_divergence', 'field_mismatch']),
  timestamp: RFC3339TimestampSchema,
  source_a: z.object({
    tool: z.string().describe('Tool name (e.g., "jira", "monday")'),
    version: z.any().describe('Version/state from tool A'),
    updated_at: RFC3339TimestampSchema,
  }),
  source_b: z.object({
    tool: z.string().describe('Tool name (e.g., "jira", "monday")'),
    version: z.any().describe('Version/state from tool B'),
    updated_at: RFC3339TimestampSchema,
  }),
  resolution_strategy: z.enum(['last_write_wins', 'manual_merge', 'rollback']).describe('How to resolve'),
  requires_manual_review: z.boolean().describe('True if human needs to approve merge'),
});

export type Conflict = z.infer<typeof ConflictSchema>;

/**
 * State Transition Rule
 * Defines valid transitions in the universal state machine
 * 
 * Examples:
 * - open → in_progress (valid)
 * - open → done (invalid, must go through in_progress first)
 * - done → archived (valid)
 * - archived → in_progress (invalid, archived is final)
 */
export const StateTransitionSchema = z.object({
  from: StateEnum,
  to: StateEnum,
  valid: z.boolean().describe('Whether this transition is allowed'),
  requires_approval: z.boolean().optional().describe('True if state change needs authorization'),
});

export type StateTransition = z.infer<typeof StateTransitionSchema>;

/**
 * RBAC Permission Matrix
 * Defines who can modify what fields based on role
 */
export const RBACPermissionSchema = z.object({
  role: z.string().describe('Role name (e.g., "viewer", "editor", "admin")'),
  entity_type: z.enum(['sprint', 'story', 'task']),
  field: z.string().describe('Field name (e.g., "state", "assignee_id", "story_points")'),
  can_read: z.boolean().optional().default(true),
  can_write: z.boolean().optional().default(false),
  can_delete: z.boolean().optional().default(false),
});

export type RBACPermission = z.infer<typeof RBACPermissionSchema>;

/**
 * Validation Rules
 * Centralized schema validation for all PM entities
 */
export class PmSchemaValidator {
  /**
   * Validate RFC3339 timestamp
   */
  static validateRFC3339(timestamp: string): boolean {
    try {
      RFC3339TimestampSchema.parse(timestamp);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Sprint schema
   */
  static validateSprint(data: unknown): { valid: boolean; errors: string[] } {
    try {
      SprintSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error: any) {
      return {
        valid: false,
        errors: error.errors?.map((e: any) => e.message) || [error.message],
      };
    }
  }

  /**
   * Validate Story schema
   */
  static validateStory(data: unknown): { valid: boolean; errors: string[] } {
    try {
      StorySchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error: any) {
      return {
        valid: false,
        errors: error.errors?.map((e: any) => e.message) || [error.message],
      };
    }
  }

  /**
   * Validate Task schema
   */
  static validateTask(data: unknown): { valid: boolean; errors: string[] } {
    try {
      TaskSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error: any) {
      return {
        valid: false,
        errors: error.errors?.map((e: any) => e.message) || [error.message],
      };
    }
  }

  /**
   * Check for cyclical dependencies in task blocking chains
   * A task cannot be blocked by itself (directly or transitively)
   */
  static hasCyclicalDependency(
    taskId: string,
    blockedBy: string[],
    allTasks: Map<string, string[]>
  ): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>(blockedBy);

    while (stack.size > 0) {
      const current = stack.values().next().value as string | undefined;
      if (!current) {
        break; // No more items
      }
      
      stack.delete(current);

      if (current === taskId) {
        return true; // Cyclical dependency detected
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const dependencies = allTasks.get(current) || [];
      dependencies.forEach((dep) => stack.add(dep));
    }

    return false;
  }
}

/**
 * Export all schemas
 * Types (Sprint, Story, Task, etc.) are exported via type inference above
 */
export const Schemas = {
  Sprint: SprintSchema,
  Story: StorySchema,
  Task: TaskSchema,
  Conflict: ConflictSchema,
  StateTransition: StateTransitionSchema,
  RBACPermission: RBACPermissionSchema,
};
