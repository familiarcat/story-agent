/**
 * Sync Manager for VSCode chat integration with Zustand store.
 *
 * Handles batching and queueing of store updates:
 * - User actions (send, stop) → immediate sync
 * - Metadata (tokens, latency) → batch every 300ms
 * - Keystrokes → buffer + batch on idle
 *
 * Phase 1: Mock batching to in-memory queue (no WebSocket yet)
 * Phase 2: Real WebSocket push + collision detection
 *
 * Type imports only (to avoid runtime dependency on @story-agent/ui at extension load time).
 * Phase 2 will integrate via MCP bridge.
 */

import type { ChatMessage, PendingChange } from './types';

export interface SyncManagerConfig {
  batchIntervalMs: number;
  idleThresholdMs: number;
  maxBatchSize: number;
}

export interface SyncMessage {
  type: 'chat_message' | 'metadata' | 'keystroke' | 'user_action';
  storyId: string;
  payload: unknown;
  timestamp: string;
  priority: 'high' | 'low';
}

/**
 * Callback invoked when a batch is ready for syncing.
 * Phase 1: Logs to console. Phase 2: Push to WebSocket.
 */
export type SyncBatchCallback = (storyId: string, messages: SyncMessage[]) => void;

const DEFAULT_CONFIG: SyncManagerConfig = {
  batchIntervalMs: 300,
  idleThresholdMs: 300,
  maxBatchSize: 50,
};

/**
 * Sync Manager — batches and queues messages for Phase 2 WebSocket delivery.
 *
 * Phase 1: In-memory batching; stores messages locally; invokes callback on flush.
 * Phase 2: WebSocket push + receipt tracking + collision detection.
 */
class SyncManagerImpl {
  private config: SyncManagerConfig;
  private messageBatch: Map<string, SyncMessage[]> = new Map(); // keyed by storyId
  private batchTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private lastKeystrokeTime = 0;
  private flushCallback: SyncBatchCallback | null = null;

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a callback to be invoked when batches are ready.
   */
  onBatchReady(callback: SyncBatchCallback): void {
    this.flushCallback = callback;
  }

  /**
   * Queue a sync message. High-priority messages (user_action) flush immediately.
   * Lower-priority messages (metadata, keystrokes) batch.
   */
  queueSyncMessage(message: SyncMessage): void {
    const storyId = message.storyId;

    // Ensure batch exists for this storyId
    if (!this.messageBatch.has(storyId)) {
      this.messageBatch.set(storyId, []);
    }

    const batch = this.messageBatch.get(storyId)!;
    batch.push(message);

    // High-priority: flush immediately
    if (message.priority === 'high') {
      this.flushBatch(storyId);
      return;
    }

    // Low-priority: batch with timer
    if (batch.length >= this.config.maxBatchSize) {
      this.flushBatch(storyId);
      return;
    }

    // Set batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushAllBatches();
      }, this.config.batchIntervalMs);
    }

    // For keystrokes, reset idle timer
    if (message.type === 'keystroke') {
      this.lastKeystrokeTime = Date.now();
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.flushAllBatches();
      }, this.config.idleThresholdMs);
    }
  }

  /**
   * Flush a specific storyId's batch.
   * Phase 1: Call callback. Phase 2: Push to WebSocket.
   */
  flushBatch(storyId: string): void {
    const batch = this.messageBatch.get(storyId);
    if (!batch || batch.length === 0) return;

    // Invoke callback (Phase 1: console log; Phase 2: WebSocket)
    if (this.flushCallback) {
      try {
        this.flushCallback(storyId, batch);
      } catch (err) {
        console.warn('[SyncManager] Flush callback error:', err);
      }
    } else {
      // Phase 1: Default logging
      console.debug(`[SyncManager] Batch ready for ${storyId}: ${batch.length} messages`, batch);
    }

    // Clear batch
    this.messageBatch.delete(storyId);
  }

  /**
   * Flush all pending batches.
   */
  flushAllBatches(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    for (const storyId of this.messageBatch.keys()) {
      this.flushBatch(storyId);
    }
  }

  /**
   * Get current batch sizes by storyId (for diagnostics).
   */
  getBatchStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    for (const [storyId, batch] of this.messageBatch.entries()) {
      status[storyId] = batch.length;
    }
    return status;
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.messageBatch.clear();
  }
}

let syncManager: SyncManagerImpl | null = null;

/**
 * Initialize the sync manager (call once on extension activation).
 */
export function initSyncManager(config?: Partial<SyncManagerConfig>): SyncManagerImpl {
  if (syncManager) return syncManager;
  syncManager = new SyncManagerImpl(config);
  return syncManager;
}

/**
 * Get the current sync manager (must call initSyncManager first).
 */
export function getSyncManager(): SyncManagerImpl {
  if (!syncManager) {
    throw new Error('[SyncManager] Not initialized. Call initSyncManager() first.');
  }
  return syncManager;
}

/**
 * Queue a chat message sync (high priority).
 */
export function queueChatMessage(storyId: string, message: ChatMessage): void {
  getSyncManager().queueSyncMessage({
    type: 'chat_message',
    storyId,
    payload: message,
    timestamp: new Date().toISOString(),
    priority: 'high',
  });
}

/**
 * Queue metadata sync (low priority, batched).
 */
export function queueMetadata(
  storyId: string,
  metadata: { tokensIn?: number; tokensOut?: number; latencyMs?: number; model?: string }
): void {
  getSyncManager().queueSyncMessage({
    type: 'metadata',
    storyId,
    payload: metadata,
    timestamp: new Date().toISOString(),
    priority: 'low',
  });
}

/**
 * Queue keystroke event (low priority, batched on idle).
 */
export function queueKeystroke(storyId: string): void {
  getSyncManager().queueSyncMessage({
    type: 'keystroke',
    storyId,
    payload: { count: 1 },
    timestamp: new Date().toISOString(),
    priority: 'low',
  });
}

/**
 * Queue user action (high priority, immediate flush).
 */
export function queueUserAction(storyId: string, action: 'send' | 'stop' | 'clear'): void {
  getSyncManager().queueSyncMessage({
    type: 'user_action',
    storyId,
    payload: { action },
    timestamp: new Date().toISOString(),
    priority: 'high',
  });
}

/**
 * Manually flush all batches.
 */
export function flushBatch(): void {
  getSyncManager().flushAllBatches();
}

/**
 * Get batch diagnostics.
 */
export function getBatchStatus(): Record<string, number> {
  return getSyncManager().getBatchStatus();
}

/**
 * Dispose sync manager.
 */
export function disposeSyncManager(): void {
  if (syncManager) {
    syncManager.dispose();
    syncManager = null;
  }
}

