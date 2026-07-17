/**
 * Chat WebSocket Proxy Server — standalone entry point for VSCode chat routing.
 *
 * This server runs on port 3105 and exposes a WebSocket endpoint for VSCode extensions
 * to send chat messages. Messages are routed through the canonical chat turn engine.
 *
 * Startup:
 *   node dist/src/agent-core/chat-proxy-server.js
 *
 * Environment variables:
 *   STORY_AGENT_CHAT_PROXY_PORT   WebSocket server port (default: 3105)
 *   NODE_ENV                       development | production
 */

import * as http from 'http';
import { createChatWebSocketProxy } from '../lib/chat-websocket-proxy.js';

const PORT = parseInt(process.env.STORY_AGENT_CHAT_PROXY_PORT || '3105', 10);
const ENV = process.env.NODE_ENV || 'development';

/**
 * Create and start the HTTP server with WebSocket proxy.
 */
async function startServer(): Promise<void> {
  // Create HTTP server with basic health/metrics endpoints
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: ENV,
      }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/metrics') {
      const metrics = proxy.getMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...metrics,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Chat WebSocket Proxy Server\nEndpoints: /health, /metrics, ws://localhost:' + PORT + '/chat-ws\n');
      return;
    }

    res.writeHead(404);
    res.end();
  });

  // Attach WebSocket proxy
  const proxy = createChatWebSocketProxy(server, {
    path: '/chat-ws',
    maxConnections: 100,
  });

  // Start listening
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ChatProxyServer] Started on port ${PORT}`);
    console.log(`[ChatProxyServer] WebSocket endpoint: ws://localhost:${PORT}/chat-ws`);
    console.log(`[ChatProxyServer] Health endpoint: http://localhost:${PORT}/health`);
    console.log(`[ChatProxyServer] Metrics endpoint: http://localhost:${PORT}/metrics`);
    console.log(`[ChatProxyServer] Environment: ${ENV}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[ChatProxyServer] SIGINT received, shutting down...');
    proxy.detach();
    server.close(() => {
      console.log('[ChatProxyServer] Server closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n[ChatProxyServer] SIGTERM received, shutting down...');
    proxy.detach();
    server.close(() => {
      console.log('[ChatProxyServer] Server closed');
      process.exit(0);
    });
  });

  // Error handlers
  server.on('error', (err) => {
    console.error('[ChatProxyServer] Server error:', err);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('[ChatProxyServer] Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[ChatProxyServer] Unhandled rejection:', reason, 'Promise:', promise);
  });
}

// Start the server
startServer().catch((err) => {
  console.error('[ChatProxyServer] Startup error:', err);
  process.exit(1);
});
