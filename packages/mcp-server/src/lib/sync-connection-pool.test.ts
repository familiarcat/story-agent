/**
 * SyncConnectionPool Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncConnectionPool } from '../lib/sync-connection-pool.js';
import type { WebSocket } from 'ws';

// Mock WebSocket
class MockWebSocket {
  public OPEN = 1;
  public CLOSED = 3;
  public readyState: number;
  public sent: string[] = [];

  constructor() {
    this.readyState = this.OPEN;
  }

  send(data: string | Buffer) {
    if (this.readyState === this.OPEN) {
      this.sent.push(typeof data === 'string' ? data : data.toString());
    }
  }

  close() {
    this.readyState = this.CLOSED;
  }

  ping() {
    // noop
  }
}

describe('SyncConnectionPool', () => {
  let pool: SyncConnectionPool;

  beforeEach(() => {
    pool = new SyncConnectionPool();
  });

  afterEach(() => {
    pool.closeAll();
  });

  it('should register and retrieve connections', () => {
    const ws = new MockWebSocket() as any;
    const conn = pool.registerConnection(ws, 'session-1', 'user-1', 'vscode');

    expect(conn).toBeDefined();
    expect(conn?.userId).toBe('user-1');
    expect(conn?.sessionId).toBe('session-1');
    expect(conn?.surface).toBe('vscode');

    const retrieved = pool.getConnection(conn!.connectionId);
    expect(retrieved).toBe(conn);
  });

  it('should return null when pool is full', () => {
    const pool2 = new SyncConnectionPool();
    (pool2 as any).config.maxConnections = 1;

    const ws1 = new MockWebSocket() as any;
    const conn1 = pool2.registerConnection(ws1, 'session-1', 'user-1', 'vscode');
    expect(conn1).toBeDefined();

    const ws2 = new MockWebSocket() as any;
    const conn2 = pool2.registerConnection(ws2, 'session-2', 'user-2', 'web');
    expect(conn2).toBeNull();

    pool2.closeAll();
  });

  it('should track session connections', () => {
    const ws1 = new MockWebSocket() as any;
    const conn1 = pool.registerConnection(ws1, 'session-1', 'user-1', 'vscode');

    const ws2 = new MockWebSocket() as any;
    const conn2 = pool.registerConnection(ws2, 'session-1', 'user-1', 'web');

    const sessionConns = pool.getSessionConnections('session-1');
    expect(sessionConns.length).toBe(2);
    expect(sessionConns.map(c => c.connectionId)).toContain(conn1?.connectionId);
    expect(sessionConns.map(c => c.connectionId)).toContain(conn2?.connectionId);
  });

  it('should broadcast to session', () => {
    const ws1 = new MockWebSocket() as any;
    const conn1 = pool.registerConnection(ws1, 'session-1', 'user-1', 'vscode');

    const ws2 = new MockWebSocket() as any;
    const conn2 = pool.registerConnection(ws2, 'session-1', 'user-1', 'web');

    const delivered = pool.broadcastToSession('session-1', 'test message');
    expect(delivered).toBe(2);
    expect(ws1.sent.length).toBe(1);
    expect(ws2.sent.length).toBe(1);
  });

  it('should record latency samples', () => {
    const ws = new MockWebSocket() as any;
    const conn = pool.registerConnection(ws, 'session-1', 'user-1', 'vscode')!;

    pool.recordLatency(conn.connectionId, 42);
    pool.recordLatency(conn.connectionId, 38);

    const updated = pool.getConnection(conn.connectionId)!;
    expect(updated.latencySamples).toEqual([42, 38]);
  });

  it('should return metrics', () => {
    const ws1 = new MockWebSocket() as any;
    pool.registerConnection(ws1, 'session-1', 'user-1', 'vscode');

    const ws2 = new MockWebSocket() as any;
    pool.registerConnection(ws2, 'session-1', 'user-1', 'web');

    const metrics = pool.getMetrics();
    expect(metrics.activeConnections).toBe(2);
    expect(metrics.activeSessions).toBe(1);
    expect(metrics.surfaceDistribution.vscode).toBe(1);
    expect(metrics.surfaceDistribution.web).toBe(1);
  });

  it('should unregister connections', () => {
    const ws = new MockWebSocket() as any;
    const conn = pool.registerConnection(ws, 'session-1', 'user-1', 'vscode')!;

    pool.unregisterConnection(conn.connectionId);

    const retrieved = pool.getConnection(conn.connectionId);
    expect(retrieved).toBeUndefined();
  });
});
