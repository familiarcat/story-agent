// MCP Server Main Entry Point
// Exports are handled via MCP tool definitions in /lib and /tools

import 'dotenv/config';
import { startAgentHttpServer } from './agent-core/http-server.js';

// Start the HTTP server for the agent-core endpoint
const port = Number(process.env.STORY_AGENT_AGENT_PORT || 3103);

process.stderr.write(`[DEBUG-EARLY] Starting index.ts\n`);

try {
  process.stderr.write(`[DEBUG] Starting agent HTTP server on port ${port}\n`);
  const server = startAgentHttpServer(port);
  process.stderr.write(`[DEBUG] Server created, setting up keep-alive\n`);
  
  // Keep stdin open to prevent Node.js from exiting
  // When stdin is not a TTY (e.g., when run from a script or Docker),
  // we need to explicitly resume() it to keep the event loop alive
  if (process.stdin.isTTY === false) {
    process.stdin.resume();
    process.stderr.write(`[DEBUG] stdin resumed (non-TTY mode)\n`);
  }
  
  // Also set an interval that stays active (does NOT call .unref())
  // This ensures the process never exits even if stdin is closed
  const keepAliveHandle = setInterval(() => {
    // No-op: just keep the event loop alive
  }, 60000);
  
  // Important: do NOT call .unref() on this interval!
  // .ref() is the default for setInterval, which keeps the process alive.
  // Explicitly call .ref() to make this clear (though it's already the default).
  keepAliveHandle.ref();
  
  process.stderr.write(`[DEBUG] Keep-alive activated\n`);
  
  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    process.stderr.write('SIGTERM received, shutting down...\n');
    clearInterval(keepAliveHandle);
    if (process.stdin.isTTY === false) {
      process.stdin.pause();
    }
    server.close(() => process.exit(0));
  });
  
  process.on('SIGINT', () => {
    process.stderr.write('SIGINT received, shutting down...\n');
    clearInterval(keepAliveHandle);
    if (process.stdin.isTTY === false) {
      process.stdin.pause();
    }
    server.close(() => process.exit(0));
  });
  
  process.stderr.write(`[DEBUG] Server setup complete, listening on :${port}\n`);
} catch (err: any) {
  process.stderr.write(`Fatal error: ${err?.message || err}\n`);
  process.exit(1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  process.stderr.write(`Unhandled rejection: ${reason}\n`);
  process.exit(1);
});