/**
 * Agent client — the VS Code surface over agent-core.
 *
 * The extension is a THIN CLIENT: instead of re-implementing the agentic loop, it streams the
 * shared agent-core `/agent` SSE endpoint (served by the MCP server) and renders the events
 * (tool calls, WorfGate tiers, text) into the chat. Same loop as the CLI and API.
 */
import * as vscode from 'vscode';

interface AgentEvent {
  type: 'model' | 'tool_call' | 'tool_result' | 'gate' | 'text' | 'done' | 'error' | 'escalation' | 'retry' | 'cost' | 'lens' | 'stall' | 'verify';
  text?: string;
  tool?: string;
  args?: unknown;
  tier?: 'green' | 'yellow' | 'red';
  remediations?: string[];
  model?: string;
  costUSD?: number;
  /** verify events: did the post-edit scoped typecheck pass. */
  ok?: boolean;
  // done frame carries the full AgentRunResult
  finalText?: string;
  iterations?: number;
  toolCalls?: unknown[];
  totalCostUSD?: number;
  totalTokens?: number;
  escalated?: boolean;
  budgetExceeded?: boolean;
  observatory?: { perProvider?: Record<string, number>; burnRatePerTurnUSD?: number; reviewTriggered?: boolean };
}

const TIER_ICON: Record<string, string> = { green: '🟢', yellow: '🟡', red: '🔴' };

const LOCAL_AGENT = 'http://localhost:3103';

function agentBase(): string {
  const c = vscode.workspace.getConfiguration('storyAgent');
  return (c.get<string>('chat.agentServiceUrl') || process.env.STORY_AGENT_AGENT_URL || LOCAL_AGENT).replace(/\/$/, '');
}

/**
 * Ordered agent endpoints to try: the configured/cloud URL first, then always the local loop.
 * This is the local↔cloud "stagger" — you keep vibing against localhost while the Fargate crew
 * deploys/syncs; once the cloud endpoint is reachable it's preferred (single source of truth).
 */
function agentCandidates(): string[] {
  const primary = agentBase();
  return primary === LOCAL_AGENT ? [LOCAL_AGENT] : [primary, LOCAL_AGENT];
}

interface AhaProduct {
  id: string;
  name: string;
  referencePrefix: string | null;
  url: string;
}

interface AhaResponse {
  products?: AhaProduct[];
}

function isAhaProductArray(obj: unknown): obj is AhaProduct[] {
  return Array.isArray(obj) && obj.every(p => 
    p && 
    typeof p === 'object' &&
    'id' in p && typeof p.id === 'string' &&
    'name' in p && typeof p.name === 'string' &&
    ('referencePrefix' in p && (p.referencePrefix === null || typeof p.referencePrefix === 'string')) &&
    'url' in p && typeof p.url === 'string'
  );
}

export async function fetchAhaHierarchy(token: vscode.CancellationToken): Promise<string> {
  if (token.isCancellationRequested) return '';
  
  for (const base of agentCandidates()) {
    try {
      const resp = await fetch(`${base}/aha/products`);
      if (!resp.ok) continue;
      
      const data = await resp.json() as unknown;
      let products: AhaProduct[] | null = null;
      
      if (isAhaProductArray(data)) {
        products = data;
      } else if (typeof data === 'object' && data !== null && 'products' in data) {
        const response = data as AhaResponse;
        if (isAhaProductArray(response.products)) {
          products = response.products;
        }
      }
      
      if (!products?.length) return '';
      
      const lines = ['**Aha hierarchy (firm → client → project):**'];
      for (const p of products.slice(0, 25)) {
        lines.push(p.referencePrefix ? `- **${p.referencePrefix}** — ${p.name}` : `- ${p.name}`);
      }
      return lines.join('\n');
    } catch {
      continue; // this base unreachable — fall through to the next (cloud→local stagger)
    }
  }

  return '';
}

/** Layer-5 posture panel — render the live firm→client→project + WorfGate + tool snapshot in chat. */
export async function renderSymphonyPanel(stream: vscode.ChatResponseStream): Promise<void> {
  let snap: any;
  try {
    const resp = await fetch(agentBase() + '/symphony');
    if (!resp.ok) { stream.markdown(`⚠️ /symphony returned HTTP ${resp.status}.`); return; }
    snap = await resp.json();
  } catch {
    stream.markdown(`⚠️ Could not reach the agent service. Start it: \`STORY_AGENT_AGENT_PORT=3103 pnpm --filter @story-agent/mcp-server start\`.`);
    return;
  }
  const tree = (n: any, d = 0): string => `${'  '.repeat(d)}- **${n.clientName}** (\`${n.clientId}\`) · ${n.tier}${n.worfGateEnforce ? ' · ⛨' : ''}\n` + (n.children ?? []).map((c: any) => tree(c, d + 1)).join('');
  const wg = snap.worfgate ?? {};
  stream.markdown(
    `## 🎼 Symphony — system posture\n\n` +
    `**Firm:** ${snap.firm}\n\n**Clients & projects:**\n${(snap.clients ?? []).map((n: any) => tree(n)).join('')}\n` +
    `**WorfGate:** providers ${(wg.providers ?? []).map((p: any) => p.name + (p.active ? '✓' : '')).join(' · ')} · ` +
    `credentials ${wg.credentials?.present}/${wg.credentials?.total}` +
    (wg.credentials?.missingRequired?.length ? ` · ⚠️ missing ${wg.credentials.missingRequired.join(', ')}` : '') + `\n\n` +
    `**Tools:** ${snap.tools?.theorized} with 5W1H theories · **recent agent runs:** ${snap.recentInvocations?.length ?? 0}\n`,
  );
}

function workspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export interface ChatOnceResult { ok: boolean; answer?: string; model?: string; tier?: number; costUSD?: number; }

export interface CrewChatAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
}

export interface CrewChatResult extends ChatOnceResult {
  provider?: string;
  tokensIn?: number;
  tokensOut?: number;
  sources?: string[];
  promptOptimization?: {
    applied: boolean;
    originalChars: number;
    optimizedChars: number;
    netCharDelta: number;
    rules: string[];
  };
  crewSelfOrganization?: {
    enabled: boolean;
    goals: string;
    missionPlan: string;
    topModel: string;
    totalCostUSD: number;
    totalTokens: number;
    providerCosts: Record<string, number>;
    teams: Array<{ teamId: string; label: string; members: string[]; domains: string[]; memoryHits: number }>;
    members: Array<{ crewId: string; domain: string; teamIds: string[]; memoryHits: number; memoryTitles: string[] }>;
  };
  costAnalysis?: {
    mode?: 'chat' | 'plan-then-execute';
    chatCostUSD: number;
    chatTokensIn: number;
    chatTokensOut: number;
    chatTotalTokens: number;
    crewPreparationCostUSD: number;
    crewPreparationTokens: number;
    executionRunCostUSD?: number;
    executionRunTokens?: number;
    totalCostUSD: number;
    totalTokens: number;
    provider: string;
    optimizationRules: string[];
  };
  executionActivation?: {
    activated: boolean;
    phrase: 'make-it-so' | 'next-steps';
    task: string;
    priorRuns: string[];
    missionId: string;
    iterations: number;
    toolCalls: number;
    escalated: boolean;
    stalled: boolean;
  };
}

export async function chatWithCrew(
  message: string,
  opts?: {
    clientId?: string | null;
    history?: Array<{ role: string; content: string }>;
    attachments?: CrewChatAttachment[];
  },
): Promise<CrewChatResult> {
  const clientId = opts?.clientId;
  let lastError = '';
  let lastBase = '';
  for (const base of agentCandidates()) {
    lastBase = base;
    try {
      const resp = await fetch(base + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          clientId: clientId ?? null,
          history: opts?.history ?? [],
          attachments: opts?.attachments ?? [],
          // Send the real workspace so an activation/action-intent turn edits the user's local files
          // (not the server cwd / a remote container). Mirrors what runAgentTurn already sends to /agent.
          workspace: workspacePath(),
        }),
      });
      if (!resp.ok) {
        lastError = `HTTP ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 150)}`.trim();
        continue;
      }
      const d: any = await resp.json();
      return {
        ok: true,
        answer: d.answer,
        model: d.model,
        tier: d.tier,
        costUSD: d.costUSD,
        provider: d.provider,
        tokensIn: d.tokensIn,
        tokensOut: d.tokensOut,
        sources: d.sources,
        promptOptimization: d.promptOptimization,
        crewSelfOrganization: d.crewSelfOrganization,
        costAnalysis: d.costAnalysis,
        executionActivation: d.executionActivation,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // next candidate
    }
  }
  // All candidates failed — surface the real reason instead of a bare {ok:false}
  // (which the UI renders as a generic "chat unavailable" with no diagnostic).
  const reason = lastError || 'no response';
  return {
    ok: false,
    answer: `Agent service unreachable at ${lastBase || 'the configured endpoint'} — ${reason}. Start it with \`pnpm dev\` (local :3103), or set storyAgent.chat.agentServiceUrl to the deployed URL.`,
  };
}

/**
 * One-shot canonical chat (no stream) — POSTs to the crew brain /chat (Quark-optimized model),
 * trying the configured/cloud endpoint then the local loop. Used by inline chat (Ctrl+I).
 */
export async function chatOnce(message: string, clientId?: string | null): Promise<ChatOnceResult> {
  const result = await chatWithCrew(message, { clientId });
  return { ok: result.ok, answer: result.answer, model: result.model, tier: result.tier, costUSD: result.costUSD };
}

export interface ChatTurnResult { ok: boolean; model?: string; costUSD?: number; }

/**
 * Canonical chat turn — routes a natural-language message to the Story Agent crew brain (/chat),
 * whose model is chosen by QUARK (quarkSelectModel). This is the optimized default selection; tries
 * the configured/cloud endpoint then the local loop (local↔cloud stagger). Returns ok:false if the
 * brain is unreachable so the caller can fall back to the in-editor token-optimizing assistant.
 */
export async function runChatTurn(
  message: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  history?: Array<{ role: string; content: string }>,
): Promise<ChatTurnResult> {
  const c = vscode.workspace.getConfiguration('storyAgent');
  const clientId = process.env.STORY_AGENT_CLIENT_ID || c.get<string>('chat.clientId') || null;
  const result = await chatWithCrew(message, { clientId, history });
  if (!result.ok) return { ok: false };
  if (token.isCancellationRequested) return { ok: true };
  stream.markdown(`${result.answer ?? ''}\n\n`);
  const promptRules = result.promptOptimization?.rules?.length ? ` · optimize:${result.promptOptimization.rules.join(',')}` : '';
  const teamSummary = result.crewSelfOrganization?.teams?.length
    ? ` · teams:${result.crewSelfOrganization.teams.map((team) => `${team.teamId}[${team.members.join('+')}]`).join(' / ')}`
    : '';
  const activationSummary = result.executionActivation?.activated
    ? ` · activated:${result.executionActivation.phrase} (${result.executionActivation.toolCalls} tools/${result.executionActivation.iterations} turns)`
    : '';
  const costSummary = result.costAnalysis
    ? ` · total $${result.costAnalysis.totalCostUSD.toFixed(5)} (${result.costAnalysis.totalTokens} tok; chat $${result.costAnalysis.chatCostUSD.toFixed(5)} + crew $${result.costAnalysis.crewPreparationCostUSD.toFixed(5)}${result.costAnalysis.executionRunCostUSD != null ? ` + run $${result.costAnalysis.executionRunCostUSD.toFixed(5)}` : ''})`
    : ` · $${(result.costUSD ?? 0).toFixed(5)}`;
  stream.markdown(`_◇ ${result.model} · tier ${result.tier}${costSummary}${promptRules}${teamSummary}${activationSummary} (Quark-optimized)_`);
  return { ok: true, model: result.model, costUSD: result.costUSD };
}

export interface AgentTurnResult {
  ok: boolean;
  iterations?: number;
  toolCount?: number;
  costUSD?: number;
  escalated?: boolean;
}

/** Run one autonomous agent turn against the shared agent-core endpoint, rendering events live. */
export async function runAgentTurn(
  prompt: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  opts?: { toolPolicy?: "full" | "read-only" }
): Promise<AgentTurnResult> {
  const c = vscode.workspace.getConfiguration('storyAgent');
  const authToken = process.env.AGENT_SERVICE_TOKEN || c.get<string>('chat.agentServiceToken');
  const clientId = process.env.STORY_AGENT_CLIENT_ID || c.get<string>('chat.clientId') || null;

  stream.progress('Engaging the autonomous crew (agent-core)…');

  // Try the configured/cloud endpoint, then fall back to the local loop (local↔cloud stagger).
  const candidates = agentCandidates();
  let resp: Response | undefined;
  let usedBase = '';
  for (const base of candidates) {
    try {
      resp = await fetch(base + '/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ input: prompt, workspace: workspacePath(), clientId, toolPolicy: opts?.toolPolicy }),
      });
      usedBase = base;
      break;
    } catch { /* try the next candidate */ }
  }
  if (!resp) {
    stream.markdown(
      `⚠️ Could not reach the agent service (tried: ${candidates.join(', ')}).\n\n` +
      'Start the local crew, or set `storyAgent.chat.agentServiceUrl` to the deployed endpoint:\n\n' +
      '```bash\nSTORY_AGENT_AGENT_PORT=3103 pnpm --filter @story-agent/mcp-server start\n```\n',
    );
    return { ok: false };
  }
  if (usedBase !== candidates[0]) stream.markdown(`_↪ primary endpoint unreachable — using local crew at ${usedBase}_\n`);

  if (!resp.ok || !resp.body) {
    stream.markdown(`⚠️ Agent service returned HTTP ${resp.status}.`);
    return { ok: false };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AgentTurnResult = { ok: true };
  let toolCount = 0;
  const posture = { green: 0, yellow: 0, red: 0 }; // WorfGate tally for the explainable feedback card

  while (true) {
    if (token.isCancellationRequested) { try { await reader.cancel(); } catch { /* ignore */ } break; }
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const dataLine = frame.split('\n').find(l => l.startsWith('data:'));
      if (!dataLine) continue;
      let e: AgentEvent;
      try { e = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }

      switch (e.type) {
        case 'model':
          stream.markdown(`\n_◇ model: \`${e.model}\` (Quark cost-optimized)_\n`);
          break;
        case 'lens':
          stream.markdown(`_🔎 lens: ${e.text}_\n`); // Layer-3 dynamic tool composition
          break;
        case 'tool_call':
          toolCount++;
          stream.progress(`${e.tool}…`);
          stream.markdown(`\n**→ ${e.tool}** \`${JSON.stringify(e.args).slice(0, 120)}\`\n`);
          break;
        case 'gate':
          if (e.tier && e.tier in posture) posture[e.tier]++;
          stream.markdown(
            `&nbsp;&nbsp;⛨ WorfGate ${TIER_ICON[e.tier ?? ''] ?? ''} ${e.tier}` +
            (e.remediations?.length ? ` _(remediated: ${e.remediations.join('; ')})_` : '') + '\n',
          );
          break;
        case 'retry':
          stream.markdown(`&nbsp;&nbsp;_↻ ${e.text}_\n`); // backoff/transient retry (PROD-11)
          break;
        case 'cost':
          stream.markdown(`\n> 💰 **Cost review:** ${e.text}\n`); // soft spend cap → WorfGate review (PROD-13)
          break;
        case 'escalation':
          stream.markdown(`\n> 🔴 **Escalation:** ${e.text}\n`);
          break;
        case 'stall':
          stream.markdown(`&nbsp;&nbsp;_↻ ${e.text}_\n`); // self-healing stall nudge
          break;
        case 'verify':
          stream.markdown(e.ok ? `&nbsp;&nbsp;_✓✓ ${e.text}_\n` : `\n> ⚠️ **Verify:** ${e.text}\n`); // multi-file reliability gate
          break;
        case 'text':
          if (e.text?.trim()) stream.markdown('\n' + e.text + '\n');
          break;
        case 'error':
          stream.markdown(`\n⚠️ ${e.text}\n`);
          result.ok = false;
          break;
        case 'done': {
          result = {
            ok: true,
            iterations: e.iterations,
            toolCount: e.toolCalls?.length ?? toolCount,
            costUSD: e.totalCostUSD,
            escalated: e.escalated,
          };
          // Symphony feedback card — the agent "shows its work": governance posture, cost, execution.
          const obs = e.observatory ?? {};
          const providerMix = Object.entries(obs.perProvider ?? {}).map(([p, c]) => `${p} $${(c as number).toFixed(4)}`).join(' · ');
          const postureLine = `🟢 ${posture.green} · 🟡 ${posture.yellow} · 🔴 ${posture.red}`;
          stream.markdown(
            `\n\n---\n### 🎼 Symphony\n` +
            `- **Model** \`${e.model}\` · ${e.iterations} turns · ${e.toolCalls?.length ?? toolCount} tools\n` +
            `- **WorfGate posture** ${postureLine}` + (e.escalated ? ' · escalated to crew' : '') + '\n' +
            `- **Cost** ~$${(e.totalCostUSD ?? 0).toFixed(5)} · ${e.totalTokens} tok` +
            (obs.burnRatePerTurnUSD ? ` · burn $${obs.burnRatePerTurnUSD.toFixed(5)}/turn` : '') +
            (providerMix ? ` · ${providerMix}` : '') +
            (obs.reviewTriggered ? ' · ⚠️ cost-review' : '') + (e.budgetExceeded ? ' · budget-capped' : '') + '\n',
          );
          break;
        }
      }
    }
  }

  return result;
}
