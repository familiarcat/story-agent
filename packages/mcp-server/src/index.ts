// MCP Server Main Entry Point
// Exports are handled via MCP tool definitions in /lib and /tools

import 'dotenv/config';
import { startAgentHttpServer } from './agent-core/http-server.js';

// Start the HTTP server for the agent-core endpoint
const port = Number(process.env.STORY_AGENT_AGENT_PORT || 3103);

try {
  const server = startAgentHttpServer(port);
  
  // Keep the process alive indefinitely
  setInterval(() => {}, 60000);
  
  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    process.stderr.write('SIGTERM received, shutting down...\n');
    server.close(() => process.exit(0));
  });
  
  process.on('SIGINT', () => {
    process.stderr.write('SIGINT received, shutting down...\n');
    server.close(() => process.exit(0));
  });
} catch (err: any) {
  process.stderr.write(`Fatal error: ${err?.message || err}\n`);
  process.exit(1);
}

// Also handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  process.stderr.write(`Unhandled rejection: ${reason}\n`);
  process.exit(1);
});