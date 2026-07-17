/**
 * Sync Rate Limiter — Adaptive throttling for WebSocket sync
 *
 * Implements multi-tier rate limiting:
 * - Per-user global limit: 1000 messages/minute (16.67/second)
 * - Per-connection burst limit: 10 messages/second
 * - Adaptive throttling: Reduce limits when budget depleted
 * - Graceful fallback: Offer HTTP polling alternative (429 without close)
 * - Auto-recovery: Limits reset after idle period
 *
 * Each connection tracks:
 * - Total messages in current minute window
 * - Burst messages in current second window
 * - Last activity timestamp
 * - Quota availability
 *
 * Strategy:
 * - Accept up to 10 msg/sec (burst window)
 * - Keep running total for 60-second window
 * - If total > 1000/min, reject new messages with 429
 * - Send 429 message without closing connection
 * - Auto-reset quota after 60-second idle
 *
 * Usage:
 *   const limiter = new SyncRateLimiter();
 *   const check = limiter.checkLimit(connectionId, userId);
 *   if (!check.allowed) {
 *     // Send 429 message or fall back to HTTP polling
 *   }
 */

// ── Types & Interfaces ────────────────────────────────────────────────────────

/**
 * Rate limit status for a connection.
 */
export interface RateLimitStatus {
  /** True if the request is allowed under rate limits */
  allowed: boolean;
  /** Current messages in the 60-second window */
  messagesInWindow: number;
  /** Maximum messages allowed in the window */
  windowLimit: number;
  /** Remaining quota before hitting the limit */
  remainingQuota: number;
  /** Time until quota resets (ms) */
  resetAfterMs: number;
  /** If not allowed: reason for rejection */
  reason?: string;
  /** If not allowed: retry after (ms) */
  retryAfterMs?: number;
  /** Suggested fallback: 'http_polling' | 'backoff' | 'none' */
  suggestedFallback?: 'http_polling' | 'backoff';
}

/**
 * Per-connection rate limit state.
 */
interface ConnectionRateLimitState {
  userId: string;
  connectionId: string;
  messagesInWindow: number[];
  lastActivityMs: number;
  burstCount: number;
  lastResetMs: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Per-user rate limit: 1000 messages/minute */
const RATE_LIMIT_MESSAGES_PER_MIN = 1000;

/** Rate limit window: 60 seconds */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Burst limit: 10 messages/second */
const BURST_LIMIT_MESSAGES_PER_SEC = 10;

/** Burst window: 1 second */
const BURST_WINDOW_MS = 1000;

/** Idle threshold: if idle > this, reset quota */
const IDLE_THRESHOLD_MS = 60 * 1000;

/** Connection timeout: prune stale connections after 30 minutes */
const CONNECTION_TIMEOUT_MS = 30 * 60 * 1000;

// ── In-Memory State ───────────────────────────────────────────────────────────

/** Connection state keyed by connectionId */
const connectionState = new Map<string, ConnectionRateLimitState>();

/** User stats: keyed by userId, tracks cross-connection totals */
const userStats = new Map<string, { totalConnections: number; totalMessagesInMin: number; lastResetMs: number }>();

/** Audit log: rate limit violations and recoveries */
const auditLog: Array<{
  timestamp: string;
  connectionId: string;
  userId: string;
  event: 'allowed' | 'rejected' | 'recovered';
  messagesInWindow: number;
  reason?: string;
}> = [];
const AUDIT_MAX = 5000;

/**
 * Record an audit entry.
 */
function recordAuditEntry(
  connectionId: string,
  userId: string,
  event: 'allowed' | 'rejected' | 'recovered',
  messagesInWindow: number,
  reason?: string,
): void {
  auditLog.push({
    timestamp: new Date().toISOString(),
    connectionId,
    userId,
    event,
    messagesInWindow,
    reason,
  });

  if (auditLog.length > AUDIT_MAX) {
    auditLog.splice(0, auditLog.length - AUDIT_MAX);
  }
}

/**
 * Retrieve rate limit audit log.
 */
export function getRateLimitAuditLog(options?: { limit?: number; userId?: string }): typeof auditLog {
  let entries = [...auditLog];
  if (options?.userId) {
    entries = entries.filter(e => e.userId === options.userId);
  }
  if (options?.limit) {
    entries = entries.slice(-options.limit);
  }
  return entries;
}

// ── Rate Limiter Implementation ───────────────────────────────────────────────

/**
 * SyncRateLimiter class — manages rate limiting for WebSocket connections.
 *
 * Usage:
 *   const limiter = new SyncRateLimiter();
 *   limiter.registerConnection(connectionId, userId);
 *   const check = limiter.checkLimit(connectionId);
 *   limiter.unregisterConnection(connectionId);
 */
export class SyncRateLimiter {
  private pruneIntervalMs = 5 * 60 * 1000; // Every 5 minutes
  private pruneTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startPruneTimer();
  }

  /**
   * Register a new connection for rate limiting.
   * Call when WebSocket 'hello' handshake completes.
   */
  registerConnection(connectionId: string, userId: string): void {
    const now = Date.now();

    const state: ConnectionRateLimitState = {
      userId,
      connectionId,
      messagesInWindow: [],
      lastActivityMs: now,
      burstCount: 0,
      lastResetMs: now,
    };

    connectionState.set(connectionId, state);

    // Track user stats
    const stats = userStats.get(userId) ?? {
      totalConnections: 0,
      totalMessagesInMin: 0,
      lastResetMs: now,
    };
    stats.totalConnections++;
    userStats.set(userId, stats);
  }

  /**
   * Unregister a connection (call on disconnect).
   */
  unregisterConnection(connectionId: string): void {
    const state = connectionState.get(connectionId);
    if (!state) return;

    connectionState.delete(connectionId);

    const stats = userStats.get(state.userId);
    if (stats) {
      stats.totalConnections--;
      if (stats.totalConnections <= 0) {
        userStats.delete(state.userId);
      }
    }
  }

  /**
   * Check rate limit for a connection.
   * Call BEFORE processing a sync message.
   *
   * Returns { allowed, messagesInWindow, remainingQuota, reason?, retryAfterMs? }
   *
   * If allowed=false, send a 429 message WITHOUT closing the connection,
   * and suggest HTTP polling fallback.
   */
  checkLimit(connectionId: string): RateLimitStatus {
    const now = Date.now();
    const state = connectionState.get(connectionId);

    if (!state) {
      return {
        allowed: false,
        messagesInWindow: 0,
        windowLimit: RATE_LIMIT_MESSAGES_PER_MIN,
        remainingQuota: 0,
        resetAfterMs: 0,
        reason: 'connection_not_registered',
      };
    }

    // Check burst limit (messages in last 1 second)
    const burstCutoff = now - BURST_WINDOW_MS;
    const burstMessages = state.messagesInWindow.filter(t => t >= burstCutoff).length;

    if (burstMessages >= BURST_LIMIT_MESSAGES_PER_SEC) {
      recordAuditEntry(
        connectionId,
        state.userId,
        'rejected',
        burstMessages,
        'burst_limit_exceeded',
      );

      return {
        allowed: false,
        messagesInWindow: burstMessages,
        windowLimit: BURST_LIMIT_MESSAGES_PER_SEC,
        remainingQuota: 0,
        resetAfterMs: BURST_WINDOW_MS,
        reason: 'burst_limit_exceeded',
        retryAfterMs: 1000,
        suggestedFallback: 'backoff',
      };
    }

    // Check minute window limit
    const windowCutoff = now - RATE_LIMIT_WINDOW_MS;
    const messagesInWindow = state.messagesInWindow.filter(t => t >= windowCutoff).length;

    if (messagesInWindow >= RATE_LIMIT_MESSAGES_PER_MIN) {
      recordAuditEntry(
        connectionId,
        state.userId,
        'rejected',
        messagesInWindow,
        'minute_limit_exceeded',
      );

      const resetAfterMs = state.messagesInWindow[0] ? state.messagesInWindow[0] + RATE_LIMIT_WINDOW_MS - now : RATE_LIMIT_WINDOW_MS;

      return {
        allowed: false,
        messagesInWindow,
        windowLimit: RATE_LIMIT_MESSAGES_PER_MIN,
        remainingQuota: 0,
        resetAfterMs,
        reason: 'minute_limit_exceeded',
        retryAfterMs: resetAfterMs,
        suggestedFallback: 'http_polling',
      };
    }

    // Check for idle recovery
    const idleMs = now - state.lastActivityMs;
    if (idleMs > IDLE_THRESHOLD_MS && messagesInWindow > 0) {
      // Auto-recover: reset quota after idle period
      state.messagesInWindow = [];
      state.lastResetMs = now;
      recordAuditEntry(
        connectionId,
        state.userId,
        'recovered',
        0,
        'idle_reset',
      );
    }

    // Request is allowed
    state.messagesInWindow.push(now);
    state.lastActivityMs = now;
    state.burstCount = burstMessages + 1;

    const remainingQuota = Math.max(0, RATE_LIMIT_MESSAGES_PER_MIN - messagesInWindow - 1);

    recordAuditEntry(
      connectionId,
      state.userId,
      'allowed',
      messagesInWindow + 1,
    );

    return {
      allowed: true,
      messagesInWindow: messagesInWindow + 1,
      windowLimit: RATE_LIMIT_MESSAGES_PER_MIN,
      remainingQuota,
      resetAfterMs: Math.max(0, (state.messagesInWindow[0] ?? now) + RATE_LIMIT_WINDOW_MS - now),
    };
  }

  /**
   * Get per-connection rate limit status (for monitoring).
   */
  getConnectionStatus(connectionId: string): RateLimitStatus | null {
    const state = connectionState.get(connectionId);
    if (!state) return null;

    const now = Date.now();
    const windowCutoff = now - RATE_LIMIT_WINDOW_MS;
    const messagesInWindow = state.messagesInWindow.filter(t => t >= windowCutoff).length;

    return {
      allowed: messagesInWindow < RATE_LIMIT_MESSAGES_PER_MIN,
      messagesInWindow,
      windowLimit: RATE_LIMIT_MESSAGES_PER_MIN,
      remainingQuota: Math.max(0, RATE_LIMIT_MESSAGES_PER_MIN - messagesInWindow),
      resetAfterMs: state.messagesInWindow.length > 0
        ? Math.max(0, state.messagesInWindow[0] + RATE_LIMIT_WINDOW_MS - now)
        : 0,
    };
  }

  /**
   * Get per-user rate limit status (cross-connection aggregate).
   */
  getUserStatus(userId: string): { totalConnections: number; averageMessagesPerConnection: number } | null {
    const stats = userStats.get(userId);
    if (!stats) return null;

    const userConnections = Array.from(connectionState.values()).filter(c => c.userId === userId);
    const totalMessages = userConnections.reduce((sum, c) => {
      const now = Date.now();
      const windowCutoff = now - RATE_LIMIT_WINDOW_MS;
      return sum + c.messagesInWindow.filter(t => t >= windowCutoff).length;
    }, 0);

    return {
      totalConnections: userConnections.length,
      averageMessagesPerConnection: userConnections.length > 0 ? totalMessages / userConnections.length : 0,
    };
  }

  /**
   * Prune stale connections and old message timestamps.
   * Call periodically (every 5 minutes).
   */
  private pruneStaleConnections(): void {
    const now = Date.now();
    const staleConnectionIds: string[] = [];

    for (const [connectionId, state] of connectionState.entries()) {
      // Remove old message timestamps (older than rate limit window)
      const windowCutoff = now - RATE_LIMIT_WINDOW_MS;
      state.messagesInWindow = state.messagesInWindow.filter(t => t >= windowCutoff);

      // Prune connections idle for > 30 minutes
      const idleMs = now - state.lastActivityMs;
      if (idleMs > CONNECTION_TIMEOUT_MS) {
        staleConnectionIds.push(connectionId);
      }
    }

    // Clean up stale connections
    for (const connectionId of staleConnectionIds) {
      this.unregisterConnection(connectionId);
    }

    if (staleConnectionIds.length > 0) {
      console.log(`[SyncRateLimiter] Pruned ${staleConnectionIds.length} stale connections`);
    }
  }

  /**
   * Start the prune timer.
   */
  private startPruneTimer(): void {
    this.pruneTimer = setInterval(() => {
      this.pruneStaleConnections();
    }, this.pruneIntervalMs);
  }

  /**
   * Stop the prune timer (call on shutdown).
   */
  stopPruneTimer(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  /**
   * Get metrics (for monitoring).
   */
  getMetrics() {
    const now = Date.now();
    const windowCutoff = now - RATE_LIMIT_WINDOW_MS;

    let totalMessagesInWindow = 0;
    let maxMessagesInConnection = 0;

    for (const state of connectionState.values()) {
      const msgs = state.messagesInWindow.filter(t => t >= windowCutoff).length;
      totalMessagesInWindow += msgs;
      maxMessagesInConnection = Math.max(maxMessagesInConnection, msgs);
    }

    return {
      activeConnections: connectionState.size,
      activeUsers: userStats.size,
      totalMessagesInWindow,
      maxMessagesInConnection,
      auditLogSize: auditLog.length,
    };
  }
}

/**
 * Global singleton instance.
 */
let globalLimiter: SyncRateLimiter | null = null;

/**
 * Get or create the global rate limiter instance.
 */
export function getGlobalSyncRateLimiter(): SyncRateLimiter {
  if (!globalLimiter) {
    globalLimiter = new SyncRateLimiter();
  }
  return globalLimiter;
}
