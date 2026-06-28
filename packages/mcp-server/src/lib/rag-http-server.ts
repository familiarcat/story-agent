/**
 * RAG read service — crew cloud memory for the VS Code assistant.
 *
 * Exposes the crew's cloud RAG (observation memories + documentation) over a small
 * localhost HTTP endpoint so the editor assistant can pull crew knowledge without
 * holding the service_role key. The read side of a crew-driven, codebase-aware assistant.
 *
 * Routes:
 *   GET  /rag/health           → liveness
 *   POST /rag/query {query,topK,clientId?,storyId?} → { memories[], docs[] }
 */
import { createServer, type ServerResponse } from 'http';
import { getRelevantObservationMemories, searchDocumentation } from '@story-agent/shared/db';
import { guardListen } from './port-guard.js';

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

// Deploy-validation markers on the ALB-reachable health path (3102): /rag/health is the mcp target
// group's health check, so curling the live ALB confirms WHICH image is serving (gitSha) and that it
// just rolled (startedAt). gitSha is baked into the image at build (docker/Dockerfile.mcp ARG GIT_SHA).
const RAG_STARTED_AT = new Date().toISOString();
const RAG_GIT_SHA = (process.env.GIT_SHA ?? 'dev').slice(0, 7);

export function startRagHttpServer(port: number): void {
  const token = process.env.RAG_SERVICE_TOKEN ?? '';

  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'GET' && req.url?.startsWith('/rag/health')) {
      sendJson(res, 200, { ok: true, service: 'story-agent-rag', port, gitSha: RAG_GIT_SHA, startedAt: RAG_STARTED_AT });
      return;
    }

    if (req.method === 'POST' && req.url?.startsWith('/rag/query')) {
      if (token && req.headers['authorization'] !== `Bearer ${token}`) {
        sendJson(res, 401, { error: 'unauthorized' });
        return;
      }
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1_000_000) req.destroy(); });
      req.on('end', async () => {
        try {
          const { query, topK = 4, clientId = null, storyId } = JSON.parse(body || '{}');
          if (!query || typeof query !== 'string') { sendJson(res, 400, { error: 'query (string) required' }); return; }
          const [memories, docs] = await Promise.all([
            getRelevantObservationMemories({ queryText: query, clientId, storyId, limit: topK }).catch(() => []),
            searchDocumentation(query, undefined, topK).catch(() => [] as any[]),
          ]);
          sendJson(res, 200, {
            memories: (memories ?? []).map((m) => ({
              storyId: m.storyId, tags: m.tags, similarity: m.similarity ?? null,
              text: (m.transcriptText ?? '').slice(0, 800),
            })),
            docs: (docs ?? []).map((d: any) => ({
              title: d.title, category: d.category,
              snippet: (d.chunk_content ?? '').slice(0, 800), similarity: d.similarity ?? null,
            })),
          });
        } catch (e) {
          sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
        }
      });
      return;
    }

    sendJson(res, 404, { error: 'not found', routes: ['GET /rag/health', 'POST /rag/query'] });
  });

  // Bind 0.0.0.0 (not localhost) so the Fargate ALB can reach /rag/health on this port — the
  // mcp target group health-checks 3102; a localhost bind is unreachable from the ALB and the task
  // fails its health check forever. (Matches the MCP HTTP 3101 + agent 3103 binds.)
  const host = process.env.STORY_AGENT_BIND_HOST ?? '0.0.0.0';
  guardListen(server, port, 'RAG read service');
  server.listen(port, host, () => {
    process.stderr.write(`story-agent RAG read service on http://${host}:${port}/rag (crew cloud memory + docs)\n`);
  });
}
