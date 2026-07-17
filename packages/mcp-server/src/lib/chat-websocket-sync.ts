/**
 * WebSocket Sync Endpoint — real-time UI state synchronization.
 *
 * This endpoint manages WebSocket connections from VSCode extension, web dashboard,
 * and CLI surfaces. It provides:
 *
 * - Real-time message delivery (P50 <50ms latency)
 * - Session persistence across reconnections
 * - Message buffering and replay on disconnect/reconnect
 * - Connection pooling (max 100 concurrent)
 * - Auto-reconnection support
 * - Metrics collection and health monitoring
 *
 * Protocol:
 * - Client connects: ws://sync-server/sync
 * - Client sends: { type: 'hello', sessionId, userId, surface: 'vscode'|'web'|'cli', clientId? }
 * - Server responds: { type: 'hello', connectionId, replayed: [ ...queuedMessages ] }
 * - Messages: { type: 'sync', payload: {...}, messageId?, priority? }
 * - Keepalive: ping/pong (automatic)
 * - Close: normal or with code 1000
 */

import type { WebSocket, RawData } from 'ws';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'node:crypto';
import { SyncConnectionPool, type SyncConnection } from './sync-connection-pool.js';
import { SyncMessageQueue } from './sync-message-queue.js';
import {
  createSessionJwt,
  validateSyncMessage,
  revokeSession,
  getSyncAuditLog,
  getSyncValidatorMetrics,
} from '@story-agent/shared';
import { getGlobalSyncRateLimiter, type RateLimitStatus } from './sync-rate-limiter.js';
import { getGlobalSyncAuditTrail } from './sync-audit-trail.js';

/**
 * Sync message protocol types.
 */
interface SyncHelloRequest {
  type: 'hello';
  sessionId: string;
  userId: string;
  crewId?: string;
  surface: 'vscode' | 'web' | 'cli';
  clientId?: string;
}

interface SyncHelloResponse {
  type: 'hello';
  connectionId: string;
  sessionId: string;
  jwt: string;
  expiresAt: string;
  refreshAt: string;
  timestamp: string;
  replayed: Array<{ messageId: string; payload: string; priority: string }>;
}

interface SyncMessage {
  type: 'sync';
  messageId?: string;
  jwt?: string;
  payload: Record<string, any>;
  priority?: 'high' | 'low';
  timestamp?: string;
}

interface SyncPingRequest {
  type: 'ping';
}

interface SyncPongResponse {
  type: 'pong';
  timestamp: string;
}

type SyncRequest = SyncHelloRequest | SyncMessage | SyncPingRequest;

/**
 * ChatWebSocketSync manages WebSocket connections for real-time UI sync.
 *
 * Usage:
 *   const sync = new ChatWebSocketSync();
 *   const server = http.createServer();
 *   sync.attach(server, '/sync');
 *   server.listen(3106);
 */
export class ChatWebSocketSync {
  private wss: WebSocketServer | null = null;
  private pool: SyncConnectionPool;
  private queue: SyncMessageQueue;
  private rateLimiter = getGlobalSyncRateLimiter();
  private auditTrail = getGlobalSyncAuditTrail();
  private config = {
    healthCheckIntervalMs: 60 * 1000, // 1 minute
  };
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(pool?: SyncConnectionPool, queue?: SyncMessageQueue) {
    this.pool = pool || new SyncConnectionPool();
    this.queue = queue || new SyncMessageQueue();
  }

  /**
   * Attach the WebSocket sync endpoint to an HTTP server.
   */
  attach(server: any, path: string = '/sync'): void {
    this.wss = new WebSocketServer({ server, path, perMessageDeflate: false });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req).catch((err) => {
        console.error('[ChatWebSocketSync] Connection handler error:', err instanceof Error ? err.message : String(err));
        try { ws.close(1011, 'handler_error'); } catch {}
      });
    });

    this.wss.on('error', (err) => {
      console.error('[ChatWebSocketSync] WebSocket server error:', err instanceof Error ? err.message : String(err));
    });

    this.pool.startCleanup();
    this.pool.startHeartbeat();
    this.queue.startCleanup();
    this.startHealthChecks();

    console.log(`[ChatWebSocketSync] Attached at ${path}`);
  }

  /**
   * Detach the sync endpoint (close all connections and cleanup).
   */
  detach(): void {
    this.stopHealthChecks();
    this.pool.closeAll();
    this.queue.close();

    if (this.wss) {
      this.wss.close(() => {
        console.log('[ChatWebSocketSync] Detached');
      });
      this.wss = null;
    }
  }

  /**
   * Handle a new WebSocket connection.
   *
   * Security gates:
   * 1. Validate hello message structure
   * 2. Check WorfGate credentials (CREW_LLM_APPROVED_KEY)
   * 3. Create session JWT (1 hour TTL, bound to sessionId)
   * 4. Register for rate limiting
   * 5. Audit the connection
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    let connectionId: string | null = null;
    let sessionId: string | null = null;
    let userId: string | null = null;
    let crewId: string | null = null;
    let jwt: string | null = null;

    try {
      // Expect first message to be 'hello' (with auth/metadata)
      ws.once('message', async (data: RawData) => {
        try {
          const hello = this.parseMessage(data) as SyncHelloRequest | null;

          if (!hello || hello.type !== 'hello') {
            this.auditTrail.log({
              messageId: 'unknown',
              userId: 'unknown',
              sessionId: 'unknown',
              action: 'hello',
              status: 'rejected',
              reason: 'invalid_hello_message',
            });
            ws.close(1002, 'expected_hello');
            return;
          }

          sessionId = hello.sessionId;
          userId = hello.userId;
          crewId = (hello.crewId || 'vscode-sync').toLowerCase();
          const surface = hello.surface;
          const clientId = hello.clientId;

          // Create session JWT (will throw if credential broker fails)
          let jwtResponse;
          try {
            jwtResponse = createSessionJwt(sessionId, crewId);
            jwt = jwtResponse.token;
          } catch (e: any) {
            // Credential broker failed — 401 Unauthorized
            this.auditTrail.log({
              messageId: 'unknown',
              userId,
              sessionId,
              action: 'hello',
              status: 'rejected',
              reason: `credential_broker_failed: ${e?.message || 'unknown'}`,
            });
            ws.close(1008, 'credential_broker_failed');
            return;
          }

          // Register connection in pool
          const conn = this.pool.registerConnection(ws, sessionId, userId, surface, clientId);
          if (!conn) {
            this.auditTrail.log({
              messageId: 'unknown',
              userId,
              sessionId,
              action: 'hello',
              status: 'rejected',
              reason: 'connection_pool_full',
            });
            ws.close(1008, 'pool_full');
            return;
          }

          connectionId = conn.connectionId;

          // Register for rate limiting
          this.rateLimiter.registerConnection(connectionId, userId);

          console.log(`[ChatWebSocketSync] Connection ${connectionId.slice(0, 8)} (${surface}/${userId}/${crewId}) from ${clientIp}`);

          // Audit the successful connection
          this.auditTrail.log({
            messageId: connectionId,
            userId,
            sessionId,
            action: 'hello',
            status: 'success',
            reason: `connected from ${clientIp} via ${surface}`,
            bytesTransferred: Buffer.byteLength(JSON.stringify(hello)),
          });

          // Dequeue any replayed messages
          const replayed = this.queue.dequeueAll(sessionId);

          // Send hello response with JWT
          const helloResp: SyncHelloResponse = {
            type: 'hello',
            connectionId,
            sessionId,
            jwt,
            expiresAt: jwtResponse!.expiresAt.toISOString(),
            refreshAt: jwtResponse!.refreshAt.toISOString(),
            timestamp: new Date().toISOString(),
            replayed: replayed.map(m => ({
              messageId: m.messageId,
              payload: m.payload,
              priority: m.priority,
            })),
          };

          ws.send(JSON.stringify(helloResp));

          // Listen for subsequent messages
          ws.on('message', (data: RawData) => {
            this.handleMessage(connectionId!, crewId!, data).catch((err) => {
              console.error(`[ChatWebSocketSync] Message error (${connectionId}):`, err instanceof Error ? err.message : String(err));
            });
          });
        } catch (e: any) {
          console.error(`[ChatWebSocketSync] Hello parse error:`, e?.message);
          this.auditTrail.log({
            messageId: 'unknown',
            userId: 'unknown',
            sessionId: 'unknown',
            action: 'hello',
            status: 'error',
            reason: `parse_error: ${e?.message || 'unknown'}`,
          });
          ws.close(1002, 'protocol_error');
        }
      });

      // Timeout: if no hello within 5s, close
      const helloTimeout = setTimeout(() => {
        if (!connectionId) {
          console.log(`[ChatWebSocketSync] Hello timeout from ${clientIp}`);
          this.auditTrail.log({
            messageId: 'unknown',
            userId: userId || 'unknown',
            sessionId: sessionId || 'unknown',
            action: 'hello',
            status: 'timeout',
            reason: 'hello_timeout_5s',
          });
          ws.close(1002, 'hello_timeout');
        }
      }, 5000);

      ws.on('close', () => {
        clearTimeout(helloTimeout);
        this.handleDisconnect(connectionId, sessionId, userId);
      });

      ws.on('error', (err) => {
        console.error(`[ChatWebSocketSync] Socket error (${connectionId?.slice(0, 8)}):`, err instanceof Error ? err.message : String(err));
        clearTimeout(helloTimeout);
        if (connectionId) {
          this.auditTrail.log({
            messageId: connectionId,
            userId: userId || 'unknown',
            sessionId: sessionId || 'unknown',
            action: 'error',
            status: 'error',
            reason: `socket_error: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
        try { ws.close(1011, 'socket_error'); } catch {}
      });

      ws.on('pong', () => {
        if (connectionId) {
          this.pool.updateActivity(connectionId);
        }
      });
    } catch (e: any) {
      console.error(`[ChatWebSocketSync] Connection setup error:`, e?.message);
      this.auditTrail.log({
        messageId: 'unknown',
        userId: userId || 'unknown',
        sessionId: sessionId || 'unknown',
        action: 'error',
        status: 'error',
        reason: `setup_error: ${e?.message || 'unknown'}`,
      });
      try { ws.close(1011, 'setup_error'); } catch {}
    }
  }

  /**
   * Handle an incoming message.
   *
   * Security gates:
   * 1. Rate limit check per connection
   * 2. JWT validation (signature, expiry, session binding)
   * 3. Injection detection (script tags, SQL, command injection)
   * 4. Operation scope validation
   * 5. Audit trail logging
   */
  private async handleMessage(connectionId: string, crewId: string, data: RawData): Promise<void> {
    const conn = this.pool.getConnection(connectionId);
    if (!conn) return;

    this.pool.updateActivity(connectionId);

    const msg = this.parseMessage(data);
    if (!msg) return;

    const startMs = Date.now();
    const messageId = (msg as any).messageId || randomUUID();

    if (msg.type === 'ping') {
      const pongResp = {
        type: 'pong',
        timestamp: new Date().toISOString(),
      };
      conn.ws.send(JSON.stringify(pongResp));
      this.pool.recordLatency(connectionId, Date.now() - startMs);
      this.auditTrail.log({
        messageId,
        userId: conn.userId,
        sessionId: conn.sessionId,
        action: 'ping',
        status: 'success',
        reason: 'ping_pong',
        processingTimeMs: Date.now() - startMs,
      });
      return;
    }

    if (msg.type === 'sync') {
      const syncMsg = msg as SyncMessage;
      const jwt = syncMsg.jwt || '';

      // Rate limit check (before JWT validation to fail fast)
      const rateLimitStatus = this.rateLimiter.checkLimit(connectionId);
      if (!rateLimitStatus.allowed) {
        // Send 429 message WITHOUT closing connection
        const rateLimitResp = {
          type: 'error',
          statusCode: 429,
          reason: rateLimitStatus.reason,
          retryAfterMs: rateLimitStatus.retryAfterMs,
          suggestedFallback: rateLimitStatus.suggestedFallback,
        };
        conn.ws.send(JSON.stringify(rateLimitResp));

        this.auditTrail.log({
          messageId,
          userId: conn.userId,
          sessionId: conn.sessionId,
          action: 'sync',
          status: 'rate_limited',
          reason: rateLimitStatus.reason || 'rate_limit_exceeded',
          processingTimeMs: Date.now() - startMs,
        });

        this.pool.recordLatency(connectionId, Date.now() - startMs);
        return;
      }

      // Validate message with WorfGate
      const validation = validateSyncMessage(
        jwt,
        conn.sessionId,
        syncMsg.payload,
        'ui:sync:write',
        messageId,
      );

      if (!validation.authorized) {
        // Close connection on auth failure
        const errorResp = {
          type: 'error',
          statusCode: validation.statusCode,
          reason: validation.reason,
          flags: validation.flags,
        };
        conn.ws.send(JSON.stringify(errorResp));

        this.auditTrail.log({
          messageId,
          userId: conn.userId,
          sessionId: conn.sessionId,
          action: 'sync',
          status: 'rejected',
          reason: validation.reason,
          processingTimeMs: Date.now() - startMs,
        });

        if (validation.statusCode === 403 || validation.statusCode === 401) {
          conn.ws.close(validation.statusCode === 401 ? 1008 : 1009, validation.reason);
          if (validation.statusCode === 403) {
            revokeSession(conn.sessionId);
          }
        }
        return;
      }

      this.pool.recordMessageReceived(connectionId);

      // Broadcast to session
      const broadcastPayload = JSON.stringify({
        type: 'sync',
        messageId,
        payload: syncMsg.payload,
        source: {
          connectionId: connectionId.slice(0, 8),
          surface: conn.surface,
          userId: conn.userId,
          crewId,
        },
        timestamp: new Date().toISOString(),
      });

      const delivered = this.pool.broadcastToSession(conn.sessionId, broadcastPayload);
      console.log(`[ChatWebSocketSync] Broadcast to session ${conn.sessionId.slice(0, 8)}: ${delivered} delivered`);

      this.auditTrail.log({
        messageId,
        userId: conn.userId,
        sessionId: conn.sessionId,
        action: 'sync',
        status: 'success',
        reason: `broadcasted to ${delivered} connections`,
        bytesTransferred: broadcastPayload.length,
        processingTimeMs: Date.now() - startMs,
      });

      this.pool.recordLatency(connectionId, Date.now() - startMs);
      return;
    }
  }

  /**
   * Handle client disconnect.
   */
  private handleDisconnect(connectionId: string | null, sessionId: string | null, userId: string | null): void {
    if (!connectionId) return;

    const conn = this.pool.getConnection(connectionId);
    if (conn) {
      console.log(
        `[ChatWebSocketSync] Disconnected ${connectionId.slice(0, 8)} (${conn.surface}/${conn.userId}, ` +
        `${conn.messagesSent} sent, ${conn.messagesReceived} received)`
      );

      this.auditTrail.log({
        messageId: connectionId,
        userId: conn.userId,
        sessionId: conn.sessionId,
        action: 'close',
        status: 'success',
        reason: `normal disconnect after ${conn.messagesReceived} received`,
      });
    }

    // Unregister from rate limiter
    if (userId) {
      this.rateLimiter.unregisterConnection(connectionId);
    }

    this.pool.unregisterConnection(connectionId);
  }

  /**
   * Broadcast a message to all connections in a session.
   * (Used for server-initiated state updates)
   */
  broadcastToSession(sessionId: string, payload: Record<string, any>): number {
    const message = JSON.stringify({
      type: 'sync',
      messageId: randomUUID(),
      payload,
      source: 'server',
      timestamp: new Date().toISOString(),
    });

    return this.pool.broadcastToSession(sessionId, message);
  }

  /**
   * Broadcast to all connections for a user.
   */
  broadcastToUser(userId: string, payload: Record<string, any>): number {
    const message = JSON.stringify({
      type: 'sync',
      messageId: randomUUID(),
      payload,
      source: 'server',
      timestamp: new Date().toISOString(),
    });

    return this.pool.broadcastToUser(userId, message);
  }

  /**
   * Queue a message for a session (for offline delivery).
   */
  queueMessage(sessionId: string, payload: string, priority: 'high' | 'low' = 'high'): boolean {
    return this.queue.enqueue(sessionId, payload, priority);
  }

  /**
   * Parse an incoming message.
   */
  private parseMessage(data: RawData): SyncRequest | null {
    try {
      let text: string;
      if (data instanceof ArrayBuffer) {
        text = Buffer.from(data).toString('utf8');
      } else if (Buffer.isBuffer(data)) {
        text = data.toString('utf8');
      } else {
        text = String(data);
      }
      return JSON.parse(text) as SyncRequest;
    } catch {
      return null;
    }
  }

  /**
   * Get current metrics (including security metrics).
   */
  getMetrics() {
    return {
      pool: this.pool.getMetrics(),
      queue: this.queue.getMetrics(),
      rateLimit: this.rateLimiter.getMetrics(),
      audit: this.auditTrail.getStats(),
      worfgate: getSyncValidatorMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Start health checks.
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      const metrics = this.getMetrics();
      console.log(`[ChatWebSocketSync] Health: ${metrics.pool.activeConnections} conns, ` +
        `${metrics.queue.totalMessages} queued msgs`);
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop health checks.
   */
  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

/**
 * Factory function to create and attach a sync endpoint to an HTTP server.
 */
export function createChatWebSocketSync(
  server: any,
  options?: { path?: string; pool?: SyncConnectionPool; queue?: SyncMessageQueue }
): ChatWebSocketSync {
  const sync = new ChatWebSocketSync(options?.pool, options?.queue);
  sync.attach(server, options?.path);
  return sync;
}
