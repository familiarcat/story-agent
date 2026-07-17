/**
 * Test skeleton for sync-manager.ts (Phase 1).
 *
 * Phase 1: Mock store integration, batch queueing.
 * Phase 2: Real WebSocket delivery + receipt tracking.
 *
 * NOTE: This is a test skeleton. To run, add vitest to vscode-extension package.json.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChatMessage } from './types';
import {
  initSyncManager,
  getSyncManager,
  disposeSyncManager,
  queueChatMessage,
  queueMetadata,
  queueKeystroke,
  queueUserAction,
  flushBatch,
  getBatchStatus,
} from './sync-manager';

describe('SyncManager', () => {
  beforeEach(() => {
    // Reset sync manager before each test
    disposeSyncManager();
    initSyncManager({ batchIntervalMs: 50, idleThresholdMs: 50 });
  });

  afterEach(() => {
    disposeSyncManager();
  });

  describe('initialization', () => {
    it('should initialize sync manager with defaults', () => {
      const manager = getSyncManager();
      expect(manager).toBeDefined();
    });

    it('should initialize with custom config', () => {
      disposeSyncManager();
      const manager = initSyncManager({ batchIntervalMs: 100, maxBatchSize: 10 });
      expect(manager).toBeDefined();
    });

    it('should throw if not initialized', () => {
      disposeSyncManager();
      expect(() => getSyncManager()).toThrow();
    });
  });

  describe('queueing', () => {
    it('should queue a chat message (high priority)', () => {
      const manager = getSyncManager();
      let batchCallbackCalled = false;

      manager.onBatchReady(() => {
        batchCallbackCalled = true;
      });

      const msg: ChatMessage = {
        id: 'msg-1',
        storyId: 'story-1',
        crewMemberId: 'user',
        role: 'user',
        content: 'hello',
        timestamp: new Date().toISOString(),
      };

      queueChatMessage('story-1', msg);

      // High-priority should flush immediately
      expect(batchCallbackCalled).toBe(true);
    });

    it('should batch metadata messages (low priority)', (done: any) => {
      const manager = getSyncManager();
      let flushCount = 0;

      manager.onBatchReady(() => {
        flushCount++;
      });

      queueMetadata('story-1', { tokensIn: 100, tokensOut: 50 });
      queueMetadata('story-1', { latencyMs: 250 });

      expect(flushCount).toBe(0); // Not flushed yet

      // Wait for batch timeout
      setTimeout(() => {
        expect(flushCount).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should report batch status', () => {
      queueKeystroke('story-1');
      queueKeystroke('story-1');

      const status = getBatchStatus();
      expect(status['story-1']).toBe(2);
    });
  });

  describe('user actions', () => {
    it('should queue user action (send)', () => {
      const manager = getSyncManager();
      let batchCallbackCalled = false;

      manager.onBatchReady(() => {
        batchCallbackCalled = true;
      });

      queueUserAction('story-1', 'send');

      // High-priority action should flush immediately
      expect(batchCallbackCalled).toBe(true);
    });

    it('should queue user action (stop)', () => {
      const manager = getSyncManager();
      let batchCallbackCalled = false;
      let storyIdReceived = '';

      manager.onBatchReady((storyId) => {
        batchCallbackCalled = true;
        storyIdReceived = storyId;
      });

      queueUserAction('story-1', 'stop');

      expect(batchCallbackCalled).toBe(true);
      expect(storyIdReceived).toBe('story-1');
    });
  });

  describe('manual flush', () => {
    it('should flush all batches manually', (done: any) => {
      const manager = getSyncManager();
      let flushCount = 0;

      manager.onBatchReady(() => {
        flushCount++;
      });

      queueMetadata('story-1', { tokensIn: 100 });
      queueMetadata('story-2', { tokensOut: 50 });

      flushBatch();

      setTimeout(() => {
        expect(flushCount).toBeGreaterThan(0);
        const status = getBatchStatus();
        expect(status['story-1']).toBeUndefined();
        expect(status['story-2']).toBeUndefined();
        done();
      }, 50);
    });
  });

  describe('disposal', () => {
    it('should dispose resources', () => {
      const manager = getSyncManager();
      expect(manager).toBeDefined();

      disposeSyncManager();

      expect(() => getSyncManager()).toThrow();
    });
  });
});
