/**
 * Story Agent RAG read service.
 *
 * Exposes the crew's cloud RAG memory (observation memories + documentation) over a
 * small localhost HTTP endpoint so the VS Code assistant can pull crew knowledge —
 * the read side of a crew-driven, codebase-aware assistant. Uses the cloud (service_role)
 * Supabase client from @story-agent/shared, which the extension itself must never hold.
 *
 * Run:  zsh -ic 'npx tsx scripts/start-rag-service.ts'   (loads CREW/SUPABASE env)
 * Port: STORY_AGENT_RAG_PORT (default 3102). Optional auth: RAG_SERVICE_TOKEN.
 *
 * Imports shared via relative source path so it runs under tsx without building the
 * shared package (which currently has unrelated type errors). Once shared builds, the
 * same handler can be folded into the MCP server's main() as lib/rag-http-server.ts.
 */
import { createServer } from 'http';
import {
  getRelevantObservationMemories,
  searchDocumentation,
} from '../packages/shared/src/db.js';

const PORT = parseInt(process.env.STORY_AGENT_RAG_PORT ?? '3102', 10) || 3102;
const TOKEN = process.env.RAG_SERVICE_TOKEN ?? '';

function json(res: any, code: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

const server = createServer((req, res) => {
  // CORS — the VS Code extension host calls this from localhost.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url?.startsWith('/rag/health')) {
    json(res, 200, { ok: true, service: 'story-agent-rag', port: PORT });
    return;
  }

  if (req.method === 'POST' && req.url?.startsWith('/rag/query')) {
    if (TOKEN && req.headers['authorization'] !== `Bearer ${TOKEN}`) {
      json(res, 401, { error: 'unauthorized' });
      return;
    }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const { query, topK = 4, clientId = null, storyId } = JSON.parse(body || '{}');
        if (!query || typeof query !== 'string') { json(res, 400, { error: 'query (string) required' }); return; }

        const [memories, docs] = await Promise.all([
          getRelevantObservationMemories({ queryText: query, clientId, storyId, limit: topK }).catch(() => []),
          searchDocumentation(query, undefined, topK).catch(() => [] as any[]),
        ]);

        json(res, 200, {
          memories: (memories ?? []).map((m) => ({
            storyId: m.storyId,
            tags: m.tags,
            similarity: m.similarity ?? null,
            text: (m.transcriptText ?? '').slice(0, 800),
          })),
          docs: (docs ?? []).map((d: any) => ({
            title: d.title,
            category: d.category,
            snippet: (d.chunk_content ?? '').slice(0, 800),
            similarity: d.similarity ?? null,
          })),
        });
      } catch (e) {
        json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    });
    return;
  }

  json(res, 404, { error: 'not found', routes: ['GET /rag/health', 'POST /rag/query'] });
});

server.listen(PORT, 'localhost', () => {
  process.stdout.write(`story-agent RAG read service on http://localhost:${PORT}/rag (crew cloud memory + docs)\n`);
});
