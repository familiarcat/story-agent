/**
 * Agent client — the VS Code surface over agent-core.
 *
 * The extension is a THIN CLIENT: instead of re-implementing the agentic loop, it streams the
 * shared agent-core `/agent` SSE endpoint (served by the MCP server) and renders the events
 * (tool calls, WorfGate tiers, text) into the chat. Same loop as the CLI and API.
 */
import * as vscode from 'vscode';

interface AgentEvent {
  type: 'model' | 'tool_call' | 'tool_result' | 'gate' | 'text' | 'done' | 'error' | 'escalation' | 'retry' | 'cost' | 'lens';
  text?: string;
  tool?: string;
  args?: unknown;
  tier?: 'green' | 'yellow' | 'red';
  remediations?: string[];
  model?: string;
  costUSD?: number;
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

function agentUrl(): string {
  const c = vscode.workspace.getConfiguration('storyAgent');
  const base = c.get<string>('chat.agentServiceUrl') || process.env.STORY_AGENT_AGENT_URL || 'http://localhost:3103';
  return base.replace(/\/$/, '') + '/agent';
}

function workspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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
): Promise<AgentTurnResult> {
  const url = agentUrl();
  const c = vscode.workspace.getConfiguration('storyAgent');
  const authToken = process.env.AGENT_SERVICE_TOKEN || c.get<string>('chat.agentServiceToken');
  const clientId = process.env.STORY_AGENT_CLIENT_ID || c.get<string>('chat.clientId') || null;

  stream.progress('Engaging the autonomous crew (agent-core)…');

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ input: prompt, workspace: workspacePath(), clientId }),
    });
  } catch (e) {
    stream.markdown(
      `⚠️ Could not reach the agent service at \`${url}\`.\n\n` +
      'Start the MCP server with the agent endpoint enabled:\n\n' +
      '```bash\nSTORY_AGENT_AGENT_PORT=3103 pnpm --filter @story-agent/mcp-server start\n```\n',
    );
    return { ok: false };
  }

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
