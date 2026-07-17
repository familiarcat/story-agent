/**
 * Sync Server — standalone HTTP server for real-time UI state synchronization.
 *
 * This server runs on port 3106 and exposes:
 * - WebSocket endpoint at /sync for VSCode, web, and CLI connections
 * - Health check at GET /health
 * - Metrics endpoint at GET /metrics
 * - Root info at GET /
 *
 * Startup:
 *   node dist/src/agent-core/sync-server.js
 *
 * Environment variables:
 *   STORY_AGENT_SYNC_PORT      Server port (default: 3106)
 *   NODE_ENV                   development | production
 *   SYNC_MAX_CONNECTIONS       Max concurrent connections (default: 100)
 */

import * as http from 'http';
import { createChatWebSocketSync } from '../lib/chat-websocket-sync.js';

const PORT = parseInt(process.env.STORY_AGENT_SYNC_PORT || '3106', 10);
const ENV = process.env.NODE_ENV || 'development';
const MAX_CONNECTIONS = parseInt(process.env.SYNC_MAX_CONNECTIONS || '100', 10);

const startTime = Date.now();

/**
 * Create and start the sync server.
 */
async function startServer(): Promise<void> {
  // Create HTTP server with health/metrics endpoints
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'sync-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: ENV,
      }));
      return;
    }

    // Metrics endpoint
    if (req.method === 'GET' && url.pathname === '/metrics') {
      const metrics = sync.getMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        service: 'sync-server',
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB',
        },
        ...metrics,
      }));
      return;
    }

    // Root info
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        'Story Agent — Real-Time UI Sync Server\n' +
        '\n' +
        'WebSocket Endpoint:\n' +
        `  ws://localhost:${PORT}/sync\n` +
        '\n' +
        'HTTP Endpoints:\n' +
        `  GET /health        Health check\n` +
        `  GET /metrics       Detailed metrics\n` +
        '\n' +
        'Protocol:\n' +
        '  1. Connect to ws://localhost:' + PORT + '/sync\n' +
        '  2. Send { type: "hello", sessionId, userId, surface, clientId? }\n' +
        '  3. Receive { type: "hello", connectionId, replayed: [...] }\n' +
        '  4. Send/receive { type: "sync", payload, messageId?, priority? }\n' +
        '\n'
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  // Attach WebSocket sync endpoint
  const sync = createChatWebSocketSync(server, {
    path: '/sync',
  });

  // Start listening
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SyncServer] Started on port ${PORT}`);
    console.log(`[SyncServer] WebSocket: ws://localhost:${PORT}/sync`);
    console.log(`[SyncServer] Health: http://localhost:${PORT}/health`);
    console.log(`[SyncServer] Metrics: http://localhost:${PORT}/metrics`);
    console.log(`[SyncServer] Max connections: ${MAX_CONNECTIONS}`);
    console.log(`[SyncServer] Environment: ${ENV}`);
  });

  // Graceful shutdown handlers
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[SyncServer] ${signal} received, shutting down...`);
    sync.detach();
    server.close(() => {
      console.log('[SyncServer] Server closed');
      process.exit(0);
    });

    // Force exit after 30s
    setTimeout(() => {
      console.error('[SyncServer] Force exit (timeout)');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Error handlers
  server.on('error', (err) => {
    console.error('[SyncServer] Server error:', err);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('[SyncServer] Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[SyncServer] Unhandled rejection:', reason);
  });
}

// Start the server
startServer().catch((err) => {
  console.error('[SyncServer] Startup error:', err);
  process.exit(1);
});
