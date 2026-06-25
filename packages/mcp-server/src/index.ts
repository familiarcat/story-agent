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
import { registerCrewAutonomyTools } from './tools/crew-autonomy-tools.js';
import { registerDocTools } from './tools/doc-tools-register.js';
import { registerStarshipTools } from './tools/starship-tools.js';
import { registerCrewIntegrityTools } from './tools/crew-integrity-tools.js';
import { CrewWebSocketServer } from './lib/websocket-server.js';
import { startRagHttpServer } from './lib/rag-http-server.js';
import { registerAhaTools } from './tools/aha-tools.js';
import { registerCrewMissionTools } from './tools/crew-mission-tools.js';
import { registerClientTools } from './tools/client-tools.js';
import { registerWorfGateTools } from './tools/worfgate-tools.js';
import { registerSkillTools } from './tools/skill-tools.js';
import { applySkillAnnotations } from './lib/apply-skill-annotations.js';
import { startAgentHttpServer, handleAgentRequest } from './agent-core/http-server.js';
import { hydrateClientPolicies } from '@story-agent/shared/client-registry';
import { initWorfGateCredentialProviders } from '@story-agent/shared/worfgate-credential-providers';
import { createHttpAuthMiddleware, reportMissingCredentialsAtStartup } from './lib/http-auth-middleware.js';

const server = new McpServer({
  name: 'story-agent',
  version: '1.0.0',
});

applySkillAnnotations(server);  // 📚 inject 5W1H theory → MCP ToolAnnotations on every registration
registerStoryTools(server);
registerRepoTools(server);
registerDeliveryTools(server);
// NOTE: registerCrewMemoryTools is now async - called in main()
registerCrewMemberTools(server);
registerCrewAutonomyTools(server);  // 🚀 Crew autonomy — personal tools for each member
registerDocTools(server);
registerCrewIntegrityTools(server);
registerStarshipTools(server);
registerAhaTools(server);  // 📋 Aha! — crew project/epic/story/sprint management via REST
registerCrewMissionTools(server);  // 🧭 6-stage pipeline: Picard→Riker→Quark→crew→Quark→Picard
registerClientTools(server);  // 👥 client onboarding + hierarchy (WorfGate-governed)
registerWorfGateTools(server);  // 🛡️ Worf's credential broker (presence/audit; values never exposed)
registerSkillTools(server);  // 📚 5W1H skill-theory introspection (describe_skill / coverage)

async function main() {
  // Initialize async tool registrations
  await registerCrewMemoryTools(server);

  // Report any missing credentials at startup — especially Client-tier requirements.
  reportMissingCredentialsAtStartup();

  // Register WorfGate external secret providers (Vault / AWS Secrets Manager) if configured.
  const activeProviders = initWorfGateCredentialProviders();
  process.stderr.write(`WorfGate credential providers: env${activeProviders.length ? ', ' + activeProviders.join(', ') : ''}\n`);

  // Hydrate dynamic client policies from Supabase so resolveClientPolicy (WorfGate/auth) sees
  // crew-onboarded clients. Best-effort — Client/familiarcat bootstrap works even if the DB is down.
  try {
    const { loaded } = await hydrateClientPolicies();
    process.stderr.write(`Hydrated ${loaded} client policy/policies from Supabase.\n`);
  } catch (e) {
    process.stderr.write(`Client policy hydration skipped: ${e instanceof Error ? e.message : String(e)}\n`);
  }

  // ── Stdio transport (VS Code / Claude Desktop / local use) ──────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('story-agent MCP server started (stdio)\n');

  // ── HTTP MCP transport (cs-p3-agent / enterprise integration) ───────────────
  // Enabled by setting STORY_AGENT_HTTP_PORT. Requires Bearer token auth.
  // Client-tier clients must present Entra JWT with correct tenant+audience.
  if (process.env.STORY_AGENT_HTTP_PORT) {
    const httpPort = parseInt(process.env.STORY_AGENT_HTTP_PORT, 10) || 3101;
    const authMiddleware = createHttpAuthMiddleware();

    const httpServer = createHTTPServer(async (req, res) => {
      // Mount the agent-core endpoint (/agent SSE, /symphony) on the SAME port as MCP so the deployed
      // crew is reachable via the existing target group — no extra container port / ECS service
      // replacement (crew deploy-optimization finding). Falls through to /mcp if not an agent route.
      if (await handleAgentRequest(req, res)) return;

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
          applySkillAnnotations(perRequestServer);  // 📚 theory → MCP annotations over HTTP
          registerStoryTools(perRequestServer);
          registerRepoTools(perRequestServer);
          registerDeliveryTools(perRequestServer);
          await registerCrewMemoryTools(perRequestServer);
          registerCrewMemberTools(perRequestServer);
          registerCrewAutonomyTools(perRequestServer);  // 🚀 Crew autonomy tools available via HTTP
          registerDocTools(perRequestServer);
          registerCrewIntegrityTools(perRequestServer);
          registerStarshipTools(perRequestServer);
          registerCrewMissionTools(perRequestServer);  // 🧭 mission pipeline over HTTP
          registerClientTools(perRequestServer);  // 👥 client onboarding over HTTP
          registerWorfGateTools(perRequestServer);  // 🛡️ Worf credential broker over HTTP
          registerSkillTools(perRequestServer);  // 📚 skill-theory introspection over HTTP

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
        `  Auth: Bearer token required (Client-tier: Entra JWT). Set CLIENT_ENTRA_TENANT_ID, CLIENT_ENTRA_AUDIENCE, CLIENT_ENTRA_JWKS_URI.\n`,
      );
    });
  }

  // ── RAG read service (crew cloud memory for the VS Code assistant) ──────────
  // Enabled by default on localhost; opt out with STORY_AGENT_RAG_DISABLE=1.
  if (process.env.STORY_AGENT_RAG_DISABLE !== '1') {
    const ragPort = parseInt(process.env.STORY_AGENT_RAG_PORT ?? '3102', 10) || 3102;
    startRagHttpServer(ragPort);
  }

  // ── Agent HTTP/SSE server (autonomous agent-core loop for all surfaces) ─────
  // Enabled by setting STORY_AGENT_AGENT_PORT (e.g. 3103). Optional Bearer (AGENT_SERVICE_TOKEN).
  if (process.env.STORY_AGENT_AGENT_PORT) {
    const agentPort = parseInt(process.env.STORY_AGENT_AGENT_PORT, 10) || 3103;
    startAgentHttpServer(agentPort);
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
