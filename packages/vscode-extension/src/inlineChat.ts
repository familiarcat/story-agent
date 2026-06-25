import * as vscode from 'vscode';
import { chatOnce } from './agentClient';

/**
 * Inline chat (Ctrl+I) — the crew's #1 next-build pick (Observation Lounge next-build, Picard #13).
 * Capture the editor selection (or the cursor line ±2 as fallback), ask a question via an input box,
 * and answer through the canonical Quark-optimized /chat brain (OpenRouter, cloud↔local). The answer
 * opens beside the editor as a Markdown doc — readable, copyable, non-destructive.
 */
export function registerInlineChat(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('story-agent.inlineChat', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage('Story Agent: open a file to use inline chat.'); return; }

      const sel = editor.selection;
      let codeRange: vscode.Range;
      if (!sel.isEmpty) {
        codeRange = new vscode.Range(sel.start, sel.end);
      } else {
        // Fallback: current line ±2 (the crew's "no selection" rule).
        const line = sel.active.line;
        const start = Math.max(0, line - 2);
        const end = Math.min(editor.document.lineCount - 1, line + 2);
        codeRange = new vscode.Range(start, 0, end, editor.document.lineAt(end).text.length);
      }
      const code = editor.document.getText(codeRange).slice(0, 6000); // token guard
      const lang = editor.document.languageId;
      const fileName = editor.document.fileName.split('/').pop() ?? 'selection';
      const locLabel = `${fileName}:${codeRange.start.line + 1}-${codeRange.end.line + 1}`;

      const question = await vscode.window.showInputBox({
        title: `Inline chat — Story Agent (using ${locLabel})`,
        prompt: 'Ask about or instruct a change to the selected code (OpenRouter / Quark-optimized)',
        placeHolder: 'e.g. explain this · find the bug · suggest a refactor',
      });
      if (!question) return;

      const message = `CONTEXT (${locLabel}):\n\`\`\`${lang}\n${code}\n\`\`\`\n\nQUESTION: ${question}`;

      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Story Agent (OpenRouter)…' },
        () => chatOnce(message),
      );
      if (!result.ok) {
        vscode.window.showWarningMessage('Story Agent: chat brain unreachable. Start it locally or set storyAgent.chat.agentServiceUrl.');
        return;
      }

      const md = `# Inline chat — ${locLabel}\n\n**Q:** ${question}\n\n${result.answer ?? ''}\n\n---\n_◇ ${result.model} · tier ${result.tier} · $${(result.costUSD ?? 0).toFixed(5)} (Quark-optimized)_\n`;
      const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: md });
      await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preview: true });
    })
  );
}
