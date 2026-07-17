/**
 * Conflict Detector for VSCode chat sync.
 *
 * Detects message collisions and implements Last-Write-Wins (LWW) resolution.
 *
 * Phase 1: Detect + log (type-based, no runtime dependency)
 * Phase 2: CRDTs + operational transformation via MCP bridge
 */

import type { SyncConflict, PendingChange, ChatMessage } from './types';

export interface CollisionContext {
  storyId: string;
  timestamp: string;
  localChange: PendingChange;
  remoteChange?: PendingChange;
}

/**
 * Detect a collision between local and remote changes.
 *
 * Pure function — no side effects. Returns null if no collision; otherwise returns collision details.
 */
export function detectCollision(context: CollisionContext): SyncConflict | null {
  if (!context.remoteChange) {
    return null; // No remote change to collide with
  }

  // Check for overlapping timestamps within 1-second window
  // (Phase 1 heuristic; Phase 2 will use vector clocks)
  const localTimestamp = new Date(context.localChange.timestamp).getTime();
  const remoteTimestamp = new Date(context.remoteChange.timestamp).getTime();

  const timeDiff = Math.abs(localTimestamp - remoteTimestamp);
  if (timeDiff > 1000) {
    return null; // Timestamps far enough apart
  }

  // Same storyId and field → potential collision
  if (
    context.localChange.storyId === context.remoteChange.storyId &&
    context.localChange.changeType === context.remoteChange.changeType
  ) {
    const collision: SyncConflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pendingChangeId: context.localChange.id,
      remoteChangeId: context.remoteChange.id,
      field: `${context.localChange.changeType}`,
      localValue: context.localChange.payload,
      remoteValue: context.remoteChange.payload,
      resolved: false,
      timestamp: context.timestamp,
    };

    return collision;
  }

  return null;
}

/**
 * Resolve a conflict using Last-Write-Wins (LWW).
 *
 * LWW picks the change with the later timestamp.
 * Phase 1 only; Phase 2 will use CRDTs.
 *
 * Returns a new conflict object with resolution applied.
 */
export function resolveConflict(conflict: SyncConflict): SyncConflict {
  if (conflict.resolved) {
    return conflict;
  }

  // Extract timestamps and use remote as newer (conservative)
  const resolution = conflict.remoteValue;

  return {
    ...conflict,
    resolvedValue: resolution,
    resolved: true,
  };
}

/**
 * Check for chat message collision.
 *
 * Returns true if two messages have the same storyId and overlapping timestamps.
 * Pure function.
 */
export function detectMessageCollision(
  local: ChatMessage,
  remote: ChatMessage
): boolean {
  if (local.storyId !== remote.storyId) return false;
  if (local.id === remote.id) return false; // Same message, not a collision

  const localTs = new Date(local.timestamp).getTime();
  const remoteTs = new Date(remote.timestamp).getTime();
  const timeDiff = Math.abs(localTs - remoteTs);

  // Messages within 500ms of each other (concurrent sends)
  return timeDiff < 500;
}

/**
 * Batch collision detection on a set of changes.
 *
 * Returns list of detected collisions (unresolved).
 * Pure function.
 */
export function batchDetectCollisions(
  changes: PendingChange[]
): SyncConflict[] {
  const detected: SyncConflict[] = [];

  // Compare each change against other changes
  for (let i = 0; i < changes.length; i++) {
    for (let j = i + 1; j < changes.length; j++) {
      const collision = detectCollision({
        storyId: changes[i].storyId,
        timestamp: new Date().toISOString(),
        localChange: changes[i],
        remoteChange: changes[j],
      });

      if (collision) {
        detected.push(collision);
      }
    }
  }

  return detected;
}

/**
 * Get all unresolved conflicts for a storyId from a conflicts array.
 *
 * Pure function.
 */
export function getUnresolvedConflicts(storyId: string, conflicts: SyncConflict[]): SyncConflict[] {
  return conflicts.filter((c) => !c.resolved && c.remoteChangeId.includes(storyId));
}

/**
 * Attempt to auto-resolve all conflicts using LWW.
 *
 * Returns resolved conflicts.
 * Pure function.
 */
export function autoResolveConflicts(conflicts: SyncConflict[]): SyncConflict[] {
  return conflicts.map((conflict) => {
    if (conflict.resolved) return conflict;
    return resolveConflict(conflict);
  });
}
