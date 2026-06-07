import 'dotenv/config';
import { createServer as createHTTPServer } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerStoryTools } from './tools/story-tools.js';
import { registerRepoTools } from './tools/repo-tools.js';
import { registerDeliveryTools } from './tools/delivery-tools.js';
import { registerCrewMemoryTools } from './tools/crew-memory-tools.js';
import { registerCrewMemberTools } from './tools/crew-member-tools.js';
import { registerDocTools } from './tools/doc-tools-register.js';
import { registerStarshipTools } from './tools/starship-tools.js';
import { CrewWebSocketServer } from './lib/websocket-server.js';

const server = new McpServer({
  name: 'story-agent',
  version: '1.0.0',
});

registerStoryTools(server);
registerRepoTools(server);
registerDeliveryTools(server);
registerCrewMemoryTools(server);
registerCrewMemberTools(server);
registerDocTools(server);
registerStarshipTools(server);

async function main() {
  // Start MCP server on stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('story-agent MCP server started\n');

  // Start WebSocket server on HTTP (optional, controlled by env var)
  if (process.env.STORY_AGENT_WS_PORT) {
    const wsPort = parseInt(process.env.STORY_AGENT_WS_PORT, 10) || 8000;
    const httpServer = createHTTPServer();
    new CrewWebSocketServer(httpServer);
    
    httpServer.listen(wsPort, 'localhost', () => {
      process.stderr.write(`story-agent WebSocket server listening on ws://localhost:${wsPort}\n`);
    });
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
