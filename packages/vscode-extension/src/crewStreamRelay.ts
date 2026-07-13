import * as vscode from 'vscode';
import { tailCrewStream, type CrewStreamEvent } from '@story-agent/shared';

function formatCrewEvent(event: CrewStreamEvent): string {
  const stamp = new Date(event.timestamp).toLocaleTimeString();
  const id = event.crew_id;
  const status = event.status.toUpperCase();
  const action = event.action_description || 'no action description';
  return `[${stamp}] ${id} ${status} — ${action}`;
}

export class CrewStreamRelay implements vscode.Disposable {
  private readonly channel = vscode.window.createOutputChannel('Story Agent Crew Stream');
  private intervalHandle: ReturnType<typeof setInterval> | undefined;
  private lastOffset = 0;
  private running = false;

  start(intervalMs = 2000): void {
    if (this.running) return;
    this.running = true;
    this.channel.appendLine('Crew stream relay started.');

    const poll = async (): Promise<void> => {
      try {
        const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceDir) return;

        const { events, newOffset } = await tailCrewStream(this.lastOffset, workspaceDir);
        this.lastOffset = newOffset;

        if (!events.length) return;

        for (const event of events) {
          this.channel.appendLine(formatCrewEvent(event));
          if (event.status === 'escalation') {
            vscode.window.setStatusBarMessage(
              `Story Agent escalation: ${event.crew_id} — ${event.action_description}`,
              6000,
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.channel.appendLine(`Relay poll error: ${msg}`);
      }
    };

    void poll();
    this.intervalHandle = setInterval(() => {
      void poll();
    }, intervalMs);
  }

  dispose(): void {
    this.running = false;
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.channel.appendLine('Crew stream relay stopped.');
    this.channel.dispose();
  }
}
