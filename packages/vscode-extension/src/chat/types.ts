/**
 * Type definitions for VSCode sync manager.
 *
 * These types mirror the Zustand store schema from @story-agent/ui
 * for Phase 1B. Phase 2 will integrate via the MCP interface.
 */

/**
 * Chat message (mirrors Zustand store).
 */
export interface ChatMessage {
  id: string;
  storyId: string;
  crewMemberId: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Pending sync change (mirrors Zustand store).
 */
export interface PendingChange {
  id: string;
  syncId: string;
  storyId: string;
  changeType: 'story_update' | 'chat_message' | 'crew_status' | 'metadata_change';
  payload: unknown;
  timestamp: string;
  retries: number;
  maxRetries: number;
}

/**
 * Sync conflict (mirrors Zustand store).
 */
export interface SyncConflict {
  id: string;
  pendingChangeId: string;
  remoteChangeId: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  resolvedValue?: unknown;
  resolved: boolean;
  timestamp: string;
}
