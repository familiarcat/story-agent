import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerStoryTools } from './tools/story-tools.js';
import { registerRepoTools } from './tools/repo-tools.js';
import { registerDeliveryTools } from './tools/delivery-tools.js';
import { registerCrewMemoryTools } from './tools/crew-memory-tools.js';
import { registerCrewMemberTools } from './tools/crew-member-tools.js';

const server = new McpServer({
  name: 'story-agent',
  version: '1.0.0',
});

registerStoryTools(server);
registerRepoTools(server);
registerDeliveryTools(server);
registerCrewMemoryTools(server);
registerCrewMemberTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log only to stderr — stdout is reserved for MCP JSON-RPC messages
  process.stderr.write('story-agent MCP server started\n');
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
