/**
 * Lightweight WebSocket proxy for VSCode → Shared Service chat routing.
 *
 * This proxy accepts connections from VSCode extension, maintains session state,
 * and routes messages through the canonical chat turn engine (runCanonicalChatTurn).
 *
 * Features:
 * - Connection pooling (max 100 concurrent connections)
 * - Session persistence (userId + sessionId)
 * - Support for high-priority (real-time) and low-priority (batched) message routing
 * - Graceful disconnect handling with auto-cleanup
 * - Minimal latency (<500ms round-trip for interactive requests)
 * - Compatible with hot-reload workflow
 *
 * Protocol:
 * - Client sends: { type: 'chat', message: string, history?: [], sessionId?: string, userId?: string }
 * - Server responds: { type: 'response', sessionId: string, answer: string, metadata: {...} }
 * - Client can send: { type: 'ping' } for keepalive
 * - Server responds: { type: 'pong' }
 */

import type { WebSocket, RawData } from 'ws';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import { randomUUID } from 'node:crypto';
import type { CanonicalChatRequest, CanonicalChatResponse } from '../agent-core/chat.js';
import { runCanonicalChatTurn } from '../agent-core/chat.js';

/**
 * Session metadata for a connected VSCode extension client.
 */
interface ChatSession {
  sessionId: string;
  userId: string;
  connectedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  isHighPriority: boolean;
  metrics: {
    totalMessages: number;
    totalLatencyMs: number;
    errorCount: number;
  };
}

/**
 * Outgoing message type for client responses.
 */
interface ChatProxyResponse {
  type: 'response' | 'chunk' | 'error' | 'pong';
  sessionId?: string;
  requestId?: string;
  answer?: string;
  error?: string;
  model?: string;
  provider?: string;
  costUSD?: number;
  tokensIn?: number;
  tokensOut?: number;
  crewSelfOrganization?: any;
  promptOptimization?: any;
  executionActivation?: any;
  executionTime?: number;
  /** Incremental streaming: false on partial 'chunk' frames, true (or absent) on the final frame. */
  done?: boolean;
}

/**
 * Incoming message type from client.
 */
interface ChatProxyRequest {
  type: 'chat' | 'ping';
  message?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?: string;
  userId?: string;
  clientId?: string | null;
  priority?: 'high' | 'low';
  crewSelfOrganize?: boolean;
  id?: string; // Client-supplied correlation ID
}

/**
 * ChatWebSocketProxy manages WebSocket connections for VSCode chat routing.
 *
 * Usage:
 *   const proxy = new ChatWebSocketProxy();
 *   const server = http.createServer();
 *   proxy.attach(server, '/chat-ws');
 *   server.listen(3105);
 */
export class ChatWebSocketProxy {
  private wss: WebSocketServer | null = null;
  private sessions: Map<string, ChatSession> = new Map();
  private connectionPool: Map<string, WebSocket> = new Map();
  private maxConnections = 100;
  private cleanupIntervalMs = 30000; // 30s session cleanup sweep
  private cleanupTimer: NodeJS.Timeout | null = null;
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Attach the WebSocket proxy to an HTTP server at the specified path.
   */
  attach(server: any, path: string = '/chat-ws'): void {
    this.wss = new WebSocketServer({ server, path, perMessageDeflate: false });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req).catch((err) => {
        console.error('[ChatWebSocketProxy] Connection handler error:', err?.message);
        try { ws.close(1011, 'handler_error'); } catch {}
      });
    });

    this.wss.on('error', (err) => {
      console.error('[ChatWebSocketProxy] WebSocket server error:', err?.message);
    });

    this.startCleanupLoop();
    console.log(`[ChatWebSocketProxy] Attached at ${path}, max ${this.maxConnections} concurrent connections`);
  }

  /**
   * Detach the proxy (close all connections and cleanup).
   */
  detach(): void {
    this.stopCleanupLoop();
    this.requestTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.requestTimeouts.clear();

    for (const sessionId of Array.from(this.connectionPool.keys())) {
      const ws = this.connectionPool.get(sessionId);
      if (ws) {
        try { ws.close(1000, 'server_shutdown'); } catch {}
      }
      this.sessions.delete(sessionId);
    }
    this.connectionPool.clear();

    if (this.wss) {
      this.wss.close(() => {
        console.log('[ChatWebSocketProxy] Detached');
      });
      this.wss = null;
    }
  }

  /**
   * Get current connection metrics.
   */
  getMetrics() {
    return {
      activeConnections: this.connectionPool.size,
      activeSessions: this.sessions.size,
      maxConnections: this.maxConnections,
      utilization: (this.connectionPool.size / this.maxConnections) * 100,
    };
  }

  /**
   * Handle a new WebSocket connection.
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    // Rate limit: reject if at capacity
    if (this.connectionPool.size >= this.maxConnections) {
      ws.close(1008, 'connection_pool_full');
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const sessionId = randomUUID();
    let userId = 'anonymous';

    try {
      // Parse initial auth/metadata from first frame (optional)
      ws.once('message', async (data: RawData) => {
        try {
          const firstMsg = this.parseMessage(data);
          if (firstMsg?.userId) userId = String(firstMsg.userId).slice(0, 64);

          // Register session
          const session: ChatSession = {
            sessionId,
            userId,
            connectedAt: new Date(),
            lastActivityAt: new Date(),
            messageCount: 0,
            isHighPriority: firstMsg?.priority === 'high',
            metrics: { totalMessages: 0, totalLatencyMs: 0, errorCount: 0 },
          };
          this.sessions.set(sessionId, session);
          this.connectionPool.set(sessionId, ws);
          console.log(`[ChatWebSocketProxy] Session ${sessionId.slice(0, 8)} connected (${userId}) from ${clientIp}`);

          // Handle the first message
          this.handleMessage(ws, sessionId, firstMsg).catch((err) => {
            console.error(`[ChatWebSocketProxy] First message error:`, err?.message);
            this.sendError(ws, sessionId, 'message_processing_failed');
          });

          // Listen for subsequent messages
          ws.on('message', (data: RawData) => {
            this.handleMessage(ws, sessionId, this.parseMessage(data)).catch((err) => {
              console.error(`[ChatWebSocketProxy] Message handling error:`, err?.message);
            });
          });
        } catch (e: any) {
          console.error(`[ChatWebSocketProxy] First message parse error:`, e?.message);
          ws.close(1002, 'protocol_error');
        }
      });

      // If no message within 5s, still register as anonymous session
      const initialTimeoutId = setTimeout(() => {
        if (!this.sessions.has(sessionId)) {
          const session: ChatSession = {
            sessionId,
            userId: 'anonymous',
            connectedAt: new Date(),
            lastActivityAt: new Date(),
            messageCount: 0,
            isHighPriority: false,
            metrics: { totalMessages: 0, totalLatencyMs: 0, errorCount: 0 },
          };
          this.sessions.set(sessionId, session);
          this.connectionPool.set(sessionId, ws);
          console.log(`[ChatWebSocketProxy] Session ${sessionId.slice(0, 8)} registered (no auth) from ${clientIp}`);

          // Setup message handlers
          ws.on('message', (data: RawData) => {
            this.handleMessage(ws, sessionId, this.parseMessage(data)).catch((err) => {
              console.error(`[ChatWebSocketProxy] Message error:`, err?.message);
            });
          });
        }
      }, 5000);

      // Cleanup handlers
      ws.on('close', () => {
        clearTimeout(initialTimeoutId);
        this.handleDisconnect(sessionId, clientIp);
      });

      ws.on('error', (err) => {
        console.error(`[ChatWebSocketProxy] Socket error (${sessionId.slice(0, 8)}):`, err?.message);
        clearTimeout(initialTimeoutId);
        try { ws.close(1011, 'socket_error'); } catch {}
      });

      // Pong on ping for keepalive
      ws.on('pong', () => {
        const session = this.sessions.get(sessionId);
        if (session) session.lastActivityAt = new Date();
      });
    } catch (e: any) {
      console.error(`[ChatWebSocketProxy] Connection setup error:`, e?.message);
      ws.close(1011, 'setup_error');
    }
  }

  /**
   * Handle an incoming message from a client.
   */
  private async handleMessage(ws: WebSocket, sessionId: string, msg: ChatProxyRequest | null): Promise<void> {
    if (!msg) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.lastActivityAt = new Date();

    if (msg.type === 'ping') {
      this.sendResponse(ws, sessionId, { type: 'pong' });
      return;
    }

    if (msg.type !== 'chat' || !msg.message) {
      this.sendError(ws, sessionId, 'invalid_message_type');
      return;
    }

    const requestId = msg.id || randomUUID(); // Use client-supplied ID if available
    const startMs = Date.now();
    session.messageCount += 1;
    session.metrics.totalMessages += 1;

    try {
      // Route to canonical chat turn with latency budget
      const timeoutMs = session.isHighPriority ? 8000 : 15000; // High-priority: 8s, low-priority: 15s
      const chatResult = await Promise.race([
        runCanonicalChatTurn(
          {
            message: msg.message,
            history: msg.history,
            clientId: msg.clientId ?? null,
            crewSelfOrganize: msg.crewSelfOrganize !== false,
          },
          {
            // Forward incremental answer deltas as partial 'chunk' frames (done:false).
            onDelta: (partial) => {
              this.sendResponse(ws, sessionId, {
                type: 'chunk',
                requestId,
                answer: partial,
                done: false,
              });
            },
          },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('chat_timeout')), timeoutMs)
        ),
      ]);

      const executionTimeMs = Date.now() - startMs;
      session.metrics.totalLatencyMs += executionTimeMs;

      this.sendResponse(ws, sessionId, {
        type: 'response',
        requestId,
        answer: chatResult.answer,
        model: chatResult.model,
        provider: chatResult.provider,
        costUSD: chatResult.costUSD,
        tokensIn: chatResult.tokensIn,
        tokensOut: chatResult.tokensOut,
        crewSelfOrganization: chatResult.crewSelfOrganization,
        promptOptimization: chatResult.promptOptimization,
        executionActivation: chatResult.executionActivation,
        executionTime: executionTimeMs,
        done: true,
      });
    } catch (e: any) {
      const executionTimeMs = Date.now() - startMs;
      session.metrics.errorCount += 1;
      console.error(`[ChatWebSocketProxy] Chat error (${sessionId.slice(0, 8)}):`, e?.message);

      this.sendResponse(ws, sessionId, {
        type: 'error',
        requestId,
        error: e?.message || 'chat_error',
        executionTime: executionTimeMs,
      });
    }
  }

  /**
   * Handle client disconnect.
   */
  private handleDisconnect(sessionId: string, clientIp: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.connectionPool.delete(sessionId);
    this.sessions.delete(sessionId);

    const avgLatencyMs = session.metrics.totalMessages > 0
      ? Math.round(session.metrics.totalLatencyMs / session.metrics.totalMessages)
      : 0;

    console.log(
      `[ChatWebSocketProxy] Session ${sessionId.slice(0, 8)} disconnected ` +
      `(${session.userId}, ${session.messageCount} msgs, ${avgLatencyMs}ms avg, ${session.metrics.errorCount} errors)`
    );
  }

  /**
   * Parse incoming message from raw data.
   */
  private parseMessage(data: RawData): ChatProxyRequest | null {
    try {
      let text: string;
      if (data instanceof ArrayBuffer) {
        text = Buffer.from(data).toString('utf8');
      } else if (Buffer.isBuffer(data)) {
        text = data.toString('utf8');
      } else {
        text = String(data);
      }
      const obj = JSON.parse(text);
      return obj as ChatProxyRequest;
    } catch {
      return null;
    }
  }

  /**
   * Send a response to the client.
   */
  private sendResponse(ws: WebSocket, sessionId: string, response: Partial<ChatProxyResponse>): void {
    try {
      const payload = JSON.stringify({
        sessionId,
        timestamp: new Date().toISOString(),
        ...response,
      });
      if (ws.readyState === ws.OPEN) {
        ws.send(Buffer.from(payload));
      }
    } catch (e: any) {
      console.error(`[ChatWebSocketProxy] Send error:`, e?.message);
    }
  }

  /**
   * Send an error to the client.
   */
  private sendError(ws: WebSocket, sessionId: string, error: string): void {
    this.sendResponse(ws, sessionId, {
      type: 'error',
      error,
    });
  }

  /**
   * Start the periodic cleanup loop for stale sessions.
   */
  private startCleanupLoop(): void {
    this.cleanupTimer = setInterval(() => {
      const now = new Date();
      const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

      for (const sessionId of Array.from(this.sessions.keys())) {
        const session = this.sessions.get(sessionId);
        if (!session) continue;
        const isStale = now.getTime() - session.lastActivityAt.getTime() > staleThresholdMs;
        if (isStale) {
          const ws = this.connectionPool.get(sessionId);
          if (ws && ws.readyState === ws.OPEN) {
            ws.close(1000, 'stale_session');
          }
        }
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop the periodic cleanup loop.
   */
  private stopCleanupLoop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

/**
 * Factory function to create and attach a proxy to an HTTP server.
 * Typical usage:
 *   const server = http.createServer();
 *   createChatWebSocketProxy(server, { port: 3105, path: '/chat-ws' });
 *   server.listen(3105);
 */
export function createChatWebSocketProxy(
  server: any,
  options?: { path?: string; maxConnections?: number }
): ChatWebSocketProxy {
  const proxy = new ChatWebSocketProxy();
  if (options?.maxConnections) proxy['maxConnections'] = options.maxConnections;
  proxy.attach(server, options?.path);
  return proxy;
}
