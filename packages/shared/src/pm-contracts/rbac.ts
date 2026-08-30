/**
 * RBAC (Role-Based Access Control) Permission Matrix
 * 
 * Defines which roles can read/write/delete which fields on which entity types
 * Enforced at the API layer before any database operation
 */

export type EntityType = 'sprint' | 'story' | 'task';
export type Role = 'viewer' | 'editor' | 'admin' | 'product-manager' | 'developer';

/**
 * Field-level permission entry
 */
export interface FieldPermission {
  role: Role;
  entityType: EntityType;
  field: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

/**
 * Default RBAC Permission Matrix
 * 
 * Roles:
 * - viewer: Read-only access
 * - editor: Can read/write, no delete
 * - admin: Full access
 * - product-manager: Read/write for strategic fields (priorities, scope)
 * - developer: Read/write for work-in-progress fields (state, assignee)
 */
export const DEFAULT_RBAC_MATRIX: FieldPermission[] = [
  // VIEWER ROLE (read-only)
  { role: 'viewer', entityType: 'sprint', field: '*', canRead: true, canWrite: false, canDelete: false },
  { role: 'viewer', entityType: 'story', field: '*', canRead: true, canWrite: false, canDelete: false },
  { role: 'viewer', entityType: 'task', field: '*', canRead: true, canWrite: false, canDelete: false },

  // DEVELOPER ROLE (work-in-progress fields)
  // Read all
  { role: 'developer', entityType: 'sprint', field: '*', canRead: true, canWrite: false, canDelete: false },
  { role: 'developer', entityType: 'story', field: '*', canRead: true, canWrite: false, canDelete: false },
  { role: 'developer', entityType: 'task', field: '*', canRead: true, canWrite: false, canDelete: false },

  // Write specific fields
  { role: 'developer', entityType: 'task', field: 'state', canRead: true, canWrite: true, canDelete: false },
  { role: 'developer', entityType: 'task', field: 'assignee_id', canRead: true, canWrite: true, canDelete: false },
  { role: 'developer', entityType: 'story', field: 'state', canRead: true, canWrite: true, canDelete: false },
  { role: 'developer', entityType: 'story', field: 'assignee_id', canRead: true, canWrite: true, canDelete: false },

  // PRODUCT-MANAGER ROLE (strategic fields)
  { role: 'product-manager', entityType: 'sprint', field: '*', canRead: true, canWrite: false, canDelete: false },
  { role: 'product-manager', entityType: 'story', field: '*', canRead: true, canWrite: false, canDelete: false },
  { role: 'product-manager', entityType: 'task', field: '*', canRead: true, canWrite: false, canDelete: false },

  // Write strategic fields
  { role: 'product-manager', entityType: 'sprint', field: 'goal', canRead: true, canWrite: true, canDelete: false },
  { role: 'product-manager', entityType: 'sprint', field: 'capacity', canRead: true, canWrite: true, canDelete: false },
  { role: 'product-manager', entityType: 'story', field: 'title', canRead: true, canWrite: true, canDelete: false },
  { role: 'product-manager', entityType: 'story', field: 'description', canRead: true, canWrite: true, canDelete: false },
  { role: 'product-manager', entityType: 'story', field: 'priority', canRead: true, canWrite: true, canDelete: false },
  { role: 'product-manager', entityType: 'story', field: 'story_points', canRead: true, canWrite: true, canDelete: false },

  // EDITOR ROLE (broad write access, no delete)
  { role: 'editor', entityType: 'sprint', field: '*', canRead: true, canWrite: true, canDelete: false },
  { role: 'editor', entityType: 'story', field: '*', canRead: true, canWrite: true, canDelete: false },
  { role: 'editor', entityType: 'task', field: '*', canRead: true, canWrite: true, canDelete: false },

  // ADMIN ROLE (full access)
  { role: 'admin', entityType: 'sprint', field: '*', canRead: true, canWrite: true, canDelete: true },
  { role: 'admin', entityType: 'story', field: '*', canRead: true, canWrite: true, canDelete: true },
  { role: 'admin', entityType: 'task', field: '*', canRead: true, canWrite: true, canDelete: true },
];

/**
 * Field Protection Rules
 * Some fields should never be modified after initial creation
 */
export const PROTECTED_FIELDS: Record<EntityType, string[]> = {
  sprint: ['id', 'tenant_id', 'created_at', 'created_by', 'audit_trail'],
  story: ['id', 'tenant_id', 'created_at', 'created_by', 'audit_trail'],
  task: ['id', 'tenant_id', 'created_at', 'created_by', 'audit_trail'],
};

/**
 * Check if a role can perform an action on a field
 */
export function canUserPerformAction(
  role: Role,
  entityType: EntityType,
  field: string,
  action: 'read' | 'write' | 'delete'
): boolean {
  // Protected fields can never be modified
  if ((action === 'write' || action === 'delete') && PROTECTED_FIELDS[entityType].includes(field)) {
    return false;
  }

  // Check matrix - prioritize specific field over wildcard
  const permissions = DEFAULT_RBAC_MATRIX.filter(
    (p) => p.role === role && p.entityType === entityType
  );

  // First try to find a specific field permission
  let permission = permissions.find((p) => p.field === field);
  
  // If no specific field permission, try wildcard
  if (!permission) {
    permission = permissions.find((p) => p.field === '*');
  }

  if (!permission) {
    return false;
  }

  switch (action) {
    case 'read':
      return permission.canRead;
    case 'write':
      return permission.canWrite;
    case 'delete':
      return permission.canDelete;
    default:
      return false;
  }
}

/**
 * Get all readable fields for a role on an entity type
 */
export function getReadableFields(role: Role, entityType: EntityType): string[] {
  const permissions = DEFAULT_RBAC_MATRIX.filter(
    (p) => p.role === role && p.entityType === entityType && p.canRead
  );

  // If wildcard permission exists, return all fields
  if (permissions.some((p) => p.field === '*')) {
    return ['*'];
  }

  return permissions.map((p) => p.field);
}

/**
 * Get all writable fields for a role on an entity type
 */
export function getWritableFields(role: Role, entityType: EntityType): string[] {
  const permissions = DEFAULT_RBAC_MATRIX.filter(
    (p) => p.role === role && p.entityType === entityType && p.canWrite
  );

  // If wildcard permission exists, return all fields
  if (permissions.some((p) => p.field === '*')) {
    return ['*'];
  }

  return permissions
    .filter((p) => !PROTECTED_FIELDS[entityType].includes(p.field))
    .map((p) => p.field);
}

/**
 * Validate a field update against RBAC
 */
export interface RBACValidationResult {
  allowed: boolean;
  reason?: string;
}

export function validateFieldUpdate(
  role: Role,
  entityType: EntityType,
  field: string,
  newValue: unknown
): RBACValidationResult {
  // Check if field is protected
  if (PROTECTED_FIELDS[entityType].includes(field)) {
    return {
      allowed: false,
      reason: `Field "${field}" is protected and cannot be modified`,
    };
  }

  // Check RBAC permission
  if (!canUserPerformAction(role, entityType, field, 'write')) {
    return {
      allowed: false,
      reason: `Role "${role}" cannot write to field "${field}" on ${entityType}`,
    };
  }

  return { allowed: true };
}
