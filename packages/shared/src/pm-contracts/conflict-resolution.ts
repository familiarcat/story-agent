/**
 * Conflict Resolution Logic for Multi-Tool PM Sync
 * 
 * When syncing the same entity from multiple external tools (Jira, Monday, etc.),
 * conflicts can arise if both tools update the entity around the same time.
 * 
 * Resolution Strategy:
 * 1. Last-Write-Wins (LWW) within 5-minute window
 * 2. After 5 minutes, require manual merge review
 * 3. Audit trail records both versions for traceability
 */

import { type Sprint, type Story, type Task } from './schemas';

export type EntityType = 'sprint' | 'story' | 'task';
export type ConflictResolutionStrategy = 'last_write_wins' | 'manual_merge' | 'rollback';

/**
 * Represents a conflict between two versions of the same entity
 */
export interface EntityConflict {
  entity_id: string;
  entity_type: EntityType;
  timestamp: string; // ISO 8601
  source_a: {
    tool: string; // e.g., "jira", "monday"
    version: Sprint | Story | Task;
    updated_at: string;
  };
  source_b: {
    tool: string;
    version: Sprint | Story | Task;
    updated_at: string;
  };
  conflict_fields: string[]; // Which fields differ
  resolution_strategy: ConflictResolutionStrategy;
  requires_manual_review: boolean;
  resolution_at?: string; // When conflict was resolved
  resolved_by?: string; // Who resolved it (user_id)
  resolution_notes?: string;
}

/**
 * Conflict Detection
 * 
 * Detects conflicts by comparing updated_at timestamps.
 * If both updates are within 5 minutes, flag for manual review.
 */
export function detectConflict(
  entityId: string,
  entityType: EntityType,
  sourceA: {
    tool: string;
    version: Sprint | Story | Task;
    updated_at: string;
  },
  sourceB: {
    tool: string;
    version: Sprint | Story | Task;
    updated_at: string;
  }
): EntityConflict | null {
  const timeA = new Date(sourceA.updated_at).getTime();
  const timeB = new Date(sourceB.updated_at).getTime();
  const timeDiffMinutes = Math.abs(timeA - timeB) / (1000 * 60);

  // No conflict if one is significantly older
  if (timeDiffMinutes > 5) {
    return null;
  }

  // Find differing fields
  const conflictFields = findDifferingFields(sourceA.version, sourceB.version);
  if (conflictFields.length === 0) {
    return null; // Same version, no conflict
  }

  // Determine if manual review is needed
  const requiresManualReview = timeDiffMinutes <= 5 && conflictFields.length > 0;

  const conflict: EntityConflict = {
    entity_id: entityId,
    entity_type: entityType,
    timestamp: new Date().toISOString(),
    source_a: sourceA,
    source_b: sourceB,
    conflict_fields: conflictFields,
    resolution_strategy: requiresManualReview ? 'manual_merge' : 'last_write_wins',
    requires_manual_review: requiresManualReview,
  };

  return conflict;
}

/**
 * Resolve Conflict
 * 
 * Applies resolution strategy and returns merged entity
 */
export function resolveConflict(conflict: EntityConflict, resolution?: unknown): Sprint | Story | Task | null {
  if (conflict.resolution_strategy === 'last_write_wins') {
    // Return the most recently updated version
    const timeA = new Date(conflict.source_a.updated_at).getTime();
    const timeB = new Date(conflict.source_b.updated_at).getTime();

    if (timeA >= timeB) {
      return conflict.source_a.version;
    } else {
      return conflict.source_b.version;
    }
  }

  if (conflict.resolution_strategy === 'manual_merge') {
    // Manual resolution provided by user
    if (resolution) {
      return resolution as Sprint | Story | Task;
    }
    // No resolution provided, cannot proceed
    return null;
  }

  if (conflict.resolution_strategy === 'rollback') {
    // Rollback: return neither version (requires manual recovery)
    return null;
  }

  return null;
}

/**
 * Find differing fields between two entity versions
 */
function findDifferingFields(
  versionA: Sprint | Story | Task,
  versionB: Sprint | Story | Task
): string[] {
  const differing: string[] = [];

  // Compare all fields
  for (const key in versionA) {
    const a = (versionA as any)[key];
    const b = (versionB as any)[key];

    // Skip audit trail and metadata for conflict detection
    if (key === 'audit_trail' || key === 'metadata' || key === 'custom_fields') {
      continue;
    }

    if (JSON.stringify(a) !== JSON.stringify(b)) {
      differing.push(key);
    }
  }

  return differing;
}

/**
 * Merge Strategies
 * 
 * Different ways to merge conflicting entities based on field type
 */

export type MergeStrategy = 'last_write_wins' | 'source_a_wins' | 'source_b_wins' | 'combine_arrays' | 'manual';

/**
 * Merge two entity versions using a specified strategy
 */
export function mergeEntities(
  entityA: Sprint | Story | Task,
  entityB: Sprint | Story | Task,
  strategy: MergeStrategy = 'last_write_wins'
): Sprint | Story | Task {
  if (strategy === 'last_write_wins') {
    // Return most recently updated
    if (entityA.updated_at >= entityB.updated_at) {
      return entityA;
    }
    return entityB;
  }

  if (strategy === 'source_a_wins') {
    return entityA;
  }

  if (strategy === 'source_b_wins') {
    return entityB;
  }

  if (strategy === 'combine_arrays') {
    // Merge array fields (e.g., blocked_by, labels)
    const merged = { ...entityA };

    for (const key in entityB) {
      const valueA = (entityA as any)[key];
      const valueB = (entityB as any)[key];

      if (Array.isArray(valueA) && Array.isArray(valueB)) {
        // Combine and deduplicate arrays
        (merged as any)[key] = [...new Set([...valueA, ...valueB])];
      } else if (key === 'updated_at') {
        // Use most recent timestamp
        (merged as any)[key] = valueA >= valueB ? valueA : valueB;
      }
    }

    return merged;
  }

  // Default: last_write_wins
  return entityA.updated_at >= entityB.updated_at ? entityA : entityB;
}

/**
 * Conflict Resolution Policy
 * 
 * Determines how conflicts should be resolved based on:
 * - Entity type (sprint vs story vs task)
 * - Conflicting field (state vs assignee vs points)
 * - Time difference between updates
 */
export interface ConflictResolutionPolicy {
  entityType: EntityType;
  field: string;
  timeDiffMinutes: number;
  strategy: ConflictResolutionStrategy;
}

export const DEFAULT_CONFLICT_POLICIES: ConflictResolutionPolicy[] = [
  // For state changes: always require manual review if conflicting within 5 min
  { entityType: 'sprint', field: 'state', timeDiffMinutes: 5, strategy: 'manual_merge' },
  { entityType: 'story', field: 'state', timeDiffMinutes: 5, strategy: 'manual_merge' },
  { entityType: 'task', field: 'state', timeDiffMinutes: 5, strategy: 'manual_merge' },

  // For assignee changes: last-write-wins is acceptable
  { entityType: 'story', field: 'assignee_id', timeDiffMinutes: 5, strategy: 'last_write_wins' },
  { entityType: 'task', field: 'assignee_id', timeDiffMinutes: 5, strategy: 'last_write_wins' },

  // For metadata/custom fields: combine if possible
  { entityType: 'story', field: 'labels', timeDiffMinutes: 5, strategy: 'last_write_wins' },
  { entityType: 'task', field: 'labels', timeDiffMinutes: 5, strategy: 'last_write_wins' },
];

/**
 * Get recommended conflict resolution strategy
 */
export function getConflictResolutionStrategy(
  entityType: EntityType,
  field: string,
  timeDiffMinutes: number
): ConflictResolutionStrategy {
  const policy = DEFAULT_CONFLICT_POLICIES.find(
    (p) => p.entityType === entityType && p.field === field && timeDiffMinutes <= p.timeDiffMinutes
  );

  if (policy) {
    return policy.strategy;
  }

  // Default: last-write-wins for anything else
  return 'last_write_wins';
}

/**
 * Conflict Audit Trail
 * 
 * Every conflict is logged for traceability and future analysis
 */
export interface ConflictAuditEntry {
  conflict_id: string;
  detected_at: string; // ISO 8601
  entity_id: string;
  entity_type: EntityType;
  source_a_tool: string;
  source_b_tool: string;
  conflict_fields: string[];
  resolution_strategy: ConflictResolutionStrategy;
  requires_manual_review: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export function createConflictAuditEntry(conflict: EntityConflict): ConflictAuditEntry {
  return {
    conflict_id: `${conflict.entity_id}-${conflict.timestamp}`,
    detected_at: conflict.timestamp,
    entity_id: conflict.entity_id,
    entity_type: conflict.entity_type,
    source_a_tool: conflict.source_a.tool,
    source_b_tool: conflict.source_b.tool,
    conflict_fields: conflict.conflict_fields,
    resolution_strategy: conflict.resolution_strategy,
    requires_manual_review: conflict.requires_manual_review,
    resolved_at: conflict.resolution_at,
    resolved_by: conflict.resolved_by,
    resolution_notes: conflict.resolution_notes,
  };
}
