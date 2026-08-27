/**
 * PM Contracts — Universal Project Management Data Model
 * 
 * This module exports the canonical schemas and types for all PM entities
 * (Sprint, Story, Task) independent of any external tool.
 */

export {
  // Schemas
  SprintSchema,
  StorySchema,
  TaskSchema,
  ConflictSchema,
  StateTransitionSchema,
  RBACPermissionSchema,
  StateEnum,
  RFC3339TimestampSchema,
  UUIDSchema,
  TenantIdSchema,
  UserIdSchema,
  AuditTrailEntrySchema,
  // Types
  type Sprint,
  type Story,
  type Task,
  type Conflict,
  type StateTransition,
  type RBACPermission,
  type State,
  type AuditTrailEntry,
  // Validator
  PmSchemaValidator,
  Schemas,
} from './schemas';

/**
 * State machine definitions
 */
export * from './state-machine';

/**
 * RBAC and permission definitions
 */
export {
  type EntityType as RBACEntityType,
  type Role,
  type FieldPermission,
  DEFAULT_RBAC_MATRIX,
  canUserPerformAction,
  getReadableFields,
  getWritableFields,
  validateFieldUpdate,
  PROTECTED_FIELDS,
} from './rbac';

/**
 * Conflict resolution rules
 */
export * from './conflict-resolution';
