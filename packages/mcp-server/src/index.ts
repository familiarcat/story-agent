import 'dotenv/config';
import { createServer as createHTTPServer } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerStoryTools } from './tools/story-tools.js';
import { registerRepoTools } from './tools/repo-tools.js';
import { registerDeliveryTools } from './tools/delivery-tools.js';
import { registerCrewMemoryTools } from './tools/crew-memory-tools.js';
import { registerCrewMemberTools } from './tools/crew-member-tools.js';
import { registerDocTools } from './tools/doc-tools-register.js';
import { registerStarshipTools } from './tools/starship-tools.js';
import { registerCrewIntegrityTools } from './tools/crew-integrity-tools.js';
import { CrewWebSocketServer } from './lib/websocket-server.js';
import { createHttpAuthMiddleware, reportMissingCredentialsAtStartup } from './lib/http-auth-middleware.js';

const server = new McpServer({
  name: 'story-agent',
  version: '1.0.0',
});

registerStoryTools(server);
registerRepoTools(server);
registerDeliveryTools(server);
// NOTE: registerCrewMemoryTools is now async - called in main()
registerCrewMemberTools(server);
registerDocTools(server);
registerCrewIntegrityTools(server);
registerStarshipTools(server);

async function main() {
  // Initialize async tool registrations
  await registerCrewMemoryTools(server);

  // Report any missing credentials at startup — especially Bayer-tier requirements.
  reportMissingCredentialsAtStartup();

  // ── Stdio transport (VS Code / Claude Desktop / local use) ──────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('story-agent MCP server started (stdio)\n');

  // ── HTTP MCP transport (cs-p3-agent / enterprise integration) ───────────────
  // Enabled by setting STORY_AGENT_HTTP_PORT. Requires Bearer token auth.
  // Bayer-tier clients must present Entra JWT with correct tenant+audience.
  if (process.env.STORY_AGENT_HTTP_PORT) {
    const httpPort = parseInt(process.env.STORY_AGENT_HTTP_PORT, 10) || 3101;
    const authMiddleware = createHttpAuthMiddleware();

    const httpServer = createHTTPServer((req, res) => {
      // Only expose the /mcp endpoint
      if (req.url !== '/mcp' && req.url !== '/mcp/') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
        return;
      }

      // Validate auth before handing off to MCP transport
      authMiddleware(
        req as Parameters<typeof authMiddleware>[0],
        res as Parameters<typeof authMiddleware>[1],
        async () => {
          // Each HTTP request gets its own stateless transport per MCP spec
          const httpTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless — session tracked via user-session-id header
          });
          // Connect a fresh server instance per request
          const perRequestServer = new McpServer({
            name: 'story-agent',
            version: '1.0.0',
          });
          registerStoryTools(perRequestServer);
          registerRepoTools(perRequestServer);
          registerDeliveryTools(perRequestServer);
          await registerCrewMemoryTools(perRequestServer);
          registerCrewMemberTools(perRequestServer);
          registerDocTools(perRequestServer);
          registerCrewIntegrityTools(perRequestServer);
          registerStarshipTools(perRequestServer);

          await perRequestServer.connect(httpTransport);

          await httpTransport.handleRequest(
            req as import('http').IncomingMessage,
            res as import('http').ServerResponse,
          );
        },
      );
    });

    httpServer.listen(httpPort, '0.0.0.0', () => {
      process.stderr.write(
        `story-agent MCP HTTP server listening on http://0.0.0.0:${httpPort}/mcp\n`,
      );
      process.stderr.write(
        `  Auth: Bearer token required (Bayer-tier: Entra JWT). Set BAYER_ENTRA_TENANT_ID, BAYER_ENTRA_AUDIENCE, BAYER_ENTRA_JWKS_URI.\n`,
      );
    });
  }

  // ── WebSocket server (optional, crew state broadcasting) ───────────────────
  if (process.env.STORY_AGENT_WS_PORT) {
    const wsPort = parseInt(process.env.STORY_AGENT_WS_PORT, 10) || 8000;
    const wsHttpServer = createHTTPServer();
    new CrewWebSocketServer(wsHttpServer);

    wsHttpServer.listen(wsPort, 'localhost', () => {
      process.stderr.write(`story-agent WebSocket server listening on ws://localhost:${wsPort}\n`);
    });
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
