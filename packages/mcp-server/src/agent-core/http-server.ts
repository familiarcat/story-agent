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
import { guardListen } from '../lib/port-guard.js';
import { handleChatRequest, handleOpenAICompatibleChatRequest } from './chat.js';
import { recordCost, costSummary } from './cost-ledger.js';
import { resolveClientId } from './client-identity.js';
import { handleAhaRequest } from './aha-http.js';
import { runAgentLoop } from './loop.js';
import { buildBridges } from './bridges.js';
import { awaitApproval, resolveApproval } from './approval-registry.js';
import { listClientHierarchy } from '@story-agent/shared/client-security-policy';
import { hydrateClientPolicies } from '@story-agent/shared/client-registry';
import { credentialStatus, listCredentialProviders } from '@story-agent/shared/worfgate-credentials';
import { listSkillTheories } from '@story-agent/shared/skill-theory';
import { getRecentObservationMemories } from '@story-agent/shared/db';
import '../lib/skill-theories.js';
import '../lib/skill-theories-generated.js';

// Deploy-validation markers (crew mission `fargate-deploy-validation`, OBS 07989292): the agent
// server records WHEN it booted and WHICH commit it was built from, so curling /agent/health on a
// live Fargate task confirms the rollout (startedAt changes per deploy; gitSha pins the image to a
// commit). GIT_SHA is baked into the image at build time (docker/Dockerfile.mcp ARG); 'dev' locally.
const SERVER_STARTED_AT = new Date().toISOString();
const GIT_SHA = (process.env.GIT_SHA ?? 'dev').slice(0, 7);

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

// Wave-2 interactive approvals: brokered via approval-registry (Redis pub/sub, multi-task safe, with
// an in-process fallback when no REDIS_URL). The SSE /agent stream emits a gate with an approvalId;
// the browser POSTs /agent/approve (possibly to a different task) to resolve it.
const APPROVAL_TIMEOUT_MS = Number(process.env.AGENT_APPROVAL_TIMEOUT_MS || 180_000);

/**
 * Handle an agent-core HTTP request (/agent, /symphony, /agent/health). Returns true if it served
 * the request, false if the route isn't ours (so a host server can fall through to its own routes).
 * This lets the agent endpoint be mounted on the EXISTING MCP HTTP server (port 3101) — no separate
 * container port / target group / ECS load_balancer block, which would force a slow service
 * replacement (crew deploy-optimization finding).
 */
export async function handleAgentRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (await handleOpenAICompatibleChatRequest(req, res)) return true; // external OpenAI-compatible facade
  if (await handleChatRequest(req, res)) return true; // canonical Quark-optimized /chat
  if (await handleAhaRequest(req, res)) return true;  // Aha products (single source, cached)
  const url = (req.url || '').split('?')[0];
  if (!(url === '/agent' || url === '/agent/' || url === '/agent/approve' || url === '/agent/health' || url === '/symphony' || url === '/cost' || url === '/learnings')) return false;
  await serveAgent(req, res, url);
  return true;
}

export function startAgentHttpServer(port: number) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (await handleOpenAICompatibleChatRequest(req, res)) return; // minimal OpenAI-compatible /v1/chat/completions
    if (await handleChatRequest(req, res)) return; // canonical Quark-optimized /chat
    if (await handleAhaRequest(req, res)) return;  // Aha products (single source, cached)
    await serveAgent(req, res, (req.url || '').split('?')[0], port);
  });

  guardListen(server, port, 'Agent HTTP server');
  server.listen(port, '0.0.0.0', () => {
    process.stderr.write(`story-agent Agent HTTP server listening on http://0.0.0.0:${port}/agent\n`);
  });
  return server;
}

async function serveAgent(req: IncomingMessage, res: ServerResponse, url: string, port?: number): Promise<void> {
  try {
    if (req.method === 'GET' && url === '/agent/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify({ ok: true, service: 'story-agent-agent', port, gitSha: GIT_SHA, startedAt: SERVER_STARTED_AT }));
      return;
    }
    // Cost Observatory — aggregate spend by provider/model + savings vs an Anthropic-frontier baseline.
    if (req.method === 'GET' && url === '/cost') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(costSummary(), null, 2));
      return;
    }
    // Self-learning — recent agent-run feedback cards (the crew's learnings from past autonomous runs).
    if (req.method === 'GET' && url === '/learnings') {
      let cards: any[] = [];
      try {
        const mems = await getRecentObservationMemories(20, 'agent-run');
        cards = mems.map((m) => {
          const ev = (m.transcript?.rounds?.[0]?.entries?.[0]?.evidence ?? []) as string[];
          const pick = (p: string) => ev.find((e) => e.startsWith(p))?.slice(p.length) ?? '';
          return {
            timestamp: m.createdAt,
            input: m.transcript?.rounds?.[0]?.entries?.[0]?.statement?.slice(0, 200) ?? '',
            outcome: m.transcript?.consensusSummary ?? '',
            model: pick('model:'),
            tools: pick('tools:'),
            clientId: m.clientId ?? null,
          };
        });
      } catch { /* RAG optional */ }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ count: cards.length, cards }, null, 2));
      return;
    }
    // Symphonic-MCP Layer-5 posture snapshot — firm/client/project hierarchy, WorfGate posture,
    // tool-theory coverage, recent agent invocations. Presence/metadata only — never secret values.
    if (req.method === 'GET' && url === '/symphony') {
      try { await hydrateClientPolicies(); } catch { /* fall back to bootstrap */ }
      const creds = credentialStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        firm: 'familiarcat',
        clients: listClientHierarchy(),
        worfgate: {
          providers: listCredentialProviders(),
          credentials: { present: creds.filter(c => c.available).length, total: creds.length, missingRequired: creds.filter(c => c.required && !c.available).map(c => c.name) },
        },
        tools: { theorized: listSkillTheories().length },
        recentInvocations: getAgentInvocationAudit().slice(-10),
      }, null, 2));
      return;
    }
    // Back-channel for interactive approvals: resolve a pending gate decision.
    if (req.method === 'POST' && url === '/agent/approve') {
      let abody: any;
      try { abody = await readBody(req); }
      catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'bad_json' })); return; }
      const id = String(abody.id ?? '');
      const decision: 'approve' | 'deny' = abody.decision === 'approve' ? 'approve' : 'deny';
      const reached = await resolveApproval(id, decision);
      if (!reached) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'no_pending_approval' })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id, decision }));
      return;
    }

    if (req.method !== 'POST' || (url !== '/agent' && url !== '/agent/')) {
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

    const clientId = body.clientId ?? resolveClientId(req.headers as Record<string, string | string[] | undefined>);
    try {
      const result = await runAgentLoop(input, {
        workspace: body.workspace,
        clientId,
        tier: body.tier,
        toolPolicy: body.toolPolicy,
        ...buildBridges(clientId),
        onEvent: (e) => send(e),
        requireApproval: body.requireApproval === true,
        // Brokered via Redis pub/sub (multi-task safe) with an in-process fallback; auto-denies on
        // timeout so a closed tab can never hang the loop forever.
        requestApproval: ({ approvalId }) => awaitApproval(approvalId, APPROVAL_TIMEOUT_MS),
      });
      try {
        const tt = (result as any).totalTokens ?? 0;
        recordCost({ timestamp: new Date().toISOString(), surface: 'agent', model: (result as any).model ?? 'unknown', provider: ((result as any).model ?? '').split('/')[0] || 'openrouter', tokensIn: Math.round(tt / 2), tokensOut: Math.round(tt / 2), costUSD: (result as any).totalCostUSD ?? 0 });
      } catch { /* ledger best-effort */ }
      send(result, 'done');
    } catch (e: any) {
      send({ type: 'error', text: e?.message || String(e) }, 'error');
    } finally {
      res.end();
    }
  } catch (err: any) {
    // Never let an agent/symphony/chat request reject the async HTTP handler — an unhandled
    // rejection crashes the Node process (exit 1) and fails the ECS deployment.
    try {
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: err?.message || 'agent_error' })); }
      else res.end();
    } catch { /* response already torn down */ }
  }
}
