/**
 * Chat Panel — native VS Code webview for crew chat with WebSocket backing.
 *
 * Provides a persistent, dockable chat interface at the bottom of VS Code that:
 * - Connects to the crew via WebSocket proxy (auto-reconnect, batching)
 * - Maintains conversation history per session
 * - Can attach file references and workspace context
 * - Shows cost/model metadata for each response
 * - Displays connection status and priority queue status
 */

import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { webviewTokenStyle, type WebviewThemeId } from '@story-agent/shared/ui-tokens';
import { getChatClient, getChatClientStatus } from '../chat/chat-engine';

function getNonce(): string {
  return randomBytes(16).toString('base64');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  costUSD?: number;
  timestamp?: number;
  inProgress?: boolean; // Track if still receiving chunks
  metadata?: Record<string, unknown>; // Store execution/crew metadata
}

export class ChatPanel {
  private static instance: ChatPanel | null = null;
  private panel: vscode.WebviewPanel;
  private context: vscode.ExtensionContext;
  private history: ChatMessage[] = [];
  private sessionId = `session-${Date.now()}`;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;

    this.panel = vscode.window.createWebviewPanel(
      'storyAgentChat',
      '💬 Story Agent Chat',
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
      {
        enableScripts: true,
        enableForms: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    this.panel.onDidDispose(() => this.dispose());
    this.setupWebviewHandlers();
    this.updatePanel();
  }

  /** Get or create the singleton chat panel instance */
  static show(context: vscode.ExtensionContext): ChatPanel {
    if (!ChatPanel.instance) {
      ChatPanel.instance = new ChatPanel(context);
    } else {
      ChatPanel.instance.panel.reveal(vscode.ViewColumn.Two, false);
    }
    return ChatPanel.instance;
  }

  private setupWebviewHandlers(): void {
    this.panel.webview.onDidReceiveMessage(async (msg: Record<string, unknown>) => {
      switch (msg.command) {
        case 'sendMessage': {
          const userMessage = String(msg.message ?? '').trim();
          if (!userMessage) break;

          // Add user message to history
          this.history.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
          });

          // Show thinking indicator
          this.panel.webview.postMessage({
            command: 'thinkingStart',
          });

          try {
            const response = await this.callCrewChatViaWebSocket(userMessage);

            // Add assistant response to history
            this.history.push({
              role: 'assistant',
              content: response.answer,
              model: response.model,
              costUSD: response.costUSD,
              timestamp: Date.now(),
            });

            this.panel.webview.postMessage({
              command: 'messageReceived',
              role: 'assistant',
              content: response.answer,
              model: response.model,
              costUSD: response.costUSD,
              sources: response.sources,
              executionActivation: response.executionActivation,
              crewSelfOrganization: response.crewSelfOrganization,
              costAnalysis: response.costAnalysis,
            });
          } catch (err) {
            // FIX #2: Sanitize error messages (no tokens/paths/URLs)
            let errorMsg = err instanceof Error ? err.message : String(err);
            // Remove common secret patterns
            errorMsg = errorMsg
              .replace(/\/[\w\/.:-]+/g, '[path]') // file paths
              .replace(/https?:\/\/[^\s]+/g, '[url]') // URLs
              .replace(/Bearer\s+\S+/gi, '[bearer-token]') // bearer tokens
              .replace(/api[-_]?key\s*[:=]\s*\S+/gi, '[api-key]') // API keys
              .replace(/token\s*[:=]\s*\S+/gi, '[token]') // tokens
              .replace(/\w+\s*=\s*([a-f0-9]{32,}|[a-zA-Z0-9_\-]{40,})/gi, '[secret]') // env secrets + SSH keys
              .replace(/(?:postgres|mysql|mongodb):\/\/[^@]+@[^\s]+/gi, '[db-url]'); // database credentials

            this.panel.webview.postMessage({
              command: 'error',
              message: errorMsg,
            });
          }

          this.panel.webview.postMessage({ command: 'thinkingEnd' });
          break;
        }

        case 'attachFile': {
          const uri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Attach',
          });

          if (uri && uri[0]) {
            const filePath = uri[0].fsPath;
            try {
              const content = await vscode.workspace.fs.readFile(uri[0]);
              const text = new TextDecoder().decode(content);

              this.panel.webview.postMessage({
                command: 'fileAttached',
                path: filePath,
                size: text.length,
              });

              // Include file in next message
              this.history[this.history.length - 1] = {
                ...this.history[this.history.length - 1],
                content: `[File: ${filePath}]\n\`\`\`\n${text.slice(0, 2000)}${text.length > 2000 ? '\n...' : ''}\n\`\`\`\n\n${this.history[this.history.length - 1].content}`,
              };
            } catch (err) {
              vscode.window.showErrorMessage(`Failed to read file: ${err}`);
            }
          }
          break;
        }

        case 'clearHistory': {
          this.history = [];
          this.panel.webview.postMessage({ command: 'historyCleared' });
          break;
        }

        case 'copyToClipboard': {
          const text = String(msg.text ?? '');
          await vscode.env.clipboard.writeText(text);
          vscode.window.showInformationMessage('Copied to clipboard');
          break;
        }

        case 'openSettings':
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'storyAgent'
          );
          break;
      }
    });
  }

  private async callCrewChatViaWebSocket(message: string): Promise<{
    answer: string;
    model: string;
    costUSD: number;
    sources: string[];
    executionActivation?: unknown;
    crewSelfOrganization?: unknown;
    costAnalysis?: unknown;
  }> {
    // FIX #5: Use actual WebSocket ChatClient instead of HTTP
    const chatClient = getChatClient();
    if (!chatClient) {
      throw new Error('Chat client not initialized');
    }

    // Convert history to chat format (last 8 turns)
    const chatHistory = this.history
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    return new Promise((resolve, reject) => {
      // Generate unique message ID
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Set up response handler
      const unsubscribe = chatClient.onChatResponse(msgId, (response) => {
        if (response.done) {
          unsubscribe();
          const raw = response as unknown as Record<string, unknown>;
          resolve({
            answer: response.content,
            model: response.model,
            costUSD: response.costUSD,
            sources: response.sources || [],
            executionActivation: raw.executionActivation,
            crewSelfOrganization: raw.crewSelfOrganization,
            costAnalysis: raw.costAnalysis,
          });
        } else if (response.content) {
          // Partial chunk frame — stream the accumulated answer into the webview live.
          this.panel.webview.postMessage({ command: 'chunkUpdate', content: response.content });
        }
      });

      // Send request via WebSocket — pass msgId as the correlation id so the proxy echoes it
      // back and the handler registered above (keyed by msgId) actually matches the response.
      chatClient.send({
        id: msgId,
        message,
        priority: 'high',
        sessionId: this.sessionId,
        userId: vscode.env.sessionId || 'vscode-user',
        context: chatHistory as any,
      }).catch((err) => {
        unsubscribe();
        reject(err);
      });

      // Timeout: 30s max (matches HTTP timeout)
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Chat response timeout'));
      }, 30000);
    });
  }

  private updatePanel(): void {
    if (!this.panel) return;
    this.panel.webview.html = this.buildHtml();
  }

  private uiTheme(): WebviewThemeId {
    const value = vscode.workspace.getConfiguration('storyAgent').get<string>('uiTheme') ?? 'lcars';
    return value === 'lcars' || value === 'dark' || value === 'light' || value === 'vscode'
      ? value
      : 'lcars';
  }

  private buildHtml(): string {
    const nonce = getNonce();
    const theme = this.uiTheme();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Story Agent Chat</title>
  ${webviewTokenStyle(nonce, theme)}
  <style nonce="${nonce}">
    * { box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--sa-text);
      background: var(--vscode-editor-background);
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .message {
      padding: 8px 10px;
      border-radius: 4px;
      word-wrap: break-word;
      line-height: 1.5;
    }

    .message.user {
      align-self: flex-end;
      background: var(--sa-primary);
      color: var(--sa-onAccent);
      max-width: 75%;
      border-radius: 6px 2px 6px 6px;
    }

    .message.assistant {
      align-self: flex-start;
      background: var(--sa-card);
      color: var(--sa-text);
      border: 1px solid var(--sa-border);
      border-radius: 2px 6px 6px 6px;
      max-width: 85%;
    }

    .message-meta {
      font-size: 11px;
      color: var(--sa-muted);
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid var(--sa-border);
    }

    .sources {
      font-size: 11px;
      color: var(--sa-muted);
      margin-top: 4px;
    }

    .sources code {
      background: var(--vscode-editor-background);
      padding: 1px 3px;
      border-radius: 2px;
      font-family: var(--vscode-editor-font-family);
    }

    .thinking {
      align-self: center;
      color: var(--sa-muted);
      font-size: 12px;
      font-style: italic;
      padding: 8px;
    }

    .input-area {
      padding: 12px;
      border-top: 1px solid var(--sa-border);
      background: var(--vscode-editor-background);
      display: flex;
      gap: 6px;
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      gap: 4px;
    }

    input[type="text"] {
      flex: 1;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--sa-border));
      border-radius: 3px;
      font-size: 13px;
      font-family: var(--vscode-font-family);
      outline: none;
    }

    input[type="text"]:focus {
      border-color: var(--vscode-focusBorder);
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    button {
      padding: 6px 12px;
      background: var(--sa-primary);
      color: var(--sa-onAccent);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-family: var(--vscode-font-family);
      white-space: nowrap;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button:active {
      opacity: 0.85;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toolbar {
      padding: 8px 12px;
      border-top: 1px solid var(--sa-border);
      background: var(--vscode-editor-background);
      display: flex;
      gap: 4px;
      font-size: 11px;
    }

    .toolbar button {
      padding: 3px 8px;
      font-size: 11px;
    }

    .error-message {
      color: var(--sa-danger);
      padding: 8px;
      background: rgba(255, 0, 0, 0.1);
      border-radius: 2px;
      margin: 4px;
    }

    code {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    /* Rich markdown (Claude-Code parity) */
    .md-body h1, .md-body h2, .md-body h3 {
      margin: 6px 0 4px;
      line-height: 1.3;
      color: var(--sa-primary);
    }
    .md-body h1 { font-size: 16px; }
    .md-body h2 { font-size: 14px; }
    .md-body h3 { font-size: 13px; }
    .md-body ul, .md-body ol { margin: 4px 0; padding-left: 20px; }
    .md-body li { margin: 2px 0; }
    .md-body a { color: var(--sa-primary); text-decoration: underline; }
    .md-body code {
      background: var(--vscode-editor-background);
      padding: 1px 4px;
      border-radius: 2px;
    }
    .code-block {
      background: var(--vscode-editor-background);
      border: 1px solid var(--sa-border);
      border-left: 3px solid var(--sa-primary);
      border-radius: 3px;
      padding: 8px 10px;
      margin: 6px 0;
      overflow-x: auto;
    }
    .code-block code { background: none; padding: 0; }

    /* Control-lane + model/cost badges */
    .badge {
      display: inline-block;
      padding: 1px 6px;
      margin-right: 4px;
      border-radius: 8px;
      font-size: 10px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--sa-border);
    }
    .badge.lane-claude { border-color: var(--sa-danger); color: var(--sa-danger); }
    .badge.lane-crew { border-color: var(--sa-primary); color: var(--sa-primary); }
    .badge.lane-shell { border-color: var(--sa-muted); color: var(--sa-muted); }

    /* Crew execution transparency */
    .exec-block {
      margin-top: 6px;
      font-size: 11px;
      border: 1px solid var(--sa-border);
      border-radius: 3px;
      background: var(--vscode-editor-background);
    }
    .exec-block > summary {
      cursor: pointer;
      padding: 4px 8px;
      color: var(--sa-primary);
      user-select: none;
    }
    .exec-block .exec-rows {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      padding: 4px 10px 8px;
      color: var(--sa-muted);
      font-family: var(--vscode-editor-font-family);
    }

    .scroller-spacer {
      height: 1px;
      align-self: flex-end;
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div id="thinkingIndicator" class="thinking" style="display: none;">
      Thinking…
    </div>
  </div>

  <div class="toolbar">
    <button onclick="clearChat()" title="Clear conversation history">🗑️ Clear</button>
    <button onclick="attachFile()" title="Attach a file to reference">📎 Attach</button>
    <button onclick="openSettings()" title="Open Story Agent settings">⚙️ Settings</button>
  </div>

  <div class="input-area">
    <div class="input-wrapper">
      <input
        type="text"
        id="messageInput"
        placeholder="Ask the crew… (Ctrl+Enter to send)"
        onkeydown="handleKeyDown(event)"
        autocomplete="off"
      />
      <button onclick="sendMessage()" id="sendBtn">Send</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const thinkingEl = document.getElementById('thinkingIndicator');

    let isSending = false;
    let streamingEl = null; // in-progress assistant bubble while chunks arrive

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // XSS-safe markdown: escape first, then render a Claude-Code-like subset.
    function renderMarkdown(raw) {
      const blocks = [];
      let text = String(raw).replace(/\`\`\`(\\w*)\\n?([\\s\\S]*?)\`\`\`/g, function (_, lang, code) {
        blocks.push('<pre class="code-block"><code>' + escapeHtml(code.replace(/\\n$/, '')) + '</code></pre>');
        return '@@CB' + (blocks.length - 1) + '@@';
      });
      text = escapeHtml(text);
      text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>')
                 .replace(/^## (.*)$/gm, '<h2>$1</h2>')
                 .replace(/^# (.*)$/gm, '<h1>$1</h1>');
      text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      text = text.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
      text = text.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)/g, '<a href="$2">$1</a>');
      text = text.replace(/(?:^[-*] .*(?:\\n|$))+/gm, function (m) {
        return '<ul>' + m.trim().split('\\n').map(function (l) { return '<li>' + l.replace(/^[-*] /, '') + '</li>'; }).join('') + '</ul>';
      });
      text = text.replace(/(?:^\\d+\\. .*(?:\\n|$))+/gm, function (m) {
        return '<ol>' + m.trim().split('\\n').map(function (l) { return '<li>' + l.replace(/^\\d+\\. /, '') + '</li>'; }).join('') + '</ol>';
      });
      text = text.replace(/\\n/g, '<br>');
      text = text.replace(/@@CB(\\d+)@@/g, function (_, i) { return blocks[+i]; });
      return text;
    }

    function laneBadge(metadata) {
      const ea = metadata.executionActivation;
      if (ea && ea.activated) return { cls: 'lane-claude', label: '🔴 agent' };
      if (metadata.crewSelfOrganization && metadata.crewSelfOrganization.enabled) return { cls: 'lane-crew', label: '🟡 crew' };
      return { cls: 'lane-shell', label: '🟢 direct' };
    }

    function renderMessage(role, content, metadata = {}) {
      const msgEl = document.createElement('div');
      msgEl.className = \`message \${role}\`;

      const body = document.createElement('div');
      body.className = 'md-body';
      body.innerHTML = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content);
      msgEl.appendChild(body);

      // Tool-call transparency: surface the agent-core execution when chat ran real work.
      const ea = metadata.executionActivation;
      if (ea && ea.activated) {
        const exec = document.createElement('details');
        exec.className = 'exec-block';
        const rows = [];
        if (ea.iterations !== undefined) rows.push('iterations: ' + escapeHtml(ea.iterations));
        if (ea.toolCalls !== undefined) rows.push('tool calls: ' + escapeHtml(ea.toolCalls));
        if (ea.missionId) rows.push('mission: ' + escapeHtml(ea.missionId));
        if (ea.escalated) rows.push('escalated');
        if (ea.stalled) rows.push('⚠ stalled');
        exec.innerHTML = '<summary>🖖 Crew execution</summary><div class="exec-rows">' + rows.map(function (r) { return '<span>' + r + '</span>'; }).join('') + '</div>';
        msgEl.appendChild(exec);
      }

      if (role === 'assistant' && (metadata.model || metadata.costUSD !== undefined)) {
        const metaEl = document.createElement('div');
        metaEl.className = 'message-meta';
        const lane = laneBadge(metadata);
        const parts = ['<span class="badge ' + lane.cls + '">' + lane.label + '</span>'];
        if (metadata.model) parts.push('<span class="badge">' + escapeHtml(metadata.model) + '</span>');
        if (metadata.costUSD !== undefined) parts.push('<span class="badge">$' + Number(metadata.costUSD).toFixed(5) + '</span>');
        metaEl.innerHTML = parts.join(' ');
        msgEl.appendChild(metaEl);
      }

      if (metadata.sources && metadata.sources.length > 0) {
        const sourcesEl = document.createElement('div');
        sourcesEl.className = 'sources';
        sourcesEl.innerHTML = '<strong>Sources:</strong> ' + metadata.sources.map(s => \`<code>\${s}</code>\`).join(', ');
        msgEl.appendChild(sourcesEl);
      }

      messagesEl.appendChild(msgEl);

      // Auto-scroll to bottom
      const spacer = document.createElement('div');
      spacer.className = 'scroller-spacer';
      spacer.id = 'scroller';
      messagesEl.appendChild(spacer);
      spacer.scrollIntoView();
    }

    function sendMessage() {
      const message = inputEl.value.trim();
      if (!message || isSending) return;

      isSending = true;
      sendBtn.disabled = true;
      inputEl.disabled = true;

      renderMessage('user', message);
      inputEl.value = '';

      vscode.postMessage({
        command: 'sendMessage',
        message,
      });
    }

    function handleKeyDown(evt) {
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'Enter') {
        evt.preventDefault();
        sendMessage();
      }
    }

    function attachFile() {
      vscode.postMessage({ command: 'attachFile' });
    }

    function clearChat() {
      if (confirm('Clear chat history?')) {
        messagesEl.innerHTML = '';
        vscode.postMessage({ command: 'clearHistory' });
      }
    }

    function openSettings() {
      vscode.postMessage({ command: 'openSettings' });
    }

    window.addEventListener('message', (evt) => {
      const msg = evt.data;
      switch (msg.command) {
        case 'chunkUpdate':
          // Live token streaming: create the in-progress bubble on first chunk, update thereafter.
          if (!streamingEl) {
            streamingEl = document.createElement('div');
            streamingEl.className = 'message assistant';
            const b = document.createElement('div');
            b.className = 'md-body';
            streamingEl.appendChild(b);
            messagesEl.appendChild(streamingEl);
            thinkingEl.style.display = 'none';
          }
          streamingEl.querySelector('.md-body').innerHTML = renderMarkdown(msg.content);
          streamingEl.scrollIntoView({ block: 'end' });
          break;

        case 'messageReceived':
          // Finalize: drop the streaming bubble and render the complete message with badges.
          if (streamingEl) { streamingEl.remove(); streamingEl = null; }
          renderMessage('assistant', msg.content, {
            model: msg.model,
            costUSD: msg.costUSD,
            sources: msg.sources,
            executionActivation: msg.executionActivation,
            crewSelfOrganization: msg.crewSelfOrganization,
            costAnalysis: msg.costAnalysis,
          });
          break;

        case 'thinkingStart':
          thinkingEl.style.display = 'block';
          break;

        case 'thinkingEnd':
          thinkingEl.style.display = 'none';
          isSending = false;
          sendBtn.disabled = false;
          inputEl.disabled = false;
          inputEl.focus();
          break;

        case 'error':
          if (streamingEl) { streamingEl.remove(); streamingEl = null; }
          const errEl = document.createElement('div');
          errEl.className = 'error-message';
          errEl.textContent = '❌ ' + msg.message;
          messagesEl.appendChild(errEl);
          isSending = false;
          sendBtn.disabled = false;
          inputEl.disabled = false;
          break;

        case 'fileAttached':
          renderMessage('assistant', \`📎 Attached: \${msg.path} (\${(msg.size / 1024).toFixed(1)}KB)\`);
          break;

        case 'historyCleared':
          inputEl.focus();
          break;
      }
    });

    // Focus input on load
    inputEl.focus();
  </script>
</body>
</html>
    `;
  }

  private dispose(): void {
    ChatPanel.instance = null;
  }
}
