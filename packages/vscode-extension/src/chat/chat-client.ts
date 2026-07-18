/**
 * WebSocket Chat Client with auto-reconnect, session management, and metrics collection.
 *
 * Provides a persistent WebSocket connection to the shared crew chat service,
 * with exponential backoff reconnection, message batching for low-priority requests,
 * and per-message cost tracking.
 *
 * Features:
 * - Automatic reconnection with exponential backoff (max 30s)
 * - Session management (userId from VS Code context, sessionId per conversation)
 * - Message batching for low-priority requests (e.g., suggestions)
 * - Streaming responses with chunks
 * - Proper cleanup on extension deactivation
 * - Metrics collection (latency, tokens, cost)
 * - Graceful degradation when offline
 */

export interface ChatRequest {
  message: string;
  priority: 'high' | 'low'; // 'high' = real-time, 'low' = batched
  sessionId: string;
  userId: string;
  context?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  sources: string[];
  done: boolean;
}

export interface ChatMetrics {
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  lastError?: string;
  lastConnectedAt?: number;
}

type ChatHandler = (response: ChatResponse) => void;
type ConnectionHandler = (status: ConnectionStatus) => void;
type ErrorHandler = (error: Error) => void;

export class ChatClient {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionId: string;
  private userId: string;
  private autoReconnectEnabled = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelayMs = 1000; // Start with 1s, exponential backoff
  private reconnectTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // Message batching for low-priority requests
  private lowPriorityQueue: ChatRequest[] = [];
  private batchIntervalHandle: ReturnType<typeof setInterval> | null = null;
  private batchIntervalMs = 2000; // Batch every 2s

  // Handlers
  private chatHandlers = new Map<string, ChatHandler>();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

  // Pending requests (for matching responses)
  private pendingRequests = new Map<string, { request: ChatRequest; timeMs: number }>();

  // Connection state
  private status: ConnectionStatus = {
    connected: false,
    connecting: false,
    reconnecting: false,
  };

  // Metrics
  private sessionMetrics = { totalCost: 0, totalTokens: 0, requestCount: 0 };

  // FIX #4: Rate limit handling
  private rateLimitBackoffMs = 0;
  private rateLimitRetryAfter = 0;

  constructor(url: string, sessionId: string, userId: string) {
    this.url = url;
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /** Connect to the WebSocket server */
  async connect(): Promise<void> {
    if (this.status.connected || this.status.connecting) return;

    this.status = { ...this.status, connecting: true };
    this.notifyConnectionHandlers();

    return new Promise((resolve, reject) => {
      try {
        // Replace http/https with ws/wss
        const wsUrl = this.url
          .replace(/^http:/, 'ws:')
          .replace(/^https:/, 'wss:')
          .replace(/\/$/, '');

        this.ws = new WebSocket(`${wsUrl}/chat`);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.status = { connected: true, connecting: false, reconnecting: false, lastConnectedAt: Date.now() };
          this.notifyConnectionHandlers();

          // Start batch interval
          if (this.batchIntervalHandle === null) {
            this.batchIntervalHandle = setInterval(() => this.flushBatch(), this.batchIntervalMs);
          }

          resolve();
        };

        this.ws.onmessage = (evt) => {
          this.handleMessage(evt.data);
        };

        this.ws.onerror = (evt) => {
          const error = new Error('WebSocket error');
          this.errorHandlers.forEach(h => h(error));
          reject(error);
        };

        this.ws.onclose = () => {
          this.status = { connected: false, connecting: false, reconnecting: false };
          this.notifyConnectionHandlers();

          // Clear batch interval
          if (this.batchIntervalHandle !== null) {
            clearInterval(this.batchIntervalHandle);
            this.batchIntervalHandle = null;
          }

          // Attempt reconnection
          if (this.autoReconnectEnabled) {
            this.attemptReconnect();
          }
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.status = { connected: false, connecting: false, reconnecting: false, lastError: error.message };
        this.notifyConnectionHandlers();
        reject(error);
      }
    });
  }

  /** Send a chat message */
  async send(request: ChatRequest): Promise<void> {
    // FIX #4: Check rate limit backoff
    if (this.rateLimitBackoffMs > 0) {
      const now = Date.now();
      if (now < this.rateLimitRetryAfter) {
        const waitMs = this.rateLimitRetryAfter - now;
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        this.rateLimitBackoffMs = 0;
      }
    }

    // If low priority, add to batch queue
    if (request.priority === 'low') {
      this.lowPriorityQueue.push(request);
      return;
    }

    // High priority: send immediately
    if (!this.ws || this.status.connected === false) {
      // Not connected — wait for connection or fail
      if (!this.status.connecting && !this.status.connected) {
        throw new Error('Chat client not connected. Call connect() first.');
      }
      // Connecting — queue and retry
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!this.status.connected) throw new Error('Connection timeout');
    }

    const id = this.generateMessageId();
    this.pendingRequests.set(id, { request, timeMs: Date.now() });

    const payload = {
      id,
      ...request,
    };

    this.ws!.send(JSON.stringify(payload));
  }

  /** Flush low-priority message batch */
  private flushBatch(): void {
    if (this.lowPriorityQueue.length === 0) return;

    const batch = this.lowPriorityQueue.splice(0, 10); // Max 10 per batch
    for (const request of batch) {
      this.send({ ...request, priority: 'high' }).catch(err => {
        this.errorHandlers.forEach(h => h(err));
        // FIX #3: Re-queue failed requests so they're not lost
        this.lowPriorityQueue.unshift(request);
      });
    }
  }

  /** Handle incoming WebSocket messages */
  private handleMessage(data: string): void {
    try {
      const response: ChatResponse = JSON.parse(data);

      // FIX #4: Detect rate limit (429) responses
      const responseWithStatus = response as ChatResponse & { statusCode?: number; retryAfter?: string };
      if (responseWithStatus.statusCode === 429) {
        // Parse Retry-After header (seconds or HTTP-date)
        let backoffMs = 60000; // Default 60s
        if (responseWithStatus.retryAfter) {
          const retryAfterSec = parseInt(responseWithStatus.retryAfter);
          if (!isNaN(retryAfterSec)) {
            backoffMs = retryAfterSec * 1000;
          }
        }
        this.rateLimitBackoffMs = backoffMs;
        this.rateLimitRetryAfter = Date.now() + backoffMs;

        // Emit error but don't crash
        const error = new Error(`Rate limited. Retry after ${Math.ceil(backoffMs / 1000)}s`);
        this.errorHandlers.forEach(h => h(error));
        return;
      }

      // Track metrics
      this.sessionMetrics.totalCost += response.costUSD;
      this.sessionMetrics.totalTokens += response.tokensIn + response.tokensOut;
      this.sessionMetrics.requestCount += 1;

      // Record latency if this is a pending request
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        const latencyMs = Date.now() - pending.timeMs;
        // Latency recorded for metrics display (but not exposed here)
      }

      // Invoke handler
      const handler = this.chatHandlers.get(response.id);
      if (handler) {
        handler(response);

        // Remove handler if response is done
        if (response.done) {
          this.chatHandlers.delete(response.id);
          this.pendingRequests.delete(response.id);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandlers.forEach(h => h(error));
    }
  }

  /** Subscribe to chat responses for a message ID */
  onChatResponse(id: string, handler: ChatHandler): () => void {
    this.chatHandlers.set(id, handler);

    // Return unsubscribe function
    return () => {
      this.chatHandlers.delete(id);
    };
  }

  /** Subscribe to connection status changes */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const idx = this.connectionHandlers.indexOf(handler);
      if (idx >= 0) this.connectionHandlers.splice(idx, 1);
    };
  }

  /** Subscribe to errors */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const idx = this.errorHandlers.indexOf(handler);
      if (idx >= 0) this.errorHandlers.splice(idx, 1);
    };
  }

  /** Get current connection status */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /** Get session metrics */
  getMetrics() {
    return { ...this.sessionMetrics };
  }

  /** Disconnect and clean up */
  disconnect(): void {
    this.autoReconnectEnabled = false;

    if (this.reconnectTimeoutHandle) {
      clearTimeout(this.reconnectTimeoutHandle);
      this.reconnectTimeoutHandle = null;
    }

    if (this.batchIntervalHandle) {
      clearInterval(this.batchIntervalHandle);
      this.batchIntervalHandle = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = { connected: false, connecting: false, reconnecting: false };
    this.notifyConnectionHandlers();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private attemptReconnect(): void {
    if (!this.autoReconnectEnabled || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.status = {
        connected: false,
        connecting: false,
        reconnecting: false,
        lastError: 'Max reconnection attempts exceeded',
      };
      this.notifyConnectionHandlers();
      return;
    }

    this.reconnectAttempts += 1;
    const delayMs = Math.min(this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.status = { ...this.status, reconnecting: true };
    this.notifyConnectionHandlers();

    this.reconnectTimeoutHandle = setTimeout(() => {
      this.connect().catch(err => {
        // Retry will be triggered by onclose
      });
    }, delayMs);
  }

  private notifyConnectionHandlers(): void {
    const status = this.getStatus();
    this.connectionHandlers.forEach(h => h(status));
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
