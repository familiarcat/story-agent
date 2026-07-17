/**
 * SyncMessageQueue Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncMessageQueue } from '../lib/sync-message-queue.js';

describe('SyncMessageQueue', () => {
  let queue: SyncMessageQueue;

  beforeEach(() => {
    queue = new SyncMessageQueue();
  });

  afterEach(() => {
    queue.close();
  });

  it('should enqueue and dequeue messages', () => {
    const success = queue.enqueue('session-1', 'payload-1');
    expect(success).toBe(true);

    expect(queue.getQueueLength('session-1')).toBe(1);

    const messages = queue.dequeueAll('session-1');
    expect(messages.length).toBe(1);
    expect(messages[0].payload).toBe('payload-1');
    expect(messages[0].priority).toBe('high');
  });

  it('should maintain message order', () => {
    queue.enqueue('session-1', 'msg-1');
    queue.enqueue('session-1', 'msg-2');
    queue.enqueue('session-1', 'msg-3');

    const messages = queue.dequeueAll('session-1');
    expect(messages.map(m => m.payload)).toEqual(['msg-1', 'msg-2', 'msg-3']);
  });

  it('should deduplicate messages', () => {
    const msgId = 'dup-msg';
    const success1 = queue.enqueue('session-1', 'payload', 'high', msgId);
    const success2 = queue.enqueue('session-1', 'payload', 'high', msgId);

    expect(success1).toBe(true);
    expect(success2).toBe(false);
    expect(queue.getQueueLength('session-1')).toBe(1);
  });

  it('should reject low-priority messages when full', () => {
    // Artificially set small max size
    (queue as any).config.maxQueueSizeBytes = 50;

    const success1 = queue.enqueue('session-1', 'high-priority-msg', 'high');
    expect(success1).toBe(true);

    const success2 = queue.enqueue('session-1', 'x'.repeat(100), 'low');
    expect(success2).toBe(false);
  });

  it('should allow high-priority messages to drop low-priority', () => {
    (queue as any).config.maxQueueSizeBytes = 100;

    // Fill with low-priority
    queue.enqueue('session-1', 'x'.repeat(40), 'low');
    queue.enqueue('session-1', 'x'.repeat(40), 'low');

    // High-priority should succeed by dropping low-priority
    const success = queue.enqueue('session-1', 'x'.repeat(50), 'high');
    expect(success).toBe(true);
  });

  it('should peek without removing', () => {
    queue.enqueue('session-1', 'msg-1');
    queue.enqueue('session-1', 'msg-2');

    const peeked = queue.peek('session-1', 10);
    expect(peeked.length).toBe(2);

    // Queue should still have both
    expect(queue.getQueueLength('session-1')).toBe(2);
  });

  it('should clear queue', () => {
    queue.enqueue('session-1', 'msg-1');
    queue.enqueue('session-1', 'msg-2');

    queue.clear('session-1');
    expect(queue.getQueueLength('session-1')).toBe(0);
    expect(queue.getQueueSize('session-1')).toBe(0);
  });

  it('should return metrics', () => {
    queue.enqueue('session-1', 'msg-1', 'high');
    queue.enqueue('session-1', 'msg-2', 'low');
    queue.enqueue('session-2', 'msg-3', 'high');

    const metrics = queue.getMetrics();
    expect(metrics.activeSessions).toBe(2);
    expect(metrics.totalMessages).toBe(3);
    expect(metrics.sessionMetrics['session-1'].messageCount).toBe(2);
    expect(metrics.sessionMetrics['session-1'].priorityDistribution.high).toBe(1);
    expect(metrics.sessionMetrics['session-1'].priorityDistribution.low).toBe(1);
  });

  it('should handle large payloads', () => {
    const largePayload = 'x'.repeat(1000);
    const success = queue.enqueue('session-1', largePayload);
    expect(success).toBe(true);

    const messages = queue.dequeueAll('session-1');
    expect(messages[0].sizeBytes).toBe(1000);
  });
});
