import * as vscode from 'vscode';

export interface AhaSyncEvent {
  id: string;
  createdAt: string;
  resourceType: string;
  resourceId: string;
  operation: string;
  actor: string;
  meta?: Record<string, unknown>;
}

const LOCAL_AGENT = 'http://localhost:3103';

/** Same base resolution as agentClient/aha: configured/cloud endpoint first, then the local loop. */
function agentBases(): string[] {
  const configured = (vscode.workspace.getConfiguration('storyAgent').get<string>('chat.agentServiceUrl') || process.env.STORY_AGENT_AGENT_URL || '').replace(/\/$/, '');
  return configured && configured !== LOCAL_AGENT ? [configured, LOCAL_AGENT] : [LOCAL_AGENT];
}

/**
 * Polls the crew server's {base}/aha/events feed. Poll contract: the first call carries no `since`
 * and returns only `now`; each subsequent call passes the previous response's `now` as `since`.
 * No WebSocket, no Supabase — surfaces never talk to Supabase directly (Worf ruling).
 */
export class AhaSyncPoller {
  private timer: ReturnType<typeof setInterval> | undefined;
  private cursor: string | null = null;
  private listeners: Array<(event: AhaSyncEvent) => void> = [];
  private output: vscode.OutputChannel | undefined;
  private warnedOnce = false;

  onEvent(cb: (event: AhaSyncEvent) => void): void {
    this.listeners.push(cb);
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => { void this.tick(); }, 15000);
  }

  private async tick(): Promise<void> {
    for (const base of agentBases()) {
      try {
        const qs = this.cursor ? `?since=${encodeURIComponent(this.cursor)}` : '';
        const resp = await fetch(`${base}/aha/events${qs}`);
        if (!resp.ok) continue;
        const data = await resp.json() as { events?: AhaSyncEvent[]; now?: string };
        if (data.now) this.cursor = data.now;
        for (const event of data.events ?? []) {
          for (const cb of this.listeners) cb(event);
        }
        return;
      } catch { /* next base */ }
    }
    // Sync lag is non-fatal: log once, then silently skip failed ticks (no per-tick spam).
    if (!this.warnedOnce) {
      this.warnedOnce = true;
      this.output ??= vscode.window.createOutputChannel('Story Agent Aha Sync');
      this.output.appendLine('Aha sync feed unreachable — tree auto-refresh paused until the agent server responds.');
    }
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.output?.dispose();
  }
}
