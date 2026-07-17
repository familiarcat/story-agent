/**
 * SyncConnectionPool — manages active WebSocket connections for real-time UI synchronization.
 *
 * Features:
 * - Per-session connection tracking (userId + sessionId)
 * - Automatic session cleanup (5-min inactivity)
 * - Connection validation via heartbeat (30s)
 * - Broadcast messaging (deliver to all surfaces for a user)
 * - Error recovery + reconnection support
 * - Metrics collection (latency, message count)
 * - Type-safe connection metadata
 *
 * Performance targets:
 * - Connection setup: <500ms
 * - Broadcast latency: P50 <50ms, P99 <200ms
 * - Memory per connection: <500KB
 */

import type { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

/**
 * Metadata tracking for an active connection.
 */
export interface SyncConnection {
  /** Unique connection ID (UUID) */
  connectionId: string;
  /** WebSocket instance */
  ws: WebSocket;
  /** Session ID (identifies a logical session across reconnections) */
  sessionId: string;
  /** User ID owning this session */
  userId: string;
  /** Client ID for org-level isolation */
  clientId?: string;
  /** Surface identifier (vscode, web, cli) */
  surface: 'vscode' | 'web' | 'cli';
  /** Connection established timestamp */
  connectedAt: Date;
  /** Last activity (message received or heartbeat ack) */
  lastActivityAt: Date;
  /** Outgoing message counter */
  messagesSent: number;
  /** Incoming message counter */
  messagesReceived: number;
  /** Latency samples (milliseconds) */
  latencySamples: number[];
  /** Error count for this connection */
  errorCount: number;
  /** Is reconnection pending? */
  reconnecting: boolean;
}

/**
 * SyncConnectionPool manages all active connections.
 * Provides session-aware broadcast, cleanup, and metrics.
 */
export class SyncConnectionPool {
  /** connections: connectionId → SyncConnection */
  private connections: Map<string, SyncConnection> = new Map();

  /** sessions: sessionId → Set<connectionId> (same session may have multiple surfaces) */
  private sessions: Map<string, Set<string>> = new Map();

  /** userSessions: userId → Set<sessionId> (track all user sessions) */
  private userSessions: Map<string, Set<string>> = new Map();

  /** Cleanup timer for stale session sweeps */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** Heartbeat timer (ping all connections) */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /** Configuration */
  private config = {
    maxConnections: 100,
    inactivityThresholdMs: 5 * 60 * 1000, // 5 minutes
    heartbeatIntervalMs: 30 * 1000, // 30 seconds
    cleanupIntervalMs: 30 * 1000, // 30 seconds
    maxLatencySamples: 100,
  };

  /**
   * Register a new connection.
   * Returns the connection object if successful, null if pool is full.
   */
  registerConnection(ws: WebSocket, sessionId: string, userId: string, surface: 'vscode' | 'web' | 'cli', clientId?: string): SyncConnection | null {
    // Check pool capacity
    if (this.connections.size >= this.config.maxConnections) {
      return null;
    }

    const connectionId = randomUUID();
    const now = new Date();

    const conn: SyncConnection = {
      connectionId,
      ws,
      sessionId,
      userId,
      clientId,
      surface,
      connectedAt: now,
      lastActivityAt: now,
      messagesSent: 0,
      messagesReceived: 0,
      latencySamples: [],
      errorCount: 0,
      reconnecting: false,
    };

    this.connections.set(connectionId, conn);

    // Track session
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId)!.add(connectionId);

    // Track user
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    return conn;
  }

  /**
   * Unregister a connection (on close/error).
   */
  unregisterConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    this.connections.delete(connectionId);

    // Clean up session tracking
    const sessionConnections = this.sessions.get(conn.sessionId);
    if (sessionConnections) {
      sessionConnections.delete(connectionId);
      // Remove empty session
      if (sessionConnections.size === 0) {
        this.sessions.delete(conn.sessionId);
        // Remove from user sessions
        const userSessionIds = this.userSessions.get(conn.userId);
        if (userSessionIds) {
          userSessionIds.delete(conn.sessionId);
          if (userSessionIds.size === 0) {
            this.userSessions.delete(conn.userId);
          }
        }
      }
    }
  }

  /**
   * Get a connection by ID.
   */
  getConnection(connectionId: string): SyncConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections for a session.
   */
  getSessionConnections(sessionId: string): SyncConnection[] {
    const connectionIds = this.sessions.get(sessionId);
    if (!connectionIds) return [];
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => !!conn) as SyncConnection[];
  }

  /**
   * Get all sessions for a user.
   */
  getUserSessions(userId: string): SyncConnection[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    const result: SyncConnection[] = [];
    for (const sessionId of sessionIds) {
      const conns = this.getSessionConnections(sessionId);
      result.push(...conns);
    }
    return result;
  }

  /**
   * Broadcast a message to all connections in a session.
   * Returns the number of successful deliveries.
   */
  broadcastToSession(sessionId: string, message: Buffer | string): number {
    const connections = this.getSessionConnections(sessionId);
    let delivered = 0;

    for (const conn of connections) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        try {
          conn.ws.send(message);
          conn.messagesSent++;
          delivered++;
        } catch (err) {
          console.error(`[SyncPool] Broadcast error (${conn.connectionId}):`, err instanceof Error ? err.message : String(err));
          conn.errorCount++;
        }
      }
    }

    return delivered;
  }

  /**
   * Broadcast to all connections for a user across all sessions.
   */
  broadcastToUser(userId: string, message: Buffer | string): number {
    const connections = this.getUserSessions(userId);
    let delivered = 0;

    for (const conn of connections) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        try {
          conn.ws.send(message);
          conn.messagesSent++;
          delivered++;
        } catch (err) {
          console.error(`[SyncPool] Broadcast error (${conn.connectionId}):`, err instanceof Error ? err.message : String(err));
          conn.errorCount++;
        }
      }
    }

    return delivered;
  }

  /**
   * Broadcast to all connections in the pool.
   */
  broadcastAll(message: Buffer | string): number {
    let delivered = 0;

    for (const conn of this.connections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        try {
          conn.ws.send(message);
          conn.messagesSent++;
          delivered++;
        } catch (err) {
          console.error(`[SyncPool] Broadcast error (${conn.connectionId}):`, err instanceof Error ? err.message : String(err));
          conn.errorCount++;
        }
      }
    }

    return delivered;
  }

  /**
   * Record a latency sample for a connection.
   */
  recordLatency(connectionId: string, latencyMs: number): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    conn.latencySamples.push(latencyMs);
    if (conn.latencySamples.length > this.config.maxLatencySamples) {
      conn.latencySamples.shift();
    }
  }

  /**
   * Update last activity time for a connection.
   */
  updateActivity(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastActivityAt = new Date();
    }
  }

  /**
   * Record a message received.
   */
  recordMessageReceived(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.messagesReceived++;
      conn.lastActivityAt = new Date();
    }
  }

  /**
   * Record an error on a connection.
   */
  recordError(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.errorCount++;
    }
  }

  /**
   * Start automatic cleanup (removes stale sessions).
   */
  startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStale();
    }, this.config.cleanupIntervalMs);

    console.log('[SyncPool] Cleanup started (interval: ' + this.config.cleanupIntervalMs + 'ms)');
  }

  /**
   * Stop automatic cleanup.
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Remove stale connections (no activity for 5 minutes).
   */
  private cleanupStale(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, conn] of this.connections.entries()) {
      const inactiveMs = now.getTime() - conn.lastActivityAt.getTime();
      if (inactiveMs > this.config.inactivityThresholdMs) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      const conn = this.connections.get(connectionId);
      if (conn && conn.ws.readyState === conn.ws.OPEN) {
        console.log(`[SyncPool] Closing stale connection: ${connectionId.slice(0, 8)}`);
        conn.ws.close(1000, 'inactivity_timeout');
      }
    }
  }

  /**
   * Start heartbeat (ping all connections).
   */
  startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);

    console.log('[SyncPool] Heartbeat started (interval: ' + this.config.heartbeatIntervalMs + 'ms)');
  }

  /**
   * Stop heartbeat.
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send ping to all open connections.
   */
  private sendHeartbeat(): void {
    let pinged = 0;
    for (const conn of this.connections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        try {
          conn.ws.ping();
          pinged++;
        } catch (err) {
          console.error(`[SyncPool] Heartbeat error (${conn.connectionId}):`, err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  /**
   * Get current pool metrics.
   */
  getMetrics() {
    const allConnections = Array.from(this.connections.values());
    const latencySamples = allConnections
      .flatMap(c => c.latencySamples)
      .sort((a, b) => a - b);

    const getPercentile = (samples: number[], p: number): number => {
      if (samples.length === 0) return 0;
      const idx = Math.ceil((p / 100) * samples.length) - 1;
      return samples[Math.max(0, idx)];
    };

    return {
      activeConnections: this.connections.size,
      activeSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      maxConnections: this.config.maxConnections,
      utilization: (this.connections.size / this.config.maxConnections) * 100,
      totalMessagesSent: allConnections.reduce((sum, c) => sum + c.messagesSent, 0),
      totalMessagesReceived: allConnections.reduce((sum, c) => sum + c.messagesReceived, 0),
      totalErrors: allConnections.reduce((sum, c) => sum + c.errorCount, 0),
      latency: {
        count: latencySamples.length,
        p50: getPercentile(latencySamples, 50),
        p95: getPercentile(latencySamples, 95),
        p99: getPercentile(latencySamples, 99),
      },
      surfaceDistribution: {
        vscode: allConnections.filter(c => c.surface === 'vscode').length,
        web: allConnections.filter(c => c.surface === 'web').length,
        cli: allConnections.filter(c => c.surface === 'cli').length,
      },
    };
  }

  /**
   * Close all connections and cleanup.
   */
  closeAll(): void {
    this.stopHeartbeat();
    this.stopCleanup();

    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      const conn = this.connections.get(connectionId);
      if (conn && conn.ws.readyState === conn.ws.OPEN) {
        try {
          conn.ws.close(1000, 'pool_shutdown');
        } catch (err) {
          // ignore
        }
      }
      this.unregisterConnection(connectionId);
    }

    console.log('[SyncPool] All connections closed');
  }

  /**
   * Get detailed connection info for debugging.
   */
  getConnectionInfo(connectionId: string): Record<string, any> | null {
    const conn = this.connections.get(connectionId);
    if (!conn) return null;

    const avgLatency = conn.latencySamples.length > 0
      ? conn.latencySamples.reduce((a, b) => a + b, 0) / conn.latencySamples.length
      : 0;

    return {
      connectionId,
      sessionId: conn.sessionId,
      userId: conn.userId,
      clientId: conn.clientId,
      surface: conn.surface,
      connectedAt: conn.connectedAt.toISOString(),
      lastActivityAt: conn.lastActivityAt.getTime(),
      messagesSent: conn.messagesSent,
      messagesReceived: conn.messagesReceived,
      errorCount: conn.errorCount,
      avgLatencyMs: Math.round(avgLatency),
      reconnecting: conn.reconnecting,
    };
  }
}

/**
 * Export a singleton instance for module-level use.
 */
export const defaultSyncPool = new SyncConnectionPool();
