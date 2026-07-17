/**
 * Test skeleton for conflict-detector.ts (Phase 1).
 *
 * Phase 1: Last-Write-Wins (LWW) collision detection.
 * Phase 2: Vector clocks + operational transformation.
 *
 * NOTE: This is a test skeleton. To run, add vitest to vscode-extension package.json.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ChatMessage, SyncConflict, PendingChange } from './types';
import {
  detectCollision,
  resolveConflict,
  detectMessageCollision,
  batchDetectCollisions,
  getUnresolvedConflicts,
  autoResolveConflicts,
} from './conflict-detector';

describe('ConflictDetector', () => {
  beforeEach(() => {
    // Pure functions; no setup needed
  });

  describe('collision detection', () => {
    it('should detect collision on overlapping timestamps', () => {
      const now = new Date().toISOString();

      const change1: PendingChange = {
        id: 'c1',
        syncId: 's1',
        storyId: 'story-1',
        changeType: 'chat_message',
        payload: { msg: 'hello' },
        timestamp: now,
        retries: 0,
        maxRetries: 3,
      };

      const change2: PendingChange = {
        id: 'c2',
        syncId: 's2',
        storyId: 'story-1',
        changeType: 'chat_message',
        payload: { msg: 'world' },
        timestamp: new Date(new Date(now).getTime() + 500).toISOString(), // 500ms later
        retries: 0,
        maxRetries: 3,
      };

      const collision = detectCollision({
        storyId: 'story-1',
        timestamp: now,
        localChange: change1,
        remoteChange: change2,
      });

      expect(collision).toBeDefined();
      expect(collision?.field).toBe('chat_message');
      expect(collision?.pendingChangeId).toBe('c1');
      expect(collision?.remoteChangeId).toBe('c2');
    });

    it('should not detect collision on far apart timestamps', () => {
      const now = new Date().toISOString();

      const change1: PendingChange = {
        id: 'c1',
        syncId: 's1',
        storyId: 'story-1',
        changeType: 'chat_message',
        payload: { msg: 'hello' },
        timestamp: now,
        retries: 0,
        maxRetries: 3,
      };

      const change2: PendingChange = {
        id: 'c2',
        syncId: 's2',
        storyId: 'story-1',
        changeType: 'chat_message',
        payload: { msg: 'world' },
        timestamp: new Date(new Date(now).getTime() + 2000).toISOString(), // 2s later
        retries: 0,
        maxRetries: 3,
      };

      const collision = detectCollision({
        storyId: 'story-1',
        timestamp: now,
        localChange: change1,
        remoteChange: change2,
      });

      expect(collision).toBeNull();
    });

    it('should not detect collision on different storyIds', () => {
      const now = new Date().toISOString();

      const change1: PendingChange = {
        id: 'c1',
        syncId: 's1',
        storyId: 'story-1',
        changeType: 'chat_message',
        payload: { msg: 'hello' },
        timestamp: now,
        retries: 0,
        maxRetries: 3,
      };

      const change2: PendingChange = {
        id: 'c2',
        syncId: 's2',
        storyId: 'story-2', // Different story
        changeType: 'chat_message',
        payload: { msg: 'world' },
        timestamp: now,
        retries: 0,
        maxRetries: 3,
      };

      const collision = detectCollision({
        storyId: 'story-1',
        timestamp: now,
        localChange: change1,
        remoteChange: change2,
      });

      expect(collision).toBeNull();
    });
  });

  describe('conflict resolution (LWW)', () => {
    it('should resolve conflict using Last-Write-Wins', () => {
      const conflict: SyncConflict = {
        id: 'conflict-1',
        pendingChangeId: 'c1',
        remoteChangeId: 'c2',
        field: 'content',
        localValue: 'local-text',
        remoteValue: 'remote-text', // Remote (newer) wins in LWW
        resolved: false,
        timestamp: new Date().toISOString(),
      };

      const resolved = resolveConflict(conflict);

      expect(resolved.resolved).toBe(true);
      expect(resolved.resolvedValue).toBe('remote-text');
    });

    it('should skip already-resolved conflicts', () => {
      const conflict: SyncConflict = {
        id: 'conflict-1',
        pendingChangeId: 'c1',
        remoteChangeId: 'c2',
        field: 'content',
        localValue: 'local',
        remoteValue: 'remote',
        resolvedValue: 'remote',
        resolved: true,
        timestamp: new Date().toISOString(),
      };

      const result = resolveConflict(conflict);

      expect(result.resolved).toBe(true);
    });
  });

  describe('message collision detection', () => {
    it('should detect concurrent message sends', () => {
      const now = new Date().toISOString();

      const msg1: ChatMessage = {
        id: 'msg-1',
        storyId: 'story-1',
        crewMemberId: 'user',
        role: 'user',
        content: 'hello',
        timestamp: now,
      };

      const msg2: ChatMessage = {
        id: 'msg-2',
        storyId: 'story-1',
        crewMemberId: 'assistant',
        role: 'assistant',
        content: 'hi',
        timestamp: new Date(new Date(now).getTime() + 200).toISOString(), // 200ms later
      };

      const collision = detectMessageCollision(msg1, msg2);
      expect(collision).toBe(true);
    });

    it('should not detect collision on same message ID', () => {
      const now = new Date().toISOString();

      const msg1: ChatMessage = {
        id: 'msg-1',
        storyId: 'story-1',
        crewMemberId: 'user',
        role: 'user',
        content: 'hello',
        timestamp: now,
      };

      const collision = detectMessageCollision(msg1, msg1);
      expect(collision).toBe(false);
    });

    it('should not detect collision on different storyIds', () => {
      const now = new Date().toISOString();

      const msg1: ChatMessage = {
        id: 'msg-1',
        storyId: 'story-1',
        crewMemberId: 'user',
        role: 'user',
        content: 'hello',
        timestamp: now,
      };

      const msg2: ChatMessage = {
        id: 'msg-2',
        storyId: 'story-2', // Different story
        crewMemberId: 'assistant',
        role: 'assistant',
        content: 'hi',
        timestamp: now,
      };

      const collision = detectMessageCollision(msg1, msg2);
      expect(collision).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('should batch detect collisions', () => {
      const now = new Date().toISOString();

      const changes: PendingChange[] = [
        {
          id: 'c1',
          syncId: 's1',
          storyId: 'story-1',
          changeType: 'chat_message',
          payload: { msg: 'a' },
          timestamp: now,
          retries: 0,
          maxRetries: 3,
        },
        {
          id: 'c2',
          syncId: 's2',
          storyId: 'story-1',
          changeType: 'chat_message',
          payload: { msg: 'b' },
          timestamp: new Date(new Date(now).getTime() + 200).toISOString(),
          retries: 0,
          maxRetries: 3,
        },
      ];

      const detected = batchDetectCollisions(changes);

      expect(detected.length).toBeGreaterThan(0);
    });

    it('should auto-resolve conflicts', () => {
      const conflicts: SyncConflict[] = [
        {
          id: 'conflict-1',
          pendingChangeId: 'c1',
          remoteChangeId: 'c2',
          field: 'content',
          localValue: 'local',
          remoteValue: 'remote',
          resolved: false,
          timestamp: new Date().toISOString(),
        },
      ];

      const resolved = autoResolveConflicts(conflicts);

      expect(resolved[0].resolved).toBe(true);
    });

    it('should get unresolved conflicts', () => {
      const conflicts: SyncConflict[] = [
        {
          id: 'conflict-1',
          pendingChangeId: 'c1',
          remoteChangeId: 'c2',
          field: 'content',
          localValue: 'local',
          remoteValue: 'remote',
          resolved: false,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'conflict-2',
          pendingChangeId: 'c3',
          remoteChangeId: 'c4',
          field: 'status',
          localValue: 'pending',
          remoteValue: 'done',
          resolved: true,
          timestamp: new Date().toISOString(),
        },
      ];

      const unresolved = getUnresolvedConflicts('story-1', conflicts);

      expect(unresolved.length).toBe(1);
    });
  });
});
