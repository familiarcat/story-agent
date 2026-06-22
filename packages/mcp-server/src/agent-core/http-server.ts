/**
 * Agent HTTP/SSE server — the API surface over agent-core.
 *
 *   POST /agent   { input, clientId?, workspace?, tier? }  → text/event-stream of AgentEvents
 *   GET  /agent/health                                     → { ok }
 *
 * Each emitted AgentEvent is sent as one SSE `data:` frame; a terminal `event: done` closes it.
 * Any client (Next.js UI, scripts, the VS Code extension) drives the same loop this way — the
 * extension becomes a thin client instead of re-implementing the loop.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { runAgentLoop } from './loop.js';
import { buildBridges } from './bridges.js';

function authOk(req: IncomingMessage): boolean {
  const token = process.env.AGENT_SERVICE_TOKEN;
  if (!token) return true; // open on localhost when no token configured
  const hdr = req.headers['authorization'];
  return typeof hdr === 'string' && hdr === `Bearer ${token}`;
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

// PROD-12: per-invocation audit of the /agent path (no inputs/secrets stored — metadata only).
export interface AgentInvocationAudit {
  timestamp: string;
  clientId: string | null;
  authorized: boolean;
  inputChars: number;
  workspace?: string;
}
const agentAudit: AgentInvocationAudit[] = [];
const AGENT_AUDIT_MAX = 500;
function recordAgentInvocation(e: AgentInvocationAudit): void {
  agentAudit.push(e);
  if (agentAudit.length > AGENT_AUDIT_MAX) agentAudit.splice(0, agentAudit.length - AGENT_AUDIT_MAX);
}
export function getAgentInvocationAudit(): AgentInvocationAudit[] {
  return [...agentAudit];
}

export function startAgentHttpServer(port: number) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && req.url === '/agent/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'story-agent-agent', port }));
      return;
    }
    if (req.method !== 'POST' || req.url !== '/agent') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    if (!authOk(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    let body: any;
    try { body = await readBody(req); }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'bad_json' })); return; }

    const input = String(body.input ?? '').trim();
    if (!input) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'input_required' })); return; }

    // PROD-12: audit every agent invocation (metadata only — never the input text or secrets).
    recordAgentInvocation({ timestamp: new Date().toISOString(), clientId: body.clientId ?? null, authorized: true, inputChars: input.length, workspace: body.workspace });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const send = (data: unknown, event?: string) => {
      if (event) res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const clientId = body.clientId ?? null;
    try {
      const result = await runAgentLoop(input, {
        workspace: body.workspace,
        clientId,
        tier: body.tier,
        ...buildBridges(clientId),
        onEvent: (e) => send(e),
      });
      send(result, 'done');
    } catch (e: any) {
      send({ type: 'error', text: e?.message || String(e) }, 'error');
    } finally {
      res.end();
    }
  });

  server.listen(port, '0.0.0.0', () => {
    process.stderr.write(`story-agent Agent HTTP server listening on http://0.0.0.0:${port}/agent\n`);
  });
  return server;
}
